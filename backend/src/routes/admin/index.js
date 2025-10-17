import { Router } from 'express';
import { attachUserFromToken, requireAuth, requireRoles } from '../../middlewares/auth.js';
import { adminAudit } from '../../middlewares/audit.js';

// CRUD gộp (bạn đang có sẵn)
import {
  CategoryCtrl, AuthorCtrl, PublisherCtrl,
  BannerCtrl, PageCtrl, CouponCtrl, UsersCtrl, OrdersCtrl, RMACtrl
} from '../../controllers/admin/entityController.js';

import { upload, importBooksCSV } from '../../controllers/admin/bookImportController.js';

import { dashboardKpis } from '../../controllers/admin/dashboardController.js';
import { addOrderNote, refundOrder } from '../../controllers/admin/orderAdminController.js';
import { lockUnlockUser } from '../../controllers/admin/userAdminController.js';
import { couponUsages, pauseCoupon, resumeCoupon } from '../../controllers/admin/couponController.js';

import { 
  listBooks, getBook, createBook, updateBook, removeBook, intake, uploadCover 
} from '../../controllers/admin/bookAdminController.js';

import postsAdminRoutes from './posts.js';

const r = Router();
const guard = [requireAuth, requireRoles('admin', 'staff')];

// attach user
r.use(attachUserFromToken);

// Dashboard
r.get('/dashboard', ...guard, dashboardKpis);

/** ===== Books =====
 *  Quan trọng: path tĩnh đứng trước '/books/:id'
 */
r.get('/books', ...guard, listBooks);

// path tĩnh trước:
r.post('/books/upload-cover', ...guard, adminAudit, ...uploadCover);
r.post('/books/import', ...guard, adminAudit, upload.single('file'), importBooksCSV);

r.post('/books', ...guard, adminAudit, createBook);
r.get('/books/:id', ...guard, getBook);
r.patch('/books/:id', ...guard, adminAudit, updateBook);
r.delete('/books/:id', ...guard, adminAudit, removeBook);
r.post('/books/:id/intake', ...guard, adminAudit, intake);

// Categories
r.get('/categories', ...guard, CategoryCtrl.list);
r.post('/categories', ...guard, adminAudit, CategoryCtrl.create);
r.get('/categories/:id', ...guard, CategoryCtrl.get);
r.patch('/categories/:id', ...guard, adminAudit, CategoryCtrl.update);
r.delete('/categories/:id', ...guard, adminAudit, CategoryCtrl.remove);

// Authors
r.get('/authors', ...guard, AuthorCtrl.list);
r.post('/authors', ...guard, adminAudit, AuthorCtrl.create);
r.get('/authors/:id', ...guard, AuthorCtrl.get);
r.patch('/authors/:id', ...guard, adminAudit, AuthorCtrl.update);
r.delete('/authors/:id', ...guard, adminAudit, AuthorCtrl.remove);

// Publishers
r.get('/publishers', ...guard, PublisherCtrl.list);
r.post('/publishers', ...guard, adminAudit, PublisherCtrl.create);
r.get('/publishers/:id', ...guard, PublisherCtrl.get);
r.patch('/publishers/:id', ...guard, adminAudit, PublisherCtrl.update);
r.delete('/publishers/:id', ...guard, adminAudit, PublisherCtrl.remove);

// Banners
r.get('/banners', ...guard, BannerCtrl.list);
r.post('/banners', ...guard, adminAudit, BannerCtrl.create);
r.patch('/banners/:id', ...guard, adminAudit, BannerCtrl.update);
r.delete('/banners/:id', ...guard, adminAudit, BannerCtrl.remove);

// Pages
r.get('/pages', ...guard, PageCtrl.list);
r.post('/pages', ...guard, adminAudit, PageCtrl.create);
r.patch('/pages/:id', ...guard, adminAudit, PageCtrl.update);
r.delete('/pages/:id', ...guard, adminAudit, PageCtrl.remove);

// Coupons CRUD
r.get('/coupons', ...guard, CouponCtrl.list);
r.post('/coupons', ...guard, adminAudit, CouponCtrl.create);
r.patch('/coupons/:id', ...guard, adminAudit, CouponCtrl.update);
r.delete('/coupons/:id', ...guard, adminAudit, CouponCtrl.remove);

// Coupons actions
r.get('/coupons/:id/usages', ...guard, couponUsages);
r.post('/coupons/:id/pause', ...guard, adminAudit, pauseCoupon);
r.post('/coupons/:id/resume', ...guard, adminAudit, resumeCoupon);

// Users
r.get('/users', ...guard, UsersCtrl.list);
r.patch('/users/:id', ...guard, adminAudit, UsersCtrl.update);
r.patch('/users/:id/lock', ...guard, adminAudit, lockUnlockUser);

// Orders
r.get('/orders', ...guard, OrdersCtrl.list);
r.patch('/orders/:id/status', ...guard, adminAudit, OrdersCtrl.updateStatus);
r.post('/orders/:id/notes', ...guard, adminAudit, addOrderNote);
r.post('/orders/:id/refund', ...guard, adminAudit, refundOrder);

// RMA
r.get('/rmas', ...guard, RMACtrl.list);
r.patch('/rmas/:id', ...guard, adminAudit, RMACtrl.update);


r.use('/posts', postsAdminRoutes);

export default r;
