// backend/src/routes/payments.js
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { bankInfo, markPaidManual } from '../controllers/payments/bankController.js';

const r = Router();



// Bank transfer
r.get('/bank/info', bankInfo);
r.post('/bank/:id/mark-paid', requireAdmin, markPaidManual);

export default r;
