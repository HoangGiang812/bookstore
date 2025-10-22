// File: src/routes/coupon.js
import { Router } from 'express';
import { validateCoupon } from '../controllers/couponController.js';
import { attachUserFromToken } from '../middlewares/auth.js';

const router = Router();

// Định nghĩa route, ví dụ: POST /api/coupon/validate
// (Tiền tố /api/coupon sẽ được định nghĩa ở file server.js)
router.post('/validate', attachUserFromToken, validateCoupon);

export default router;