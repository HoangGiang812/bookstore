// src/controllers/admin/overviewController.js
import { Order } from '../../models/Order.js';
import { User } from '../../models/User.js';
import { Book } from '../../models/Book.js';

const STATUS = ['pending','processing','shipping','completed','canceled','refunded'];
const REV_STAT = ['processing','shipping','completed'];

function startOfDay(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
function parseRange(range){
  const now = new Date(); const to = now;
  let from = new Date(now.getTime() - 7*24*3600*1000); // 7d
  if((range||'').toLowerCase()==='30d') from = new Date(now.getTime() - 30*24*3600*1000);
  if((range||'').toLowerCase()==='month') from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: startOfDay(from), to };
}

export const OverviewCtrl = {
  overview: async (req, res) => {
    const { range, from:fromStr, to:toStr } = req.query || {};
    let { from, to } = parseRange(range);
    if (fromStr) from = startOfDay(new Date(fromStr));
    if (toStr)   to   = new Date(toStr);

    // Đếm đơn theo trạng thái trong khoảng
    const statusAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const ordersByStatus = Object.fromEntries(STATUS.map(s => [s, statusAgg.find(x=>x._id===s)?.count || 0]));

    // Doanh thu theo ngày (tính theo items: qty * price) với các trạng thái đang/đã xử lý
    const revenueByDay = await Order.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to }, status: { $in: REV_STAT } } },
      { $unwind: '$items' },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          amount: { $sum: { $multiply: [ '$items.qty', '$items.price' ] } } // nếu schema là quantity → đổi '$items.qty' thành '$items.quantity'
      }},
      { $sort: { _id: 1 } }
    ]).then(r => r.map(x => ({ date: x._id, amount: x.amount || 0 })));

    const revenue = revenueByDay.reduce((s,r)=>s + (r.amount||0), 0);

    // Tổng SL sản phẩm bán ra
    const soldAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to }, status: { $in: REV_STAT } } },
      { $unwind: '$items' },
      { $group: { _id: null, qty: { $sum: '$items.qty' } } } // nếu là quantity → đổi
    ]);
    const soldItems = soldAgg[0]?.qty || 0;

    // Top sách
    const topBooks = await Order.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.bookId', qty: { $sum: '$items.qty' } } }, // nếu là productId thì đổi
      { $sort: { qty: -1 } }, { $limit: 5 },
      { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'book' } },
      { $addFields: { title: { $ifNull: [ { $arrayElemAt: ['$book.title', 0] }, '' ] } } },
      { $project: { book: 0 } }
    ]);

    // Top khách
    const topCustomers = await Order.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $unwind: '$items' },
      { $group: {
          _id: '$userId',
          revenue: { $sum: { $multiply: [ '$items.qty', '$items.price' ] } }
      }},
      { $sort: { revenue: -1 } }, { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $addFields: {
          name:  { $ifNull: [ { $arrayElemAt: ['$user.name', 0] }, '' ] },
          email: { $ifNull: [ { $arrayElemAt: ['$user.email', 0] }, '' ] }
      }},
      { $project: { user: 0 } }
    ]);

    const newCustomers = await User.countDocuments({ createdAt: { $gte: from, $lte: to } });

    res.json({ range:{from,to}, revenue, soldItems, newCustomers, ordersByStatus, topBooks, topCustomers, revenueByDay });
  }
};
