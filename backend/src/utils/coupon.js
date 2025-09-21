import { Coupon } from '../models/Coupon.js';
import { CouponUsage } from '../models/CouponUsage.js';
import mongoose from 'mongoose';

/**
 * Validate and compute discount for a cart/order
 * @param {{code: string, userId: string, items: Array<{bookId: string, price: number, qty: number, categoryId?: string}> , subtotal: number}} ctx
 * @returns {{valid: boolean, discount: number, reason?: string, coupon?: any}}
 */
export async function applyCoupon(ctx) {
  const code = (ctx.code || '').trim().toUpperCase();
  if (!code) return { valid: false, discount: 0, reason: 'NO_CODE' };
  const now = new Date();
  const c = await Coupon.findOne({ code, isActive: true, startAt: { $lte: now }, $or: [{ endAt: null }, { endAt: { $gte: now } }] }).lean();
  if (!c) return { valid: false, discount: 0, reason: 'INVALID_OR_EXPIRED' };

  // usage limit
  if (c.usageLimit && c.usedCount >= c.usageLimit) {
    return { valid: false, discount: 0, reason: 'USAGE_LIMIT' };
  }

  // appliesTo: { categories?: [], products?: [] }
  if (c.appliesTo?.categories?.length || c.appliesTo?.products?.length) {
    const allowed = ctx.items.filter(it =>
      (!c.appliesTo.products?.length || c.appliesTo.products.some(id => id.toString() === it.bookId.toString())) ||
      (!c.appliesTo.categories?.length || c.appliesTo.categories.some(id => id.toString() === (it.categoryId?.toString())))
    );
    if (!allowed.length) return { valid: false, discount: 0, reason: 'NO_APPLICABLE_ITEMS' };
  }

  if (c.minOrder && ctx.subtotal < c.minOrder) {
    return { valid: false, discount: 0, reason: 'MIN_ORDER' };
  }

  const discount = c.type === 'percent' ? Math.floor(ctx.subtotal * (c.value / 100)) : Math.min(c.value, ctx.subtotal);
  const capped = c.maxDiscount ? Math.min(discount, c.maxDiscount) : discount;

  return { valid: true, discount: capped, coupon: c };
}

export async function markCouponUsed(couponId, userId, orderId) {
  await CouponUsage.create({ couponId: new mongoose.Types.ObjectId(couponId), userId, orderId, usedAt: new Date() });
  await Coupon.updateOne({ _id: couponId }, { $inc: { usedCount: 1 } });
}
