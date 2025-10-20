import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * Review của 1 user cho 1 sách.
 * - Mỗi (userId, bookId) chỉ có 1 review -> unique index.
 * - verifiedPurchase: tự set true nếu review gắn với đơn đã giao/hoàn thành.
 * - Sau khi save/update/delete sẽ tự tổng hợp lại ratingAvg, ratingCnt vào Book.
 */
const ReviewSchema = new Schema(
  {
    userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bookId:   { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },

    rating:   { type: Number, min: 1, max: 5, required: true },
    title:    { type: String, default: '' },          // tiêu đề ngắn
    content:  { type: String, default: '' },          // nội dung/nhận xét
    photos:   [{ type: String }],                     // URL ảnh đính kèm (nếu có)

    // Các field theo JSON mẫu
    isApproved:        { type: Boolean, default: true },  // có thể dùng duyệt thủ công sau này
    verifiedPurchase:  { type: Boolean, default: false }, // đã mua hàng thật
    orderItemId:       { type: Schema.Types.ObjectId, ref: 'Order.items' }, // item trong đơn (nếu xác thực)
  },
  { timestamps: true, collection: 'reviews' }
);

// 1 user chỉ review 1 lần cho 1 sách (cập nhật thì dùng upsert)
ReviewSchema.index({ userId: 1, bookId: 1 }, { unique: true });
// Tối ưu truy vấn list theo sách
ReviewSchema.index({ bookId: 1, createdAt: -1 });

/* ----------------- Helpers ----------------- */
async function recomputeBookRating(bookId) {
  if (!bookId) return;
  const oid = new mongoose.Types.ObjectId(String(bookId));

  const agg = await mongoose.model('Review').aggregate([
    { $match: { bookId: oid, isApproved: true } },    // chỉ tính review đã duyệt
    { $group: { _id: '$bookId', cnt: { $sum: 1 }, avg: { $avg: '$rating' } } },
  ]);

  const cnt = agg[0]?.cnt || 0;
  const avg = agg[0]?.avg ? Math.round(agg[0].avg * 10) / 10 : 0;

  await mongoose.model('Book').updateOne(
    { _id: oid },
    { $set: { ratingCnt: cnt, ratingAvg: avg } },
    { strict: false }
  );
}

/* ----------------- Hooks tổng hợp lại Book ----------------- */
// Sau khi tạo mới
ReviewSchema.post('save', function () {
  // this.bookId có thể là ObjectId/String; đưa về string để chắc chắn
  recomputeBookRating(this.bookId).catch(() => {});
});

// Sau khi findOneAndUpdate (upsert/update)
ReviewSchema.post('findOneAndUpdate', async function (doc) {
  try {
    const d = doc || (await this.model.findOne(this.getQuery()).lean());
    await recomputeBookRating(d?.bookId);
  } catch {}
});

// Sau khi findOneAndDelete / deleteOne
ReviewSchema.post('findOneAndDelete', function (doc) {
  if (doc) recomputeBookRating(doc.bookId).catch(() => {});
});
ReviewSchema.post('deleteOne', { document: true, query: false }, function () {
  recomputeBookRating(this.bookId).catch(() => {});
});

export const Review = mongoose.model('Review', ReviewSchema);
