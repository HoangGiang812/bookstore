import mongoose from 'mongoose';
import { Order } from '../../models/Order.js';

// Nếu bạn có model Book/User thì import để $lookup trả về đủ title/email
// (không bắt buộc cho $lookup pipeline nhưng tốt để nhất quán tên collection)
import { Book } from '../../models/Book.js';
import { User } from '../../models/User.js';

const TZ = process.env.TZ || 'Asia/Ho_Chi_Minh';

// helper format thời gian để group
function timeGroupExpr(unit) {
  // week dùng ISO: %G (ISO week-year) -W%V (ISO week)
  const fmt =
    unit === 'day'   ? '%Y-%m-%d' :
    unit === 'week'  ? '%G-W%V'   :
    /* month */        '%Y-%m';

  return { $dateToString: { format: fmt, date: '$createdAt', timezone: TZ } };
}

/**
 * GET /api/admin/dashboard?unit=day|week|month&days=30
 * Trả về:
 * {
 *   unit, since,
 *   revenue: [{ period:'YYYY-MM-DD|G-Wxx|YYYY-MM', amount:Number }],
 *   statusCounts: [{ status:String, count:Number }],
 *   topBooks: [{ id, title, qty, revenue, coverUrl, isbn }],
 *   topCustomers: [{ id, name, email, spent, orders }],
 *   totals: { totalOrders, totalRevenue }
 * }
 */
export async function dashboardKpis(req, res) {
  try {
    const unit = ['day', 'week', 'month'].includes(req.query.unit) ? req.query.unit : 'day';
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);

    const since = new Date();
    since.setDate(since.getDate() - days);

    // “đơn có doanh thu” theo trạng thái
    const paidStatuses = ['processing', 'shipping', 'completed'];

    // với nhiều schema, total có thể là Number hoặc object.total/grand
    const amountExpr = { $ifNull: ['$total.grand', '$total'] };

    const baseMatch = { createdAt: { $gte: since } };

    // 1) Revenue theo thời gian
    const revenueAgg = Order.aggregate([
      { $match: { ...baseMatch, status: { $in: paidStatuses } } },
      { $group: { _id: timeGroupExpr(unit), amount: { $sum: amountExpr } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, period: '$_id', amount: 1 } },
    ]);

    // 2) Đếm đơn theo trạng thái
    const statusCountsAgg = Order.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]);

    // 3) Top sách bán chạy (dựa trên items)
    // Tương thích cả items.bookId và items.productId; qty & price có thể khác tên => fallback
    const topBooksAgg = Order.aggregate([
      { $match: { ...baseMatch, status: { $in: paidStatuses } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: { $ifNull: ['$items.bookId', '$items.productId'] },
          qty: { $sum: { $ifNull: ['$items.qty', 1] } },
          revenue: {
            $sum: {
              $multiply: [
                { $ifNull: ['$items.qty', 1] },
                { $ifNull: ['$items.price', 0] },
              ],
            },
          },
        },
      },
      { $sort: { qty: -1 } },
      { $limit: 10 },
      // Lấy title/cover/isbn từ collection books (mặc định tên coll là 'books')
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: '_id',
          as: 'book',
        },
      },
      { $unwind: { path: '$book', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          id: '$_id',
          qty: 1,
          revenue: 1,
          title: { $ifNull: ['$book.title', ''] },
          coverUrl: '$book.coverUrl',
          isbn: '$book.isbn',
        },
      },
    ]);

    // 4) Top khách hàng theo chi tiêu
    const topCustomersAgg = Order.aggregate([
      { $match: { ...baseMatch, status: { $in: paidStatuses } } },
      {
        $group: {
          _id: '$userId',
          spent: { $sum: amountExpr },
          orders: { $sum: 1 },
        },
      },
      { $sort: { spent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'u',
        },
      },
      { $unwind: { path: '$u', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          id: '$_id',
          spent: 1,
          orders: 1,
          name: { $ifNull: ['$u.name', '$u.email'] },
          email: '$u.email',
        },
      },
    ]);

    // 5) Totals nhanh (trong khoảng since..now)
    const totalsAgg = Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [{ $in: ['$status', paidStatuses] }, amountExpr, 0],
            },
          },
        },
      },
      { $project: { _id: 0 } },
    ]);

    const [revenue, statusCounts, topBooks, topCustomers, totalsArr] = await Promise.all([
      revenueAgg,
      statusCountsAgg,
      topBooksAgg,
      topCustomersAgg,
      totalsAgg,
    ]);

    const totals = totalsArr?.[0] || { totalOrders: 0, totalRevenue: 0 };

    res.json({ unit, since, revenue, statusCounts, topBooks, topCustomers, totals });
  } catch (err) {
    console.error('dashboardKpis error', err);
    res.status(500).json({ message: 'Failed to build dashboard', error: err.message });
  }
}
