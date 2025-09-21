import express from 'express';
import { listAuthors } from '../services/repos/authorsRepo.js';

const router = express.Router();

/**
 * GET /api/authors?limit=50&start=0
 */
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(200, Number(req.query.limit || 50));
    const start = Math.max(0, Number(req.query.start || 0));
    const rows = await listAuthors({ limit, start });
    res.json(rows);
  } catch (e) { next(e); }
});

export default router;
