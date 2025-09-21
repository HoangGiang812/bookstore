import mongoose from 'mongoose';
const ReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
  rating: { type: Number, min: 1, max: 5 },
  title: String,
  content: String,
  photos: [String],
  isApproved: { type: Boolean, default: true }
}, { timestamps: true, collection: 'reviews' });

ReviewSchema.index({ userId: 1, bookId: 1 }, { unique: true });

export const Review = mongoose.model('Review', ReviewSchema);
