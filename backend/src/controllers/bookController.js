// backend/src/controllers/bookController.js
import mongoose from 'mongoose';
import { Book } from '../models/Book.js';
import { Category } from '../models/Category.js';
import { Author } from '../models/Author.js';
import { Publisher } from '../models/Publisher.js';
import { Banner } from '../models/Banner.js';
import { Page } from '../models/Page.js';
import { parsePaging } from '../utils/pagination.js';

const isObjectId = (v) => mongoose.isValidObjectId(String(v || ''));
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rxContains = (s) => new RegExp(escapeRegex(String(s).trim()), 'i');
const slugify = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, '-');

/**
 * Trả về mảng _id (ObjectId) của: chính danh mục + toàn bộ hậu duệ.
 * Hỗ trợ dữ liệu path là ObjectId[] hoặc string[].
 */
async function expandCategoryIds(categoryOrIdOrSlug) {
  if (!categoryOrIdOrSlug) return [];
  const query = isObjectId(categoryOrIdOrSlug)
    ? { _id: categoryOrIdOrSlug }
    : { slug: String(categoryOrIdOrSlug) };

  const cat = await Category.findOne(query).lean().catch(() => null);
  if (!cat) return [];

  const id = cat._id;
  const idStr = String(id);

  const cats = await Category.find({
    $or: [
      { _id: id },
      { path: id },   // path là ObjectId[]
      { path: idStr } // path là string[]
    ],
  })
    .hint({ path: 1 })
    .select('_id')
    .lean();

  return cats.map((c) => c._id);
}

export async function listBooks(req, res) {
  const {
    q,
    // ---- danh mục: nhận thêm nhiều alias để khớp FE ----
    category, categoryId, categorySlug, slug,
    // ----------------------------------------------------
    author, authorId,
    publisherId,
    priceMin, priceMax,
    year,
    ratingMin,
    sort,
  } = req.query;

  const { limit, skip } = parsePaging(req);

  // Xây filter theo AND các tiêu chí; mỗi tiêu chí có thể là OR nội bộ
  const andConds = [];

  // ===== Tìm theo từ khoá (partial) – mở rộng sang cả tên/slug tác giả =====
  if (q) {
    const rxQ = rxContains(q);
    const rxQSlug = rxContains(slugify(q));
    andConds.push({
      $or: [
        { title: rxQ },
        { description: rxQ },
        { author: rxQ },          // tên tác giả lưu dạng string
        { authors: rxQ },         // hoặc mảng tên tác giả
        { authorName: rxQ },      // dataset khác
        { authorSlug: rxQSlug },  // cho phép gõ 1 phần slug
      ],
    });
  }

  // ===== Danh mục: cha + con/cháu (ưu tiên mọi alias mà FE có thể gửi) =====
  const catParam = category ?? categorySlug ?? slug ?? categoryId;
  if (catParam) {
    const ids = await expandCategoryIds(catParam);    // ObjectId[]
    const idsStr = ids.map(String);                   // string[] để khớp dữ liệu cũ

    if (!ids.length) return res.json({ items: [], total: 0, pageSize: limit });

    andConds.push({
      $or: [
        { categoryIds: { $in: ids } },    // schema mới, đúng kiểu
        { categories:  { $in: ids } },    // schema cũ (ObjectId[])
        { categoryIds: { $in: idsStr } }, // dữ liệu lệch kiểu: string[]
        { categories:  { $in: idsStr } }, // dữ liệu lệch kiểu: string[]
      ],
    });
  }

  // ===== Tác giả: hỗ trợ ObjectId | slug | tên (partial), tránh CastError =====
  const authorParam = author ?? authorId;
  if (authorParam) {
    if (isObjectId(authorParam)) {
      // Nếu FE gửi authorId
      const orConds = [
        { authorIds: authorParam }, // đúng kiểu ObjectId[]
        // Phòng dữ liệu lệch kiểu (ít gặp nhưng safe):
        { authors: authorParam },
        { author: authorParam },
        { authorSlug: authorParam },
      ];

      // Lookup author để match thêm theo name/slug (partial) trên các field string
      const aDoc = await Author.findById(authorParam).lean().catch(() => null);
      if (aDoc) {
        const name = aDoc.name || aDoc.fullName || aDoc.displayName || '';
        const slug = aDoc.slug || '';
        if (slug) {
          const rxSlug = rxContains(slug);
          orConds.push({ authorSlug: rxSlug });
        }
        if (name) {
          const rxName = rxContains(name);
          orConds.push(
            { author: rxName },
            { authors: rxName },
            { authorName: rxName },
          );
        }
      }
      andConds.push({ $or: orConds });
    } else {
      // Chuỗi: có thể là slug hoặc tên; tất cả đều partial
      const s = String(authorParam).trim();
      const rxTxt  = rxContains(s);               // match 1 phần tên
      const rxSlug = rxContains(slugify(s));      // match 1 phần slug
      const spaced = s.replace(/[-_.]+/g, ' ');   // dale-carnegie -> dale carnegie
      const rxSpaced = rxContains(spaced);

      andConds.push({
        $or: [
          { authorSlug: rxSlug },   // 1 phần slug
          { author: rxTxt },        // 1 phần tên
          { authors: rxTxt },
          { authorName: rxTxt },
          { author: rxSpaced },     // hỗ trợ gạch nối <-> khoảng trắng
          { authors: rxSpaced },
        ],
      });
    }
  }

  if (publisherId) {
    andConds.push({ publisherId });
  }

  if (priceMin || priceMax) {
    const price = {};
    if (priceMin) price.$gte = Number(priceMin);
    if (priceMax) price.$lte = Number(priceMax);
    andConds.push({ price });
  }

  if (year) andConds.push({ publishYear: Number(year) });

  if (ratingMin) {
    const v = Number(ratingMin);
    andConds.push({ $or: [{ ratingAvg: { $gte: v } }, { rating: { $gte: v } }] });
  }

  const filter = andConds.length ? { $and: andConds } : {};

  let cursor = Book.find(filter).lean().skip(skip).limit(limit);
  if (sort === 'latest') cursor = cursor.sort({ createdAt: -1 });
  else if (sort === 'price_asc') cursor = cursor.sort({ price: 1 });
  else if (sort === 'price_desc') cursor = cursor.sort({ price: -1 });
  else if (sort === 'rating') cursor = cursor.sort({ ratingAvg: -1, rating: -1 });

  const [items, total] = await Promise.all([cursor, Book.countDocuments(filter)]);
  res.json({ items, total, pageSize: limit });
}

