import { Router } from 'express';
// ✅ Import các "guards"
import { attachUserFromToken, requireAuth, requireRoles } from '../../middlewares/auth.js';
import { adminAudit } from '../../middlewares/audit.js';

// ... (import các controllers khác của bạn)
import {
  CategoryCtrl, AuthorCtrl, PublisherCtrl,
  BannerCtrl, PageCtrl, CouponCtrl, UsersCtrl, OrdersCtrl, RMACtrl
} from '../../controllers/admin/entityController.js';
import { upload, importBooksCSV } from '../../controllers/admin/bookImportController.js';
import { dashboardKpis } from '../../controllers/admin/dashboardController.js';
import { addOrderNote, refundOrder, approveCancel, rejectCancel } from '../../controllers/admin/orderAdminController.js';
// ✅ Đảm bảo import hàm listUsers MỚI
import { listUsers, lockUnlockUser, updateUser, adminTriggerReset } from '../../controllers/admin/userAdminController.js';
import { couponUsages, pauseCoupon, resumeCoupon } from '../../controllers/admin/couponController.js';
import { 
  listBooks, getBook, createBook, updateBook, removeBook, intake, uploadCover 
} from '../../controllers/admin/bookAdminController.js';
import postsAdminRoutes from './posts.js';

const r = Router();

// ✅ Định nghĩa 2 cấp độ "guard"
// guardStaff: Cho phép 'admin' HOẶC 'staff'
const guardStaff = [requireAuth, requireRoles('admin', 'staff')];
// guardAdmin: CHỈ cho phép 'admin'
const guardAdmin = [requireAuth, requireRoles('admin')];

// Tất cả các route admin đều phải attach user trước
r.use(attachUserFromToken);

// Dashboard: Cả 2 đều được xem
r.get('/dashboard', ...guardStaff, dashboardKpis);

/** ===== Books ===== */
// Staff: Được xem, sửa, cập nhật tồn kho
r.get('/books', ...guardStaff, listBooks);
r.get('/books/:id', ...guardStaff, getBook);
r.patch('/books/:id', ...guardStaff, adminAudit, updateBook);
r.post('/books/:id/intake', ...guardStaff, adminAudit, intake);
r.post('/books/upload-cover', ...guardStaff, adminAudit, ...uploadCover);

// Admin: Chỉ admin được tạo, xóa, import
r.post('/books', ...guardAdmin, adminAudit, createBook);
r.delete('/books/:id', ...guardAdmin, adminAudit, removeBook);
r.post('/books/import', ...guardAdmin, adminAudit, upload.single('file'), importBooksCSV);

/** ===== Content (Categories, Authors, Publishers) ===== */
// Staff: Cho phép Staff quản lý nội dung cơ bản
r.get('/categories', ...guardStaff, CategoryCtrl.list);
r.post('/categories', ...guardStaff, adminAudit, CategoryCtrl.create);
r.get('/categories/:id', ...guardStaff, CategoryCtrl.get);
r.patch('/categories/:id', ...guardStaff, adminAudit, CategoryCtrl.update);
// Admin: Chỉ admin được XÓA (để an toàn)
r.delete('/categories/:id', ...guardAdmin, adminAudit, CategoryCtrl.remove);

r.get('/authors', ...guardStaff, AuthorCtrl.list);
r.post('/authors', ...guardStaff, adminAudit, AuthorCtrl.create);
r.get('/authors/:id', ...guardStaff, AuthorCtrl.get);
r.patch('/authors/:id', ...guardStaff, adminAudit, AuthorCtrl.update);
r.delete('/authors/:id', ...guardAdmin, adminAudit, AuthorCtrl.remove); // Chỉ admin được xóa

r.get('/publishers', ...guardStaff, PublisherCtrl.list);
r.post('/publishers', ...guardStaff, adminAudit, PublisherCtrl.create);
r.get('/publishers/:id', ...guardStaff, PublisherCtrl.get);
r.patch('/publishers/:id', ...guardStaff, adminAudit, PublisherCtrl.update);
r.delete('/publishers/:id', ...guardAdmin, adminAudit, PublisherCtrl.remove); // Chỉ admin được xóa

