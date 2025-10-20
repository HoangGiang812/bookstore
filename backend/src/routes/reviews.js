// backend/src/routes/reviews.js
import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import {
  createOrUpdateReview,
  deleteMyReview,
  listBookReviews,
  myReviewForBook,
  ratingSummary,
  canReview,
} from '../controllers/reviewController.js';

const r = Router();

// PUBLIC: danh sách review & tóm tắt rating
r.get('/api/books/:bookId/reviews', listBookReviews);
r.get('/api/books/:bookId/ratings', ratingSummary);

// AUTH: CRUD review của chính user + kiểm tra điều kiện
r.get('/api/books/:bookId/reviews/mine', requireAuth, myReviewForBook);
r.get('/api/books/:bookId/reviews/can', requireAuth, canReview);
r.post('/api/books/:bookId/reviews', requireAuth, createOrUpdateReview);
r.delete('/api/books/:bookId/reviews', requireAuth, deleteMyReview);

export default r;
