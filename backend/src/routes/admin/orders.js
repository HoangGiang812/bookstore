// backend/src/routes/admin/orders.js
import { Router } from 'express';
import { requireRoles } from '../../middlewares/auth.js';
import {
  approveCancel,
  rejectCancel,
  addOrderNote,
  refundOrder,
} from '../../controllers/admin/orderAdminController.js';

const r = Router();
// Cho phép cả admin và staff quản trị đơn hàng
const requireAdmin = requireRoles('admin', 'staff');

// Ghi chú nội bộ đơn hàng
r.post('/:id/notes', requireAdmin, addOrderNote);

// Duyệt yêu cầu huỷ
r.post('/:id/cancel/approve', requireAdmin, approveCancel);

// Từ chối yêu cầu huỷ
r.post('/:id/cancel/reject', requireAdmin, rejectCancel);

// Hoàn tiền (ghi nhận hệ thống; nếu cần tích hợp cổng, làm trong controller)
r.post('/:id/refund', requireAdmin, refundOrder);

export default r;
