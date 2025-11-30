import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middlewares/auth.js';
import {
  approveCancel,
  rejectCancel,
  addOrderNote,
  refundOrder,
  deleteOrder,
  // Quy trình vận hành
  markProcessing,
  markShipping,
  markDelivered,
  // Thanh toán
  setPaymentStatus,
  assignShipper,
} from '../../controllers/admin/orderAdminController.js';

const r = Router();
// Cho phép cả admin và staff quản trị đơn hàng
const guardStaff = [requireAuth, requireRoles('admin', 'staff')];
const requireAdmin = requireRoles('admin', 'staff');

// ===== Ghi chú nội bộ đơn hàng
r.post('/:id/notes', requireAdmin, addOrderNote);

// ===== Quy trình vận hành của admin (dừng ở delivered)
r.post('/:id/processing', requireAdmin, markProcessing); // pending -> processing
r.post('/:id/shipping',   requireAdmin, markShipping);   // processing -> shipping
r.post('/:id/delivered',  requireAdmin, markDelivered);  // shipping -> delivered

// ===== Duyệt/Từ chối yêu cầu huỷ
r.post('/:id/cancel/approve', requireAdmin, approveCancel);
r.post('/:id/cancel/reject',  requireAdmin, rejectCancel);

// ===== Cập nhật trạng thái thanh toán (paid ⇄ unpaid)
r.patch('/:id/payment', requireAdmin, setPaymentStatus);

// ===== Hoàn tiền & Xoá đơn
r.post('/:id/refund', requireAdmin, refundOrder);
r.delete('/:id', requireAdmin, deleteOrder);

r.post('/:id/assign', ...guardStaff, assignShipper);

export default r;
