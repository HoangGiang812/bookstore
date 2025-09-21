import mongoose from 'mongoose';
const CouponSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  type: { type: String, enum: ['percent', 'amount'], default: 'percent' },
  value: Number,
  minOrder: Number,
  maxDiscount: Number,
  usageLimit: Number,
  usedCount: { type: Number, default: 0 },
  appliesTo: { type: Object, default: {} },
  isActive: { type: Boolean, default: true },
  startAt: Date,
  endAt: Date
}, { collection: 'coupons' });
export const Coupon = mongoose.model('Coupon', CouponSchema);
