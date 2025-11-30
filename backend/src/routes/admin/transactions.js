import { Router } from 'express';
import { listTransactions } from '../../controllers/admin/transactionAdminController.js';

const router = Router();
router.get('/', listTransactions);
export default router;