/**
 * Gợi ý cho ô tìm kiếm.
 * Trả unified list cho FE: { type: 'book'|'author', id, label }
 */
export async function suggestBooks(req, res) {
  const { q, limit = 10 } = req.query;
  if (!q || !String(q).trim()) return res.json([]);

  const rx = rxContains(q);
  const rxSlug = rxContains(slugify(q));
  const lim = Math.max(1, Math.min(20, Number(limit) || 10));

  // Lấy sách theo partial title và partial author text/slug
  const books = await Book.find({
    $or: [
      { title: rx },
      { author: rx },
      { authors: rx },
      { authorSlug: rxSlug },
    ],
  })
    .select('_id title')
    .limit(lim)
    .lean();

  // Lấy tác giả theo partial name/slug
  const authors = await Author.find({
    $or: [
      { name: rx },
      { fullName: rx },
      { displayName: rx },
      { slug: rxSlug },
    ],
  })
    .select('_id name fullName displayName slug')
    .limit(lim)
    .lean();

  const authorItems = authors.map(a => ({
    type: 'author',
    id: a._id,
    label: a.name || a.fullName || a.displayName || a.slug,
  }));

  const bookItems = books.map(b => ({
    type: 'book',
    id: b._id,
    label: b.title,
  }));

  // Ưu tiên tác giả rồi tới sách, cắt theo limit
  const items = [...authorItems, ...bookItems].slice(0, lim);
  res.json(items);
}

// Hỗ trợ :idOrSlug (ObjectId hoặc slug)
export async function getBook(req, res) {
  const idOrSlug = req.params.idOrSlug || req.params.id;
  let book = null;
  if (isObjectId(idOrSlug)) {
    book = await Book.findById(idOrSlug).lean();
  }
  if (!book) {
    book = await Book.findOne({ slug: idOrSlug }).lean();
  }
  if (!book) return res.status(404).json({ message: 'Not found' });
  res.json(book);
}

export async function relatedBooks(req, res) {
  const idOrSlug = req.params.idOrSlug || req.params.id;
  let cur = null;
  if (isObjectId(idOrSlug)) {
    cur = await Book.findById(idOrSlug).lean();
  }
  if (!cur) {
    cur = await Book.findOne({ slug: idOrSlug }).lean();
  }
  if (!cur) return res.status(404).json({ message: 'Not found' });

  const curCats = Array.isArray(cur.categoryIds) && cur.categoryIds.length
    ? cur.categoryIds
    : (cur.categories || []);

  const items = await Book.find({
    _id: { $ne: cur._id },
    $or: [
      { categoryIds: { $in: curCats } },
      { categories:  { $in: curCats } },
    ],
  })
    .limit(10)
    .lean();

  res.json(items);
}

/* ===== Public lists giữ nguyên ===== */
export async function listCategories(_req, res) {
  res.json(await Category.find({ active: true }).sort({ sort: 1, name: 1 }).lean());
}
export async function listAuthors(_req, res) {
  res.json(await Author.find({ active: true }).lean());
}
export async function listPublishers(_req, res) {
  res.json(await Publisher.find({ active: true }).lean());
}

export async function publicBanners(_req, res) {
  res.json(await Banner.find({ active: true }).sort({ sort: 1 }).lean());
}
export async function publicPage(req, res) {
  const page = await Page.findOne({ slug: req.params.slug, published: true }).lean();
  if (!page) return res.status(404).json({ message: 'Not found' });
  res.json(page);
}
