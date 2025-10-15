// backend/src/routes/books.js
import { Router } from 'express';
import { listBooks, suggestBooks, getBook, relatedBooks } from '../controllers/bookController.js';

const router = Router();

// GET /api/books?category=<slug|id>&q=&limit=&page|start=&sort=latest|price_asc|price_desc|rating
router.get('/', listBooks);

// GET /api/books/suggest?q=
router.get('/suggest', suggestBooks);

// GET /api/books/:idOrSlug   (hỗ trợ cả ObjectId lẫn slug)
router.get('/:idOrSlug', getBook);

// GET /api/books/:idOrSlug/related
router.get('/:idOrSlug/related', relatedBooks);

export default router;
