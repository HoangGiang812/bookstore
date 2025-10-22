import { applyCoupon } from '../utils/coupon.js'; // Import hàm applyCoupon
import { Book } from '../models/Book.js'; // Import model Book

const toInt = (n) => {
  const v = Number(n || 0);
  return Number.isFinite(v) ? Math.round(v) : 0;
};

/**
 * POST /api/public/coupons/validate (hoặc /api/coupons/validate)
 * Kiểm tra mã giảm giá và trả về số tiền giảm.
 */
export async function validateCoupon(req, res) {
  try {
    const { code, items } = req.body || {};
    if (!code) {
      return res.status(400).json({ valid: false, message: 'Vui lòng nhập mã.' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ valid: false, message: 'Giỏ hàng trống.' });
    }

    // 1. Tính toán subtotal từ các items được gửi lên
    const subtotal = items.reduce((s, it) => s + toInt(it.price) * toInt(it.qty), 0);

    // 2. Lấy thông tin categoryId (nếu cần)
    // (applyCoupon cần categoryId để check phạm vi)
    const bookIds = items.map(it => it.bookId);
    const books = await Book.find({ _id: { $in: bookIds } }).select('categories categoryId').lean();
    const bookMap = new Map(books.map(b => [String(b._id), b]));

    const itemsWithCategory = items.map(it => {
      const book = bookMap.get(String(it.bookId));
      const categoryId = it.categoryId || 
                         (book ? (book.categoryId || (Array.isArray(book.categories) ? book.categories[0] : null)) : null);
      return { ...it, categoryId };
    });
    
    // 3. Gọi hàm applyCoupon
    const result = await applyCoupon({
      code: code,
      userId: req.user?._id || null, // req.user từ middleware attachUserFromToken
      items: itemsWithCategory,
      subtotal: subtotal,
    });

    // 4. Trả về kết quả
    if (!result.valid) {
      return res.status(400).json({
        valid: false,
        discount: 0,
        code: code,
        message: 'Mã không hợp lệ hoặc không đủ điều kiện.',
        reason: result.reason,
      });
    }

    return res.json({
      valid: true,
      discount: result.discount,
      code: result.coupon.code, // Trả về mã đã chuẩn hóa
      message: `Áp dụng thành công! Bạn được giảm ${result.discount.toLocaleString('vi-VN')}đ.`,
    });

  } catch (err) {
    console.error('validateCoupon error:', err);
    res.status(500).json({ valid: false, message: 'Lỗi máy chủ khi kiểm tra mã.' });
  }
}