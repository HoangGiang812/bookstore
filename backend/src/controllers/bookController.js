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
    // deep/includeDescendants/recursive có thể được FE gửi, mặc định ta vẫn bao gồm hậu duệ
  } = req.query;

  const { limit, skip } = parsePaging(req);

  // Xây filter theo AND các tiêu chí; mỗi tiêu chí có thể là OR nội bộ
  const andConds = [];

  // Tìm theo từ khoá (regex an toàn)
  if (q) {
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    andConds.push({
      $or: [{ title: rx }, { description: rx }],
    });
  }

  // Danh mục: cha + con/cháu (ưu tiên mọi alias mà FE có thể gửi)
  const catParam = category ?? categorySlug ?? slug ?? categoryId;
  if (catParam) {
    const ids = await expandCategoryIds(catParam);    // ObjectId[]
    const idsStr = ids.map(String);                   // string[] để khớp dữ liệu cũ

    if (!ids.length) {
      return res.json({ items: [], total: 0, pageSize: limit });
    }
    andConds.push({
      $or: [
        { categoryIds: { $in: ids } },   // schema mới, đúng kiểu
        { categories:  { $in: ids } },   // schema cũ (nếu là ObjectId)
        { categoryIds: { $in: idsStr } },// dữ liệu lệch kiểu: string[]
        { categories:  { $in: idsStr } },// dữ liệu lệch kiểu: string[]
      ],
    });
  }

  // Tác giả (tuỳ schema của bạn)
  const authorParam = author ?? authorId;
  if (authorParam) {
    andConds.push({
      $or: [
        { authorIds: authorParam },
        { authors: authorParam },
        { author: authorParam },
        { authorSlug: authorParam },
      ],
    });
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
    andConds.push({
      $or: [{ ratingAvg: { $gte: v } }, { rating: { $gte: v } }],
    });
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

export async function suggestBooks(req, res) {
  const { q } = req.query;
  const items = await Book.find(q ? { title: new RegExp(q, 'i') } : {})
    .select('title slug')
    .limit(10)
    .lean();
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
