// backend/src/controllers/reviewController.js
import mongoose from 'mongoose';
import { Review } from '../models/Review.js';
import { Order } from '../models/Order.js';
import { Book } from '../models/Book.js';

const toOid = (x) => new mongoose.Types.ObjectId(String(x));

/** Kiểm tra user đã mua & đơn đã hoàn thành cuốn sách này chưa. */
async function purchasedDelivered(userId, bookId) {
  const o = await Order.findOne({
    userId: toOid(userId),
    status: { $in: ['completed', 'delivered'] },
    'items.bookId': toOid(bookId),
  })
    .select({ items: 1 })
    .lean();

  if (!o) return { ok: false, orderItemId: null };
  const found = (o.items || []).find((it) => String(it.bookId) === String(bookId));
  return { ok: !!found, orderItemId: found?._id || null };
}

/** Tính lại ratingAvg / ratingCnt cho sách */
async function recomputeBookRating(bookId) {
  const aggr = await Review.aggregate([
    { $match: { bookId: toOid(bookId), isApproved: true } },
    { $group: { _id: '$bookId', cnt: { $sum: 1 }, avg: { $avg: '$rating' } } },
  ]);

  const cnt = aggr[0]?.cnt || 0;
  const avg = aggr[0]?.avg ? Math.round(aggr[0].avg * 10) / 10 : 0;

  await Book.updateOne({ _id: toOid(bookId) }, { $set: { ratingCnt: cnt, ratingAvg: avg } });
  return { cnt, avg };
}

/** Tạo / cập nhật review của chính user cho 1 sách */
export async function createOrUpdateReview(req, res) {
  try {
    const { bookId } = req.params;
    const { rating, title, content, photos } = req.body || {};

    if (!(Number(rating) >= 1 && Number(rating) <= 5)) {
      return res.status(400).json({ message: 'rating_invalid' });
    }

    const chk = await purchasedDelivered(req.user._id, bookId);
    if (!chk.ok) {
      return res.status(403).json({ message: 'Chỉ người đã mua & nhận hàng mới được đánh giá' });
    }

    const doc = await Review.findOneAndUpdate(
      { userId: req.user._id, bookId: toOid(bookId) },
      {
        $set: {
          rating: Number(rating),
          title: title || '',
          content: content || '',
          photos: Array.isArray(photos) ? photos : [],
          verifiedPurchase: true,
          orderItemId: chk.orderItemId || undefined,
          isApproved: true,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const summary = await recomputeBookRating(bookId);
    return res.json({ review: doc, summary });
  } catch (e) {
    console.error('createOrUpdateReview', e);
    return res.status(500).json({ message: 'review_failed' });
  }
}

/** Xoá review của chính user */
export async function deleteMyReview(req, res) {
  try {
    const { bookId } = req.params;
    const doc = await Review.findOneAndDelete({ userId: req.user._id, bookId: toOid(bookId) });
    await recomputeBookRating(bookId);
    return res.json({ ok: true, removed: !!doc });
  } catch (e) {
    console.error('deleteMyReview', e);
    return res.status(500).json({ message: 'delete_review_failed' });
  }
}

/** Danh sách review public của 1 sách */
export async function listBookReviews(req, res) {
  try {
    const { bookId } = req.params;
    const limit = Math.min(Number(req.query.limit || 10), 50);
    const skip = Math.max(Number(req.query.skip || 0), 0);

    const [items, total] = await Promise.all([
      Review.find({ bookId: toOid(bookId), isApproved: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email avatar avatarUrl')
        .lean(),
      Review.countDocuments({ bookId: toOid(bookId), isApproved: true }),
    ]);

    return res.json({ items, total, limit, skip });
  } catch (e) {
    console.error('listBookReviews', e);
    return res.status(500).json({ message: 'list_reviews_failed' });
  }
}

/** Review của chính user cho 1 sách */
export async function myReviewForBook(req, res) {
  try {
    const { bookId } = req.params;
    const rv = await Review.findOne({ userId: req.user._id, bookId: toOid(bookId) }).lean();
    return res.json(rv || null);
  } catch (e) {
    console.error('myReviewForBook', e);
    return res.status(500).json({ message: 'get_my_review_failed' });
  }
}

/** Tóm tắt điểm TB & số lượng */
export async function ratingSummary(req, res) {
  try {
    const { bookId } = req.params;
    const b = await Book.findById(bookId).select('ratingAvg ratingCnt').lean();
    return res.json({ avg: b?.ratingAvg || 0, cnt: b?.ratingCnt || 0 });
  } catch (e) {
    console.error('ratingSummary', e);
    return res.status(500).json({ message: 'rating_summary_failed' });
  }
}

/** Kiểm tra đủ điều kiện review */
export async function canReview(req, res) {
  try {
    const { bookId } = req.params;
    const chk = await purchasedDelivered(req.user._id, bookId);
    return res.json({ ok: chk.ok });
  } catch (e) {
    console.error('canReview', e);
    return res.status(500).json({ message: 'can_review_failed' });
  }
}

/* ==== ALIASES để router có thể import theo tên khác (không cần sửa FE/Router) ==== */
export const getBookRatingSummary   = ratingSummary;
export const listBookReviewsPublic  = listBookReviews;
export const canReviewBook          = canReview;
export const upsertReviewForBook    = createOrUpdateReview;
export const deleteMyReviewForBook  = deleteMyReview;
