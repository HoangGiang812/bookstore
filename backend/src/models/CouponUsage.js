import mongoose from 'mongoose';
const CouponUsageSchema = new mongoose.Schema({
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  usedAt: Date
}, { collection: 'coupon_usages' });
export const CouponUsage = mongoose.model('CouponUsage', CouponUsageSchema);
