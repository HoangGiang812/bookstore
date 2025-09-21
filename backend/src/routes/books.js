// backend/src/routes/books.js
import express from 'express';
import Book from '../models/Book.js';
import { listBooks } from '../services/repos/booksRepo.js';

const router = express.Router();

// Lấy danh sách
router.get('/', async (req, res, next) => {
  try {
    const group = String(req.query.group || '').toLowerCase();
    const limit = Math.min(200, Number(req.query.limit || 50));
    const start = Math.max(0, Number(req.query.start || 0));
    const rows = await listBooks({ group, limit, start });
    res.json(rows);
  } catch (e) { next(e); }
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
  } catch (e) { next(e); }
});

export default router;
