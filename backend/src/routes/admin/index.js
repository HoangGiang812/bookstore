import { Router } from 'express';
// ✅ Import các "guards"
import { attachUserFromToken, requireAuth, requireRoles } from '../../middlewares/auth.js';
import { adminAudit } from '../../middlewares/audit.js';

// ... (import các controllers)
import { getSetting, updateSetting } from '../../controllers/admin/settingController.js';
import {
  CategoryCtrl, AuthorCtrl, PublisherCtrl,
  BannerCtrl, PageCtrl, CouponCtrl, UsersCtrl, OrdersCtrl, RMACtrl
} from '../../controllers/admin/entityController.js';

import { upload, importBooksCSV } from '../../controllers/admin/bookImportController.js';
import { dashboardKpis } from '../../controllers/admin/dashboardController.js';
import { OverviewCtrl } from '../../controllers/admin/overviewController.js';
import { 
  list, addOrderNote, refundOrder, approveCancel, rejectCancel, getShippersWithLoad, assignShipper
} from '../../controllers/admin/orderAdminController.js';

import { listUsers, lockUnlockUser } from '../../controllers/admin/userAdminController.js';
import { updateUser, adminTriggerReset } from '../../controllers/admin/userAdminController.js';

import { couponUsages, pauseCoupon, resumeCoupon } from '../../controllers/admin/couponController.js';
import { 
  listBooks, getBook, createBook, updateBook, removeBook, intake, uploadCover,
  toggleFeatured
} from '../../controllers/admin/bookAdminController.js';

// Import các route con
import collectionAdminRoutes from './collections.js';
import transactionAdminRoutes from './transactions.js';
import rmaAdminRoutes from './rma.js';
import postsAdminRoutes from './posts.js';

const r = Router();

// ✅ Định nghĩa 2 cấp độ "guard"
const guardStaff = [requireAuth, requireRoles('admin', 'staff')];
const guardAdmin = [requireAuth, requireRoles('admin')];

// Tất cả các route admin đều phải attach user trước
r.use(attachUserFromToken);

// Dashboard
r.get('/dashboard', ...guardStaff, dashboardKpis);
r.get('/overview', ...guardStaff, OverviewCtrl.overview);

/** ===== Books ===== */
// Staff: Được xem, sửa, cập nhật tồn kho, bật/tắt nổi bật
r.get('/books', ...guardStaff, listBooks);
r.get('/books/:id', ...guardStaff, getBook);
r.patch('/books/:id', ...guardStaff, adminAudit, updateBook);
r.post('/books/:id/intake', ...guardStaff, adminAudit, intake);
r.post('/books/upload-cover', ...guardStaff, adminAudit, ...uploadCover);
r.patch('/books/:id/toggle-featured', ...guardStaff, adminAudit, toggleFeatured); // ✅ Route cho nút Ngôi sao

// Admin: Chỉ admin được tạo, xóa, import
r.post('/books', ...guardAdmin, adminAudit, createBook);
r.delete('/books/:id', ...guardAdmin, adminAudit, removeBook);
r.post('/books/import', ...guardAdmin, adminAudit, upload.single('file'), importBooksCSV);
r.get('/settings/:key', ...guardAdmin, getSetting);
r.post('/settings/:key', ...guardAdmin, adminAudit, updateSetting);

/** ===== Content (Categories, Authors, Publishers) ===== */
r.get('/categories', ...guardStaff, CategoryCtrl.list);
r.post('/categories', ...guardStaff, adminAudit, CategoryCtrl.create);
r.get('/categories/:id', ...guardStaff, CategoryCtrl.get);
r.patch('/categories/:id', ...guardStaff, adminAudit, CategoryCtrl.update);
r.delete('/categories/:id', ...guardAdmin, adminAudit, CategoryCtrl.remove);

r.get('/authors', ...guardStaff, AuthorCtrl.list);
r.post('/authors', ...guardStaff, adminAudit, AuthorCtrl.create);
r.get('/authors/:id', ...guardStaff, AuthorCtrl.get);
r.patch('/authors/:id', ...guardStaff, adminAudit, AuthorCtrl.update);
r.delete('/authors/:id', ...guardAdmin, adminAudit, AuthorCtrl.remove);

r.get('/publishers', ...guardStaff, PublisherCtrl.list);
r.post('/publishers', ...guardStaff, adminAudit, PublisherCtrl.create);
r.get('/publishers/:id', ...guardStaff, PublisherCtrl.get);
r.patch('/publishers/:id', ...guardStaff, adminAudit, PublisherCtrl.update);
r.delete('/publishers/:id', ...guardAdmin, adminAudit, PublisherCtrl.remove);

/** ===== Admin System (Banners, Pages) ===== */
r.get('/banners', ...guardAdmin, BannerCtrl.list);
r.post('/banners', ...guardAdmin, adminAudit, BannerCtrl.create);
r.patch('/banners/:id', ...guardAdmin, adminAudit, BannerCtrl.update);
r.delete('/banners/:id', ...guardAdmin, adminAudit, BannerCtrl.remove);

r.get('/pages', ...guardAdmin, PageCtrl.list);
r.post('/pages', ...guardAdmin, adminAudit, PageCtrl.create);
r.patch('/pages/:id', ...guardAdmin, adminAudit, PageCtrl.update);
r.delete('/pages/:id', ...guardAdmin, adminAudit, PageCtrl.remove);

/** ===== Coupons ===== */
r.get('/coupons', ...guardStaff, CouponCtrl.list);
r.get('/coupons/:id/usages', ...guardStaff, couponUsages);
r.post('/coupons/:id/pause', ...guardStaff, adminAudit, pauseCoupon);
r.post('/coupons/:id/resume', ...guardStaff, adminAudit, resumeCoupon);
r.post('/coupons', ...guardAdmin, adminAudit, CouponCtrl.create);
r.patch('/coupons/:id', ...guardAdmin, adminAudit, CouponCtrl.update);
r.delete('/coupons/:id', ...guardAdmin, adminAudit, CouponCtrl.remove);

/** ===== Users ===== */
r.get('/users', ...guardStaff, listUsers);
r.patch('/users/:id', ...guardAdmin, adminAudit, updateUser);
r.post('/users/:id/trigger-reset', ...guardAdmin, adminAudit, adminTriggerReset);
r.patch('/users/:id/lock', ...guardAdmin, adminAudit, lockUnlockUser);

/** ===== Orders ===== */
r.get('/orders', ...guardStaff, list);
r.get('/shippers/load', ...guardStaff, getShippersWithLoad);
r.post('/orders/:id/assign', ...guardStaff, adminAudit, assignShipper);
r.patch('/orders/:id/status', ...guardStaff, adminAudit, OrdersCtrl.updateStatus);
r.post('/orders/:id/notes', ...guardStaff, adminAudit, addOrderNote);
r.post('/orders/:id/cancel/approve', ...guardStaff, adminAudit, approveCancel);
r.post('/orders/:id/cancel/reject', ...guardStaff, adminAudit, rejectCancel);
r.post('/orders/:id/refund', ...guardAdmin, adminAudit, refundOrder);

/** ===== Sub-Routes ===== */
// Blog
r.use('/posts', guardStaff, postsAdminRoutes);
// Bộ sưu tập
r.use('/collections', ...guardAdmin, adminAudit, collectionAdminRoutes);
// Giao dịch (Thanh toán & Hoàn tiền)
r.use('/transactions', ...guardAdmin, adminAudit, transactionAdminRoutes);
// Đổi/Trả (RMA)
r.use('/rma', ...guardAdmin, adminAudit, rmaAdminRoutes);

export default r;