import { Review } from '../models/Review.js';
import { Order } from '../models/Order.js';
import mongoose from 'mongoose';

async function userBoughtBook(userId, bookId) {
  const count = await Order.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    status: 'completed',
    'items.bookId': new mongoose.Types.ObjectId(bookId)
  });
  return count > 0;
}

export async function createOrUpdateReview(req, res) {
  const { bookId, rating, title, content, photos } = req.body;
  if (!await userBoughtBook(req.user._id, bookId)) {
    return res.status(403).json({ message: 'Chỉ người đã mua mới được đánh giá' });
  }
  const up = await Review.findOneAndUpdate(
    { userId: req.user._id, bookId },
    { $set: { rating, title, content, photos } },
    { new: true, upsert: true }
  );
  res.json(up);
}

export async function deleteMyReview(req, res) {
  const { bookId } = req.params;
  await Review.deleteOne({ userId: req.user._id, bookId });
  res.json({ ok: true });
}

export async function listBookReviews(req, res) {
  const { bookId } = req.params;
  const items = await Review.find({ bookId, isApproved: true }).sort({ createdAt: -1 }).lean();
  res.json(items);
}

export async function myReviewForBook(req, res) {
  const { bookId } = req.params;
  const rv = await Review.findOne({ userId: req.user._id, bookId }).lean();
  res.json(rv || null);
}
