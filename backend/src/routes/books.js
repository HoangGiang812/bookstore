// backend/src/routes/books.js
import express from 'express';
import Book from '../models/Book.js';
import Author from '../models/Author.js';
import { listBooks } from '../services/repos/booksRepo.js';

const router = express.Router();
const esc = (s='') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function mapBook(b) {
  return {
    id: b._id?.toString?.() || String(b.id || b._id),
    title: b.title,
    author: b.author ?? b.authorName ?? null,
    authorNames: Array.isArray(b.authorNames)
      ? b.authorNames
      : (typeof b.author === 'string'
          ? b.author.split(',').map(s => s.trim()).filter(Boolean)
          : []),
    image: b.image ?? b.coverUrl ?? null,
    coverUrl: b.coverUrl ?? null,
    description: b.description ?? '',
    price: b.price,
    originalPrice: b.originalPrice,
    discountPercent: b.discountPercent,
    rating: b.rating,
    soldCount: b.soldCount,
    publishYear: b.publishYear,
    createdAt: b.createdAt,
  };
}

// GET /api/books?authorName=&authorSlug=&q=&limit=&start=
router.get('/', async (req, res, next) => {
  try {
    const group = String(req.query.group || '').toLowerCase();
    const limit = Math.min(200, Number(req.query.limit || 50));
    const start = Math.max(0, Number(req.query.start || 0));
    const q = String(req.query.q || '').trim();
    const authorSlug = String(req.query.authorSlug || '').trim();
    const authorNameRaw = String(req.query.authorName || '').trim();

    // --- 1) Lọc theo authorSlug (nếu có) ---
    if (authorSlug) {
      const author = await Author.findOne({ slug: authorSlug }).lean();
      if (!author) return res.json({ items: [] });

      const aid = author._id;
      const slug = author.slug;
      const name = author.name;

      const nameInCsv = new RegExp(`(^|,\\s*)${esc(name)}(\\s*,|$)`, 'i');

      const baseOr = [
        { authorIds: { $in: [aid] } },
        { authorId: aid },
        { 'authors.authorId': { $in: [aid] } },
        { authorSlug: slug },
        { authorSlugs: slug },
        { 'authors.slug': slug },
        { author: name },
        { author: nameInCsv },
        { authorNames: name },
        { authorName: { $regex: `^${esc(name)}$`, $options: 'i' } }, // thêm cho chắc
      ];

      const criteria = q
        ? {
            $and: [
              { $or: baseOr },
              {
                $or: [
                  { title: { $regex: q, $options: 'i' } },
                  { description: { $regex: q, $options: 'i' } },
                ],
              },
            ],
          }
        : { $or: baseOr };

      const items = await Book.find(criteria).skip(start).limit(limit).lean();
      return res.json({ items: items.map(mapBook) });
    }

    // --- 2) Lọc theo authorName (case-insensitive) ---
    if (authorNameRaw) {
      const name = authorNameRaw;
      const nameInCsv = new RegExp(`(^|,\\s*)${esc(name)}(\\s*,|$)`, 'i');

      const criteria = {
        $and: [
          {
            $or: [
              { authorName: { $regex: `^${esc(name)}$`, $options: 'i' } }, // chuẩn
              { author: { $regex: `^${esc(name)}$`, $options: 'i' } },     // alias
              { author: nameInCsv },                                       // "A, B, C"
              { authorNames: name },                                       // mảng tên
            ],
          },
          q
            ? {
                $or: [
                  { title: { $regex: q, $options: 'i' } },
                  { description: { $regex: q, $options: 'i' } },
                ],
              }
            : {},
        ].filter(Boolean),
      };

      const items = await Book.find(criteria).skip(start).limit(limit).lean();
      return res.json({ items: items.map(mapBook) });
    }

    // --- 3) Không có authorSlug/authorName -> flow cũ ---
    const rows = await listBooks({ group, limit, start, q });
    // đảm bảo trả về { items: [...] } để FE thống nhất
    const items = Array.isArray(rows?.items) ? rows.items : Array.isArray(rows) ? rows : [];
    return res.json({ items: items.map(mapBook) });
  } catch (e) {
    next(e);
  }
});

// GET /api/books/:id
router.get('/:id', async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id).lean();
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json(mapBook(book));
  } catch (e) { next(e); }
});

export default router;
