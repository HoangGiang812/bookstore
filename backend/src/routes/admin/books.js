// backend/src/routes/admin/books.js
import { Router } from 'express';
import mongoose from 'mongoose';
import Book from '../../models/Book.js';
import Author from '../../models/Author.js';
import { slugify, randomISBN13, randomCode } from '../../utils/bookUtil.js';

const r = Router();
const norm = (s = '') => String(s).trim();
const esc = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---- Helpers: tìm/ tạo tác giả & cập nhật bookCount ----
async function findAuthorByNameCI(nameRaw) {
  const name = norm(nameRaw);
  if (!name) return null;
  return Author.findOne({ name: { $regex: `^${esc(name)}$`, $options: 'i' } });
}
async function getOrCreateAuthorByName(nameRaw) {
  const name = norm(nameRaw);
  if (!name) return null;
  const existed = await findAuthorByNameCI(name);
  if (existed) return existed;
  const doc = await Author.create({ name, slug: slugify(name) });
  return doc;
}
async function incBookCount(nameRaw, delta = 1) {
  const name = norm(nameRaw);
  if (!name || !delta) return;
  await Author.updateOne(
    { name: { $regex: `^${esc(name)}$`, $options: 'i' } },
    { $inc: { bookCount: delta } }
  );
}

// =========================
// GET /api/admin/books
// Hỗ trợ: q, authorName, authorId
// =========================
r.get('/books', async (req, res, next) => {
  try {
    const q = norm(req.query.q || '');
    const authorName = norm(req.query.authorName || '');
    const authorId = norm(req.query.authorId || '');

    const match = {};

    // Lọc theo authorId (ObjectId)
    if (authorId && mongoose.Types.ObjectId.isValid(authorId)) {
      const oid = new mongoose.Types.ObjectId(authorId);
      match.$or = [
        ...(match.$or || []),
        { authorIds: { $in: [oid] } },
        { authorId: oid },
        { 'authors.authorId': { $in: [oid] } },
      ];
    }

    // Lọc theo authorName (CI)
    if (authorName) {
      const nameInCsv = new RegExp(`(^|,\\s*)${esc(authorName)}(\\s*,|$)`, 'i');
      const nameOr = [
        { authorName: { $regex: `^${esc(authorName)}$`, $options: 'i' } },
        { author: { $regex: `^${esc(authorName)}$`, $options: 'i' } },
        { author: nameInCsv },         // "A, B, C"
        { authorNames: authorName },   // array of names
      ];
      match.$or = [...(match.$or || []), ...nameOr];
    }

    // Tìm kiếm tự do theo q
    if (q) {
      const rx = new RegExp(q, 'i');
      const qOr = [{ code: rx }, { title: rx }, { authorName: rx }];
      match.$or = [...(match.$or || []), ...qOr];
    }

    // Nếu chưa có điều kiện nào, dùng {} (tất cả)
    const criteria = match.$or ? { $or: match.$or } : {};

    const items = await Book.find(criteria).sort({ createdAt: -1 });
    res.json({ items });
  } catch (e) { next(e); }
});

// =========================
// GET /api/admin/books/:id
// =========================
r.get('/books/:id', async (req, res, next) => {
  try {
    const doc = await Book.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) { next(e); }
});

// =========================
// POST /api/admin/books
// Body: { title, authorName, price, discountPercent, stock, status, coverUrl }
// =========================
r.post('/books', async (req, res, next) => {
  try {
    const { title, authorName, price, discountPercent, stock, status, coverUrl } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ message: 'title is required' });

    const p = Math.max(0, Number(price || 0));
    const d = Math.max(0, Number(discountPercent || 0));
    const listPrice = d ? Math.round(p / (1 - d / 100)) : null;

    // Tạo/tìm tác giả nếu có nhập
    let authorDoc = null;
    if (authorName) authorDoc = await getOrCreateAuthorByName(authorName);

    const doc = await Book.create({
      code: randomCode(),
      title: title.trim(),
      authorName: authorDoc ? authorDoc.name : (authorName || ''),
      price: p,
      discountPercent: d,
      listPrice,
      stock: Number(stock || 0),
      status: status === 'out-of-stock' || Number(stock) <= 0 ? 'out-of-stock' : 'available',
      coverUrl: coverUrl || '',
      slug: slugify(title),
      isbn: randomISBN13(),
      ...(authorDoc ? { authorIds: [authorDoc._id] } : {}),
    });

    // Tăng bookCount
    if (authorDoc || authorName) {
      await incBookCount(authorDoc ? authorDoc.name : authorName, +1);
    }

    res.json(doc);
  } catch (e) { next(e); }
});

// =========================
// PATCH /api/admin/books/:id
// =========================
r.patch('/books/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const { title, authorName, price, discountPercent, stock, status, coverUrl } = req.body || {};

    const prev = await Book.findById(id);
    if (!prev) return res.status(404).json({ message: 'Not found' });

    const patch = {};

    // Title & slug
    if (title != null) {
      patch.title = norm(title);
      patch.slug = slugify(String(title));
    }

    // Giá & discount
    const p = price != null ? Math.max(0, Number(price)) : undefined;
    const d = discountPercent != null ? Math.max(0, Number(discountPercent)) : undefined;
    if (p != null) patch.price = p;
    if (d != null) {
      patch.discountPercent = d;
      const basePrice = p != null ? p : Number(prev.price || 0);
      patch.listPrice = d ? Math.round(basePrice / (1 - d / 100)) : null;
    }

    // Tồn kho & trạng thái
    if (stock != null) patch.stock = Math.max(0, Number(stock));
    if (status != null) patch.status = status === 'out-of-stock' ? 'out-of-stock' : 'available';
    if (coverUrl != null) patch.coverUrl = String(coverUrl);

    // Đổi tác giả: điều chỉnh bookCount nếu thay đổi thực sự
    if (authorName !== undefined) {
      const nextName = norm(authorName);
      const prevName = norm(prev.authorName);
      if (prevName.toLowerCase() !== nextName.toLowerCase()) {
        if (prevName) await incBookCount(prevName, -1);
        if (nextName) {
          const a = await getOrCreateAuthorByName(nextName);
          patch.authorName = a ? a.name : nextName;
          if (a?._id) patch.authorIds = [a._id];
          await incBookCount(nextName, +1);
        } else {
          patch.authorName = '';
          patch.authorIds = [];
        }
      }
    }

    const updated = await Book.findByIdAndUpdate(id, patch, { new: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (e) { next(e); }
});

// =========================
// DELETE /api/admin/books/:id
// =========================
r.delete('/books/:id', async (req, res, next) => {
  try {
    const doc = await Book.findById(req.params.id);
    if (!doc) return res.json({ ok: true });

    const aName = norm(doc.authorName);
    if (aName) await incBookCount(aName, -1);

    await Book.deleteOne({ _id: doc._id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
