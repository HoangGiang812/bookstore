import { Order } from '../../models/Order.js';
import { User } from '../../models/User.js';
import { Book } from '../../models/Book.js';
import { Transaction } from '../../models/Transaction.js'; // ✅ Bắt buộc có

// Helper 1: Xác định 2 khoảng thời gian (Kỳ này & Kỳ trước)
const getRanges = (range) => {
    const now = new Date();
    let currentFrom = new Date();
    let previousFrom = new Date();
    let previousTo = new Date();

    if (!range || range === '30d' || range === 'month') {
        // Kỳ này: 30 ngày gần đây
        currentFrom.setDate(now.getDate() - 30);
        // Kỳ trước: 30 ngày trước đó nữa (ngày -60 đến ngày -30)
        previousFrom.setDate(now.getDate() - 60);
        previousTo.setDate(now.getDate() - 30);
    } else if (range === 'week' || range === '7d') {
        currentFrom.setDate(now.getDate() - 7);
        previousFrom.setDate(now.getDate() - 14);
        previousTo.setDate(now.getDate() - 7);
    } else if (range === 'year') {
        currentFrom.setFullYear(now.getFullYear() - 1);
        previousFrom.setFullYear(now.getFullYear() - 2);
        previousTo.setFullYear(now.getFullYear() - 1);
    } else if (range === 'today') {
        currentFrom.setHours(0,0,0,0); // Đầu ngày hôm nay
        
        // Kỳ trước là Hôm qua
        previousFrom.setDate(now.getDate() - 1);
        previousFrom.setHours(0,0,0,0);
        previousTo.setDate(now.getDate() - 1);
        previousTo.setHours(23,59,59,999);
    }
    return { currentFrom, currentTo: now, previousFrom, previousTo };
};

// Helper 2: Tính tổng tiền thực thu (Charge - Refund) trong 1 khoảng thời gian
const aggregateRevenue = async (from, to) => {
    const result = await Transaction.aggregate([
        { $match: { 
            createdAt: { $gte: from, $lte: to },
            status: 'succeeded'
        }},
        { $group: { 
            _id: null, 
            // Công thức: Tổng tiền Thu - Tổng tiền Hoàn
            total: { $sum: { 
                $cond: [{ $eq: ['$type', 'charge'] }, '$amount', { $multiply: ['$amount', -1] }] 
            }}
        }}
    ]);
    return result[0]?.total || 0;
};

export const OverviewCtrl = {
  overview: async (req, res) => {
    try {
        const { range } = req.query;
        const { currentFrom, currentTo, previousFrom, previousTo } = getRanges(range);

        // --- 1. TÍNH DOANH THU & TĂNG TRƯỞNG ---
        const currentRevenue = await aggregateRevenue(currentFrom, currentTo);
        const previousRevenue = await aggregateRevenue(previousFrom, previousTo);

        // Công thức tính % tăng trưởng
        let growthRevenue = 0;
        if (previousRevenue === 0) {
            // Nếu kỳ trước doanh thu = 0, mà kỳ này có tiền -> Tăng trưởng 100%
            growthRevenue = currentRevenue > 0 ? 100 : 0;
        } else {
            growthRevenue = Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100);
        }

        // --- 2. TÍNH SỐ ĐƠN HÀNG & TĂNG TRƯỞNG ---
        const currentOrders = await Order.countDocuments({ createdAt: { $gte: currentFrom, $lte: currentTo } });
        const previousOrders = await Order.countDocuments({ createdAt: { $gte: previousFrom, $lte: previousTo } });
        
        let growthOrders = 0;
        if (previousOrders === 0) {
            growthOrders = currentOrders > 0 ? 100 : 0;
        } else {
            growthOrders = Math.round(((currentOrders - previousOrders) / previousOrders) * 100);
        }

        // --- 3. CÁC CHỈ SỐ TỔNG (LIFETIME) ---
        const totalOrders = await Order.countDocuments({});
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalBooks = await Book.countDocuments({});

        // --- 4. BIỂU ĐỒ XU HƯỚNG (Dựa trên Transaction để khớp với Tài chính) ---
        const revenueChart = await Transaction.aggregate([
            { $match: { 
                createdAt: { $gte: currentFrom, $lte: currentTo }, 
                status: 'succeeded'
            }},
            { $project: {
                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                netAmount: { 
                    $cond: [{ $eq: ['$type', 'charge'] }, '$amount', { $multiply: ['$amount', -1] }] 
                }
            }},
            { $group: {
                _id: '$date',
                sales: { $sum: '$netAmount' }
            }},
            { $sort: { _id: 1 } }
        ]);

        // --- 5. CÁC DỮ LIỆU KHÁC (PIE CHART, TOP PRODUCTS...) ---
        // (Giữ nguyên logic cũ của bạn cho phần này để code gọn)
        const orderStatus = await Order.aggregate([ { $group: { _id: '$status', count: { $sum: 1 } } } ]);
        
        const topProducts = await Order.aggregate([
            { $match: { status: { $nin: ['cancelled', 'returned'] } } },
            { $unwind: '$items' },
            { $group: { 
                _id: '$items.bookId', 
                name: { $first: '$items.title' },
                sold: { $sum: '$items.qty' },
                revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } }
            }},
            { $sort: { sold: -1 } }, { $limit: 5 }
        ]);

        const lowStock = await Book.find({ stock: { $lte: 10 } }).select('title stock image coverUrl').limit(5).lean();
        
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 }).limit(5)
            .populate('userId', 'name email')
            .select('code total status createdAt payment userId').lean();

        // --- TRẢ VỀ KẾT QUẢ ---
        res.json({
            stats: { 
                // Số liệu hiển thị ở thẻ KPI
                totalRevenue: currentRevenue, 
                totalOrders: currentOrders, 
                totalUsers, 
                totalBooks,
                // Số liệu dùng để hiện mũi tên xanh/đỏ
                growthRevenue, 
                growthOrders   
            },
            chart: revenueChart.map(r => ({ date: r._id, sales: r.sales })),
            pie: orderStatus.map(s => ({ name: s._id, value: s.count })),
            topProducts, lowStock, recentOrders
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: e.message });
    }
  }
};