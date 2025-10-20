// backend/src/routes/books.js
import { Router } from 'express';
import { listBooks, suggestBooks, getBook, relatedBooks } from '../controllers/bookController.js';
import {
  getBookRatingSummary,
  listBookReviewsPublic,
  canReviewBook,
  myReviewForBook,
  upsertReviewForBook,
  deleteMyReviewForBook,
} from '../controllers/reviewController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// Sách
router.get('/', listBooks);
router.get('/suggest', suggestBooks);
router.get('/:idOrSlug', getBook);
router.get('/:idOrSlug/related', relatedBooks);

// Reviews & Ratings
router.get('/:bookId/ratings', getBookRatingSummary);                 // GET summary
router.get('/:bookId/reviews', listBookReviewsPublic);                 // GET public reviews
router.get('/:bookId/reviews/can', requireAuth, canReviewBook);        // GET can review?
router.get('/:bookId/reviews/mine', requireAuth, myReviewForBook);     // GET my review
router.post('/:bookId/reviews', requireAuth, upsertReviewForBook);     // POST/PUT my review
router.delete('/:bookId/reviews', requireAuth, deleteMyReviewForBook); // DELETE my review

export default router;
