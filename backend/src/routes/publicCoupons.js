import express from 'express';
// Đảm bảo bạn import đúng đường dẫn tới model Coupon
import { Coupon } from '../models/Coupon.js'; 

const router = express.Router();

// API: GET /api/public-coupons
router.get('/', async (req, res) => {
  try {
    const now = new Date();

    // SỬA LẠI TOÀN BỘ TRUY VẤN
    const coupons = await Coupon.find({
      $and: [ // Sử dụng $and để kết hợp tất cả điều kiện
        // 1. Phải đang hoạt động
        { isActive: true }, 
        
        // 2. Ngày bắt đầu (phải <= now HOẶC là null)
        { $or: [
          { startAt: { $lte: now } },
          { startAt: { $eq: null } }
        ]},
        
        // 3. Ngày hết hạn (phải >= now HOẶC là null)
        { $or: [
          { endAt: { $gte: now } },
          { endAt: { $eq: null } }
        ]},
        
        // 4. Lượt sử dụng (còn lượt HOẶC là vô hạn)
        { $or: [
          { usageLimit: { $exists: false } },
          { usageLimit: null },
          { usageLimit: 0 },
          { $expr: { $gt: ["$usageLimit", { $ifNull: ["$usedCount", 0] }] } }
        ]}
      ]
    })
    .sort({ createdAt: -1 })
    .lean();

    // Chỉ trả về các trường cần thiết cho frontend
    const publicData = coupons.map(c => ({
      _id: c._id,
      code: c.code,
      value: c.value,
      type: c.type,
      minOrder: c.minOrder,
      description: c.description,
    }));

    res.json(publicData);

  } catch (error) {
    console.error("Lỗi API /public-coupons:", error); 
    res.status(500).json({ message: 'Lỗi server' });
  }
});

export default router;