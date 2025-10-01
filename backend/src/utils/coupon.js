// src/utils/coupon.js
import mongoose from 'mongoose';
import { Coupon } from '../models/Coupon.js';
import { CouponUsage } from '../models/CouponUsage.js';

const toInt = (n) => {
  const v = Number(n || 0);
  return Number.isFinite(v) ? Math.floor(v) : 0;
};

const toId = (v) => {
  try { return new mongoose.Types.ObjectId(v); } catch { return null; }
};

/**
 * Tính phần subtotal đủ điều kiện theo phạm vi áp dụng của coupon
 * Hỗ trợ 2 dạng schema:
 * - c.appliesTo.products / c.appliesTo.categories
 * - c.applicableBookIds / c.applicableCategoryIds
 */
function eligibleSubtotal(items, coupon) {
  if (!Array.isArray(items) || items.length === 0) return 0;

  const prodList =
    coupon?.appliesTo?.products ??
    coupon?.applicableBookIds ??
    [];

  const catList =
    coupon?.appliesTo?.categories ??
    coupon?.applicableCategoryIds ??
    [];

  const prodSet = prodList?.length ? new Set(prodList.map((x) => String(x))) : null;
  const catSet  = catList?.length ? new Set(catList.map((x) => String(x))) : null;

  // Nếu không giới hạn phạm vi thì toàn bộ items đều hợp lệ
  if (!prodSet && !catSet) {
    return items.reduce((s, it) => s + toInt(it.price) * toInt(it.qty), 0);
  }

  return items.reduce((sum, it) => {
    const bid = String(it.bookId);
    const cid = it.categoryId ? String(it.categoryId) : undefined;

    // Điều kiện: nếu có list sản phẩm hoặc list category thì chỉ cần match 1 trong 2 (OR)
    const inProducts  = prodSet ? prodSet.has(bid) : false;
    const inCategories= catSet  ? (cid ? catSet.has(cid) : false) : false;

    if ((prodSet && inProducts) || (catSet && inCategories)) {
      return sum + toInt(it.price) * toInt(it.qty);
    }
    return sum;
  }, 0);
}

/**
 * Validate & tính giảm giá
 * @param {{code:string, userId?:string|ObjectId, items:Array<{bookId:any, price:number, qty:number, categoryId?:any}>, subtotal:number}} ctx
 * @returns {{valid:boolean, discount:number, reason?:string, coupon?:any}}
 */
export async function applyCoupon(ctx = {}) {
  const code = String(ctx.code || '').trim().toUpperCase();
  if (!code) return { valid: false, discount: 0, reason: 'EMPTY_CODE' };

  const now = new Date();

  // Chấp nhận nhiều cách lưu thời gian hiệu lực:
  // - startAt/endAt
  // - hoặc chỉ endAt = null/undefined là vô thời hạn
  const c = await Coupon.findOne({
    code,
    isActive: true,
    $and: [
      { $or: [{ startAt: { $exists: false } }, { startAt: null }, { startAt: { $lte: now } }] },
      { $or: [{ endAt: { $exists: false } }, { endAt: null }, { endAt: { $gte: now } }] },
    ],
  }).lean();

  if (!c) return { valid: false, discount: 0, reason: 'NOT_FOUND_OR_EXPIRED' };

  // Giới hạn tổng số lượt dùng
  const usageLimit = Number.isFinite(c.usageLimit) ? toInt(c.usageLimit) : null;
  const usedCount  = toInt(c.usedCount);
  if (usageLimit !== null && usedCount >= usageLimit) {
    return { valid: false, discount: 0, reason: 'USAGE_LIMIT_REACHED' };
  }

  // Giới hạn theo user (perUserLimit)
  const userId = ctx.userId ? toId(ctx.userId) : null;
  const perUserLimit = Number.isFinite(c.perUserLimit) ? toInt(c.perUserLimit) : 0;
  if (perUserLimit > 0 && userId) {
    const usedByUser = await CouponUsage.countDocuments({ couponId: c._id, userId });
    if (usedByUser >= perUserLimit) {
      return { valid: false, discount: 0, reason: 'PER_USER_LIMIT_REACHED' };
    }
  }

  const subtotal = toInt(ctx.subtotal);
  if (toInt(c.minOrder) > 0 && subtotal < toInt(c.minOrder)) {
    return { valid: false, discount: 0, reason: 'MIN_ORDER_NOT_MET' };
  }

  // Chỉ tính giảm trên phần hàng hợp lệ (nếu coupon có phạm vi)
  const eligibleSub = eligibleSubtotal(ctx.items || [], c);
  if (eligibleSub <= 0) {
    return { valid: false, discount: 0, reason: 'NO_ELIGIBLE_ITEMS' };
  }

  // Tính giảm
  let discount = 0;
  if (c.type === 'percent') {
    discount = Math.floor(eligibleSub * (Number(c.value || 0) / 100));
  } else if (c.type === 'fixed') {
    discount = toInt(c.value);
  } else {
    return { valid: false, discount: 0, reason: 'UNSUPPORTED_TYPE' };
  }

  // Giới hạn mức giảm tối đa
  if (toInt(c.maxDiscount) > 0) {
    discount = Math.min(discount, toInt(c.maxDiscount));
  }

  // Không vượt quá tổng đơn
  discount = Math.max(0, Math.min(discount, subtotal));

  return { valid: discount > 0, discount, coupon: c };
}

/**
 * Ghi nhận sử dụng coupon (gọi sau khi tạo đơn thành công)
 */
export async function markCouponUsed(couponId, userId, orderId) {
  const cid = toId(couponId);
  const uid = userId ? toId(userId) : null;
  const oid = orderId ? toId(orderId) : null;
  if (!cid) return;

  // Tăng bộ đếm tổng (best-effort)
  await Coupon.updateOne({ _id: cid }, { $inc: { usedCount: 1 } });

  // Lưu usage theo user (nếu có uid)
  if (uid) {
    await CouponUsage.create({
      couponId: cid,
      userId: uid,
      orderId: oid || null,
      usedAt: new Date(),
    });
  }
}