/** ===== Admin System (Banners, Pages) ===== */
// Admin: Chỉ admin được cấu hình hệ thống
r.get('/banners', ...guardAdmin, BannerCtrl.list);
r.post('/banners', ...guardAdmin, adminAudit, BannerCtrl.create);
r.patch('/banners/:id', ...guardAdmin, adminAudit, BannerCtrl.update);
r.delete('/banners/:id', ...guardAdmin, adminAudit, BannerCtrl.remove);

r.get('/pages', ...guardAdmin, PageCtrl.list);
r.post('/pages', ...guardAdmin, adminAudit, PageCtrl.create);
r.patch('/pages/:id', ...guardAdmin, adminAudit, PageCtrl.update);
r.delete('/pages/:id', ...guardAdmin, adminAudit, PageCtrl.remove);

/** ===== Coupons ===== */
// Staff: Được xem, bật/tắt
r.get('/coupons', ...guardStaff, CouponCtrl.list);
r.get('/coupons/:id/usages', ...guardStaff, couponUsages);
r.post('/coupons/:id/pause', ...guardStaff, adminAudit, pauseCoupon);
r.post('/coupons/:id/resume', ...guardStaff, adminAudit, resumeCoupon);
// Admin: Chỉ admin được tạo, sửa, xóa (liên quan đến tiền)
r.post('/coupons', ...guardAdmin, adminAudit, CouponCtrl.create);
r.patch('/coupons/:id', ...guardAdmin, adminAudit, CouponCtrl.update);
r.delete('/coupons/:id', ...guardAdmin, adminAudit, CouponCtrl.remove);

/** ===== Users ===== */
// Staff: Được xem danh sách (để hỗ trợ)
r.get('/users', ...guardStaff, listUsers); // ✅ Dùng hàm listUsers mới
// Admin: Chỉ admin được sửa (sửa vai trò) và khóa/mở
r.patch('/users/:id', ...guardAdmin, adminAudit, updateUser);
r.post('/users/:id/trigger-reset', ...guardAdmin, adminAudit, adminTriggerReset);
r.patch('/users/:id/lock', ...guardAdmin, adminAudit, lockUnlockUser);

/** ===== Orders ===== */
// Staff: Được xem, cập nhật trạng thái, thêm note, duyệt/từ chối HỦY
r.get('/orders', ...guardStaff, OrdersCtrl.list);
r.patch('/orders/:id/status', ...guardStaff, adminAudit, OrdersCtrl.updateStatus);
r.post('/orders/:id/notes', ...guardStaff, adminAudit, addOrderNote);
r.post('/orders/:id/cancel/approve', ...guardStaff, adminAudit, approveCancel);
r.post('/orders/:id/cancel/reject', ...guardStaff, adminAudit, rejectCancel);
// Admin: Chỉ admin được HOÀN TIỀN (rất nhạy cảm)
r.post('/orders/:id/refund', ...guardAdmin, adminAudit, refundOrder);

/** ===== RMA (Đổi trả) ===== */
// Staff: Xử lý nghiệp vụ đổi trả
r.get('/rmas', ...guardStaff, RMACtrl.list);
r.patch('/rmas/:id', ...guardStaff, adminAudit, RMACtrl.update);

r.get('/banners', ...guardAdmin, BannerCtrl.list);
r.post('/banners', ...guardAdmin, adminAudit, BannerCtrl.create);
r.patch('/banners/:id', ...guardAdmin, adminAudit, BannerCtrl.update);
r.delete('/banners/:id', ...guardAdmin, adminAudit, BannerCtrl.remove);
/** ===== Posts (Blog) ===== */
// Staff: Cho phép staff viết bài
r.use('/posts', guardStaff, postsAdminRoutes);

export default r;