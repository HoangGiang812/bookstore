import { Router } from 'express';
import Book from '../../models/Book.js';
import { slugify, randomISBN13, randomCode } from '../../utils/bookUtil.js';

const r = Router();

// GET /api/admin/books?q=...
r.get('/books', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const match = q
      ? { $or: [
          { code: new RegExp(q, 'i') },
          { title: new RegExp(q, 'i') },
          { authorName: new RegExp(q, 'i') },
        ] }
      : {};
    const items = await Book.find(match).sort({ createdAt: -1 });
    res.json({ items });
  } catch (e) { next(e); }
});

// GET /api/admin/books/:id
r.get('/books/:id', async (req, res, next) => {
  try {
    const doc = await Book.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) { next(e); }
});

// POST /api/admin/books
// Body: { title, authorName, price, discountPercent, stock, status, coverUrl }
r.post('/books', async (req, res, next) => {
  try {
    const { title, authorName, price, discountPercent, stock, status, coverUrl } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ message: 'title is required' });

    const p = Math.max(0, Number(price || 0));
    const d = Math.max(0, Number(discountPercent || 0));   // ép không âm
    const listPrice = d ? Math.round(p / (1 - d / 100)) : null;

    const doc = await Book.create({
      code: randomCode(),
      title: title.trim(),
      authorName: authorName || '',
      price: p,
      discountPercent: d,
      listPrice,
      stock: Number(stock || 0),
      status: status === 'out-of-stock' || Number(stock) <= 0 ? 'out-of-stock' : 'available',
      coverUrl: coverUrl || '',
      slug: slugify(title),
      isbn: randomISBN13(),
    });

    res.json(doc);
  } catch (e) { next(e); }
});

// PATCH /api/admin/books/:id
r.patch('/books/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const { title, authorName, price, discountPercent, stock, status, coverUrl } = req.body || {};

    const p = price != null ? Math.max(0, Number(price)) : undefined;
    const d = discountPercent != null ? Math.max(0, Number(discountPercent)) : undefined;

    const patch = {};
    if (title != null) { patch.title = String(title).trim(); patch.slug = slugify(String(title)); }
    if (authorName != null) patch.authorName = String(authorName);
    if (p != null) patch.price = p;
    if (d != null) {
      patch.discountPercent = d;
      if (p != null) patch.listPrice = d ? Math.round(p / (1 - d / 100)) : null;
    }
    if (stock != null) patch.stock = Number(stock);
    if (status != null) patch.status = status === 'out-of-stock' ? 'out-of-stock' : 'available';
    if (coverUrl != null) patch.coverUrl = String(coverUrl);

    const updated = await Book.findByIdAndUpdate(id, patch, { new: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (e) { next(e); }
});

// DELETE /api/admin/books/:id
r.delete('/books/:id', async (req, res, next) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
