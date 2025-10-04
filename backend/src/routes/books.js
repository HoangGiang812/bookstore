// backend/src/routes/books.js
import express from 'express';
import Book from '../models/Book.js';
import Author from '../models/Author.js';
import { listBooks } from '../services/repos/booksRepo.js';
import { Category } from '../models/Category.js';

const router = express.Router();
const esc = (s='') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function mapBook(b) {
  return {
    id: b._id?.toString?.() || String(b.id || b._id),
    slug: b.slug, // Thêm dòng này
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
    const { q, authorName, authorSlug, limit = 50, start = 0, categorySlug, category } = req.query;
    const criteria = {};

    // Lọc theo slug danh mục
    const catSlug = categorySlug || category;
    if (catSlug) {
      const cat = await Category.findOne({ slug: catSlug }).lean();
      if (!cat) return res.json({ items: [] });
      criteria.categoryIds = { $in: [cat._id] };
    }

    // Lọc theo tác giả (nếu có)
    if (authorName) criteria.author = authorName;
    if (authorSlug) criteria.authorSlug = authorSlug;

    // Lọc theo từ khoá (nếu có)
    if (q) {
      criteria.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    const items = await Book.find(criteria).skip(Number(start)).limit(Number(limit)).lean();
    res.json({ items: items.map(mapBook) });
  } catch (err) {
    next(err);
  }
});

// GET /api/books/:id
router.get('/:idOrSlug', async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    let book = null;
    if (/^[0-9a-fA-F]{24}$/.test(idOrSlug)) {
      book = await Book.findById(idOrSlug).lean();
    }
    if (!book) {
      book = await Book.findOne({ slug: idOrSlug }).lean();
    }
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json(mapBook(book));
  } catch (e) { next(e); }
});

export default router;
