// backend/src/controllers/admin/bookAdminController.js
import { Book } from '../../models/Book.js';
import { upload as multerUpload } from './bookImportController.js'; // Dùng Multer sẵn có để nhận file

/* ---------- helpers ---------- */
const toNumber = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const withVirtuals = (doc) => (doc?.toJSON ? doc.toJSON() : doc);

/* ---------- LIST ---------- */
export const listBooks = async (req, res) => {
  const q = (req.query.q || '').trim();
  const cond = q
    ? {
        $or: [
          { title: new RegExp(q, 'i') },
          { author: new RegExp(q, 'i') },
          { authorName: new RegExp(q, 'i') },
        ],
      }
    : {};

  const items = await Book.find(cond)
    .sort({ createdAt: -1 })
    .limit(500)
    .lean({ virtuals: true });

  res.json({ items });
};

/* ---------- GET ONE ---------- */
export const getBook = async (req, res) => {
  const { id } = req.params;
  const doc = await Book.findById(id).lean({ virtuals: true });
  if (!doc) return res.status(404).json({ message: 'book_not_found' });
  res.json(doc);
};

/* ---------- CREATE ---------- */
export const createBook = async (req, res) => {
  const body = { ...req.body };

  body.price = clamp(toNumber(body.price, 0), 0, Number.MAX_SAFE_INTEGER);
  body.discountPercent = clamp(toNumber(body.discountPercent, 0), 0, 100);
  body.stock = clamp(toNumber(body.stock, 0), 0, Number.MAX_SAFE_INTEGER);

  if (!body.status) {
    body.status = body.stock > 0 ? 'available' : 'out-of-stock';
  } else if (body.status !== 'available' && body.status !== 'out-of-stock') {
    body.status = body.stock > 0 ? 'available' : 'out-of-stock';
  }

  const created = await Book.create(body);
  res.status(201).json(withVirtuals(created)); // include salePrice nếu schema có virtual
};

/* ---------- UPDATE ---------- */
export const updateBook = async (req, res) => {
  const { id } = req.params;
  const patch = { ...req.body };

  if (patch.price !== undefined) {
    patch.price = clamp(toNumber(patch.price, 0), 0, Number.MAX_SAFE_INTEGER);
  }
  if (patch.discountPercent !== undefined) {
    patch.discountPercent = clamp(toNumber(patch.discountPercent, 0), 0, 100);
  }
  if (patch.stock !== undefined) {
    patch.stock = clamp(toNumber(patch.stock, 0), 0, Number.MAX_SAFE_INTEGER);
    if (patch.status === undefined) {
      patch.status = patch.stock > 0 ? 'available' : 'out-of-stock';
    }
  }
  if (patch.status !== undefined) {
    patch.status = patch.status === 'available' ? 'available' : 'out-of-stock';
  }

  const updated = await Book.findByIdAndUpdate(id, patch, { new: true });
  if (!updated) return res.status(404).json({ message: 'book_not_found' });
  res.json(withVirtuals(updated));
};

/* ---------- DELETE ---------- */
export const removeBook = async (req, res) => {
  const { id } = req.params;
  await Book.findByIdAndDelete(id);
  res.json({ ok: true });
};

/* ---------- OPTIONAL: Nhập kho chuyên dụng ---------- */
export const intake = async (req, res) => {
  const { id } = req.params;
  const qty = clamp(
    toNumber(req.body?.qty, 0),
    -Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER
  );

  const b = await Book.findById(id);
  if (!b) return res.status(404).json({ message: 'book_not_found' });

  const next = clamp(toNumber(b.stock, 0) + qty, 0, Number.MAX_SAFE_INTEGER);
  b.stock = next;
  b.status = next > 0 ? 'available' : 'out-of-stock';
  await b.save();

  res.json(withVirtuals(b));
};

/* ---------- UPLOAD COVER (NEW) ---------- */
// Gọi ở router: r.post('/books/upload-cover', ...guard, adminAudit, ...uploadCover)
export const uploadCover = [
  multerUpload.single('file'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'file_required' });
    // Ở production: upload S3/Cloudinary và trả về secure URL
    // Tạm thời: phục vụ tĩnh qua /uploads
    const url = `/uploads/${req.file.filename}`;
    return res.json({ url });
  },
];
