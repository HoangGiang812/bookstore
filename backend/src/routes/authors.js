import { Router } from 'express';
import { listAuthors, getAuthorBySlug, getAuthorById } from '../services/repos/authorsRepo.js';

const router = Router();

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
  } catch (e) {
    next(e);
  }
});

// GET /api/authors/:slug  (ưu tiên slug)
router.get('/:slug', async (req, res, next) => {
  try {
    const author = await getAuthorBySlug(req.params.slug);
    if (!author) return res.status(404).json({ message: 'Author not found' });
    res.json(author);
  } catch (e) {
    next(e);
  }
});

// (Tuỳ chọn) GET /api/authors/id/:id  để redirect từ link cũ
router.get('/id/:id', async (req, res, next) => {
  try {
    const author = await getAuthorById(req.params.id);
    if (!author) return res.status(404).json({ message: 'Author not found' });
    res.json(author);
  } catch (e) {
    next(e);
  }
});

export default router;
