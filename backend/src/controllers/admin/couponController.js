import mongoose from 'mongoose';
import { Coupon } from '../../models/Coupon.js';
import { Order } from '../../models/Order.js';

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(v);
const normCode = (v) => String(v || '').trim().toUpperCase();
const amountExpr = { $ifNull: ['$total.grand', '$total'] }; // hỗ trợ total.grand hoặc total (Number)

// Tìm coupon theo id hoặc code
async function findCoupon(idOrCode) {
  const q = isObjectId(idOrCode) ? { _id: idOrCode } : { code: normCode(idOrCode) };
  return Coupon.findOne(q).lean();
}

// Tạo điều kiện match đơn có áp mã giảm (tương thích nhiều kiểu lưu)
function matchOrdersByCoupon(coupon) {
  return {
    $or: [
      { couponId: coupon._id },                // kiểu ObjectId đơn lẻ
      { coupons: coupon._id },                 // mảng ObjectId
      { 'appliedCoupons.id': coupon._id },     // mảng object có id
      { couponCode: coupon.code },             // lưu bằng code đơn lẻ
      { 'coupon.code': coupon.code },          // object coupon
      { 'appliedCoupons.code': coupon.code },  // mảng object có code
    ],
  };
}

/**
 * GET /api/admin/coupons/:id/usages
 * Hỗ trợ :id là ObjectId hoặc code.
 * Trả về:
 * {
 *   coupon: { id, code, active, usageLimit, used },
 *   usages: <số đơn dùng>,
 *   amount: <tổng doanh thu các đơn có dùng>,
 *   byStatus: [{ status, count, amount }],
 *   recentOrders: [{ id, user: { _id,name,email }, total, status, createdAt }]
 * }
 */
export async function couponUsages(req, res) {
  try {
    const coupon = await findCoupon(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'coupon_not_found' });

    const match = matchOrdersByCoupon(coupon);

    const [usages, byStatus, recent, totals] = await Promise.all([
      Order.countDocuments(match),
      Order.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: amountExpr } } },
        { $project: { _id: 0, status: '$_id', count: 1, amount: 1 } },
        { $sort: { count: -1 } },
      ]),
      Order.find(match)
        .select('_id userId total createdAt status')
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(25)
        .lean(),
      Order.aggregate([
        { $match: match },
        { $group: { _id: null, amount: { $sum: amountExpr } } },
        { $project: { _id: 0, amount: 1 } },
      ]),
    ]);

    res.json({
      coupon: {
        id: coupon._id,
        code: coupon.code,
        active: coupon.active,
        usageLimit: coupon.usageLimit,
        used: coupon.used,
      },
      usages,
      amount: totals?.[0]?.amount || 0,
      byStatus,
      recentOrders: recent.map((o) => ({
        id: o._id,
        user: o.userId ? { _id: o.userId._id, name: o.userId.name, email: o.userId.email } : null,
        total: o?.total?.grand ?? o?.total ?? 0,
        status: o.status,
        createdAt: o.createdAt,
      })),
    });
  } catch (err) {
    console.error('couponUsages error', err);
    res.status(500).json({ message: 'failed_to_compute_usages', error: err.message });
  }
}

/**
 * POST /api/admin/coupons/:id/pause
 * :id có thể là ObjectId hoặc code
 */
export async function pauseCoupon(req, res) {
  try {
    const key = req.params.id;
    const q = isObjectId(key) ? { _id: key } : { code: normCode(key) };
    const c = await Coupon.findOneAndUpdate(
      q,
      { active: false, pausedAt: new Date() },
      { new: true }
    ).lean();
    if (!c) return res.status(404).json({ message: 'coupon_not_found' });
    res.json(c);
  } catch (err) {
    console.error('pauseCoupon error', err);
    res.status(500).json({ message: 'failed_to_pause', error: err.message });
  }
}

export async function resumeCoupon(req, res) {
  try {
    const key = req.params.id;
    const q = isObjectId(key) ? { _id: key } : { code: normCode(key) };
    const c = await Coupon.findOneAndUpdate(
      q,
      { active: true, pausedAt: null },
      { new: true }
    ).lean();
    if (!c) return res.status(404).json({ message: 'coupon_not_found' });
    res.json(c);
  } catch (err) {
    console.error('resumeCoupon error', err);
    res.status(500).json({ message: 'failed_to_resume', error: err.message });
  }
}
