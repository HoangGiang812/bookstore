// backend/src/routes/author.routes.js
import express from 'express';
import mongoose from 'mongoose';
import { listAuthors, getAuthorById } from '../services/repos/authorsRepo.js';

const router = express.Router();

// GET /api/authors
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(200, Number(req.query.limit) || 50);
    const start = Math.max(0, Number(req.query.start) || 0);
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const rows = await listAuthors({ limit, start, q });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/authors/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid author id' });
    }

    const author = await getAuthorById(id);
    if (!author) return res.status(404).json({ message: 'Author not found' });

    res.json(author);
  } catch (err) {
    next(err);
  }
});

export default router;
