// backend/src/routes/payments.js
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { bankInfo, markPaidManual } from '../controllers/payments/bankController.js';
import { createMomoPayment, verifyMomoPayment } from '../controllers/payments/momoController.js';

const r = Router();



// Bank transfer
r.get('/bank/info', bankInfo);
r.post('/bank/:id/mark-paid', requireAdmin, markPaidManual);

// API tạo link thanh toán (Cần đăng nhập)
r.post('/momo/create', requireAuth, createMomoPayment);

// API xác thực kết quả (Cho phép gọi public hoặc auth tùy logic)
r.post('/momo/verify', verifyMomoPayment);

export default r;
