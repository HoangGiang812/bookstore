// backend/src/routes/books.js
import express from 'express';
import Book from '../models/Book.js';
import Author from '../models/Author.js';
import { listBooks } from '../services/repos/booksRepo.js';

const router = express.Router();

function escapeRegex(s = '') {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Lấy danh sách
router.get('/', async (req, res, next) => {
  try {
    const group = String(req.query.group || '').toLowerCase();
    const limit = Math.min(200, Number(req.query.limit || 50));
    const start = Math.max(0, Number(req.query.start || 0));
    const q = String(req.query.q || '');
    const authorSlug = req.query.authorSlug ? String(req.query.authorSlug) : '';

    // Nếu có authorSlug thì lọc trực tiếp theo tác giả
    if (authorSlug) {
      const author = await Author.findOne({ slug: authorSlug }).lean();
      if (!author) return res.json([]); // FE xử lý được mảng trống

      const aid = author._id;
      const slug = author.slug;
      const name = author.name;

      // match name trong chuỗi "A, B, C" (không phân biệt hoa/thường)
      const nameInCsv = new RegExp(
        `(^|,\\s*)${escapeRegex(name)}(\\s*,|$)`,
        'i'
      );

      const baseOr = [
        // Theo ObjectId
        { authorIds: { $in: [aid] } },
        { authorId: aid },
        { 'authors.authorId': { $in: [aid] } },

        // Theo slug
        { authorSlug: slug },
        { authorSlugs: slug },
        { 'authors.slug': slug },

        // Theo name (fallback)
        { author: name },            // trùng chính xác
        { author: nameInCsv },       // nằm trong chuỗi "A, B, C"
        { authorNames: name },       // mảng tên
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

      const items = await Book.find(criteria)
        .skip(start)
        .limit(limit)
        .lean();

      return res.json(
        items.map((b) => ({
          id: b._id.toString(),
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
        }))
      );
    }

    // Không có authorSlug -> dùng flow cũ
    const rows = await listBooks({ group, limit, start, q });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// 🔥 Lấy chi tiết 1 sách theo id
router.get('/:id', async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id).lean();
    if (!book) return res.status(404).json({ message: 'Book not found' });

    res.json({
      id: book._id.toString(),
      title: book.title,
      author: book.author ?? book.authorName ?? null,
      authorNames: Array.isArray(book.authorNames)
        ? book.authorNames
        : (typeof book.author === 'string'
            ? book.author.split(',').map(s => s.trim()).filter(Boolean)
            : []),
      image: book.image ?? book.coverUrl ?? null,
      coverUrl: book.coverUrl,
      description: book.description ?? '',
      price: book.price,
      originalPrice: book.originalPrice,
      discountPercent: book.discountPercent,
      rating: book.rating,
      soldCount: book.soldCount,
      publishYear: book.publishYear,
      createdAt: book.createdAt,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
