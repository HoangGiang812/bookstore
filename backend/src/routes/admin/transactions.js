import { Router } from 'express';
// Đảm bảo import từ 'controller'
import { listTransactions } from '../../controllers/admin/transactionAdminController.js';

const router = Router();

// Route này chỉ GET
router.get('/', listTransactions);

// PHẢI CÓ DÒNG NÀY
export default router;