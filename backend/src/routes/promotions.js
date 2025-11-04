import express from 'express';
import mongoose from 'mongoose';
import { Book } from '../models/Book.js'; 
import { Category } from '../models/Category.js'; //
import { requireAuth } from '../middlewares/auth.js'; //

const router = express.Router();

// API để áp dụng khuyến mãi
router.post(
  '/apply', 
  requireAuth, 
  async (req, res) => {
    const { type, value, scope, productIds, categoryId } = req.body; 

    if (!type || !value || !scope) {
      return res.status(400).json({ message: 'Thiếu thông tin khuyến mãi' });
    }

    let filter = {};
    
    if (scope === 'all_products') {
      filter = {};
    
    } else if (scope === 'specific_products' && Array.isArray(productIds) && productIds.length > 0) {
      filter = { _id: { $in: productIds } }; 
    
    } else if (scope === 'category' && categoryId) {
      
      if (!mongoose.isValidObjectId(categoryId)) {
        return res.status(400).json({ message: 'ID Danh mục không hợp lệ' });
      }
      
      try {
        // SỬA LẠI:
        // 1. Không cần 'mongoose.Types.ObjectId'
        // 2. Query 'path' để tìm tất cả danh mục con (giống hệt logic trong Category.js)
        const allChildCategories = await Category.find({ 
          path: categoryId // Mongoose sẽ tự động cast 'categoryId' (string)
        }).select('_id').lean();
        
        const allCategoryIds = [
            categoryId, // Bao gồm chính danh mục cha
            ...allChildCategories.map(c => c._id)
        ];
        
        filter = { categoryIds: { $in: allCategoryIds } };
      } catch (e) {
        // Thêm log để xem lỗi thật
        console.error("Lỗi khi tìm danh mục con:", e); 
        return res.status(400).json({ message: 'Lỗi khi tìm danh mục' });
      }
    
    } else {
      return res.status(400).json({ message: 'Phạm vi không hợp lệ' });
    }

    // Logic cập nhật % (đã đúng)
    let updateOperation = {};
    if (type === 'percentage') {
      updateOperation = { $set: { discountPercent: Number(value) } };
    } else {
      return res.status(400).json({ 
        message: 'Loại khuyến mãi "Giảm tiền" không được hỗ trợ.' 
      });
    }

    try {
      const result = await Book.updateMany(filter, updateOperation);
      res.json({ message: `Đã cập nhật ${result.modifiedCount} sản phẩm.` });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

// API để GỠ BỎ khuyến mãi
router.post(
  '/revert',
  requireAuth,
  async (req, res) => {
    const { scope, productIds, categoryId } = req.body;
    
    let filter = {};
    
    // SỬA LẠI LOGIC PHẠM VI (Tương tự như trên)
    if (scope === 'all_products') {
      filter = {};
    } else if (scope === 'specific_products' && Array.isArray(productIds) && productIds.length > 0) {
      filter = { _id: { $in: productIds } };
    } else if (scope === 'category' && categoryId) {
      
      if (!mongoose.isValidObjectId(categoryId)) {
        return res.status(400).json({ message: 'ID Danh mục không hợp lệ' });
      }
      
      try {
        // SỬA LẠI:
        const allChildCategories = await Category.find({ 
          path: categoryId 
        }).select('_id').lean();
        
        const allCategoryIds = [
            categoryId, 
            ...allChildCategories.map(c => c._id)
        ];
        filter = { categoryIds: { $in: allCategoryIds } };
      } catch (e) {
        console.error("Lỗi khi tìm danh mục con (revert):", e);
        return res.status(400).json({ message: 'Lỗi khi tìm danh mục' });
      }
    } else {
      return res.status(400).json({ message: 'Phạm vi không hợp lệ' });
    }

    try {
      // Logic gỡ bỏ (đã đúng)
      const result = await Book.updateMany(filter, { 
        $set: { discountPercent: 0 } 
      });
      res.json({ message: `Đã gỡ khuyến mãi cho ${result.modifiedCount} sản phẩm.` });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

export default router;