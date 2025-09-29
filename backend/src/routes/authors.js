// routes/authors.js
import { Router } from 'express';
import {
  listAuthors,
  getAuthorBySlug,
  getAuthorById,
  createAuthor,
  updateAuthor,
  deleteAuthor,
} from '../services/repos/authorsRepo.js';

const router = Router();

// TODO: thay bằng auth thực tế của bạn
function requireAdmin(req, res, next) { return next(); }

// ✅ Chuẩn hoá body từ FE: avatar -> avatarUrl + trim
function normalizeAuthorPayload(body = {}) {
  const out = { ...body };

  if (out.avatarUrl == null && typeof out.avatar === 'string') {
    out.avatarUrl = out.avatar;
  }
  delete out.avatar;

  if (typeof out.name === 'string') out.name = out.name.trim();
  if (typeof out.avatarUrl === 'string') out.avatarUrl = out.avatarUrl.trim();
  if (typeof out.bio === 'string') out.bio = out.bio.trim();
  if (typeof out.website === 'string') out.website = out.website.trim();
  if (typeof out.slug === 'string') out.slug = out.slug.trim();
  return out;
}

// GET /api/authors
router.get('/', async (req, res, next) => {
  try {
    const { limit = 50, start = 0, q = '' } = req.query;
    const authors = await listAuthors({
      limit: Number(limit) || 50,
      start: Number(start) || 0,
      q: String(q || ''),
    });
    res.json(authors);
  } catch (e) { next(e); }
});

// GET /api/authors/id/:id
router.get('/id/:id', async (req, res, next) => {
  try {
    const author = await getAuthorById(req.params.id);
    if (!author) return res.status(404).json({ message: 'Author not found' });
    res.json(author);
  } catch (e) { next(e); }
});

// GET /api/authors/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const author = await getAuthorBySlug(req.params.slug);
    if (!author) return res.status(404).json({ message: 'Author not found' });
    res.json(author);
  } catch (e) { next(e); }
});

// POST /api/authors (create or upsert-by-name)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const payload = normalizeAuthorPayload(req.body || {});
    const created = await createAuthor(payload);
    const status = created && created._existed ? 200 : 201; // 200 nếu trùng tên & đã cập nhật
    res.status(status).json(created);
  } catch (e) { next(e); }
});

// PATCH /api/authors/:idOrSlug
router.patch('/:idOrSlug', requireAdmin, async (req, res, next) => {
  try {
    const payload = normalizeAuthorPayload(req.body || {});
    const updated = await updateAuthor(req.params.idOrSlug, payload);
    res.json(updated);
  } catch (e) { next(e); }
});

// DELETE /api/authors/:idOrSlug
router.delete('/:idOrSlug', requireAdmin, async (req, res, next) => {
  try {
    const ok = await deleteAuthor(req.params.idOrSlug);
    res.json(ok);
  } catch (e) {
    if (e?.code === 'AUTHOR_HAS_BOOKS') {
      return res.status(400).json({ message: e.message, code: e.code });
    }
    next(e);
  }
});

export default router;
