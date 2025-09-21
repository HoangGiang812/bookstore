import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { createOrUpdateReview, deleteMyReview, listBookReviews, myReviewForBook } from '../controllers/reviewController.js';

const r = Router();
r.get('/book/:bookId', listBookReviews);
r.get('/book/:bookId/mine', requireAuth, myReviewForBook);
r.post('/', requireAuth, createOrUpdateReview);
r.delete('/:bookId', requireAuth, deleteMyReview);
export default r;
