import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { createOrder, myOrders, getMyOrder, cancelMyOrder } from '../controllers/orderController.js';
import { requestRMA } from '../controllers/rmaController.js';

const r = Router();
r.post('/', requireAuth, createOrder);
r.get('/mine', requireAuth, myOrders);
r.get('/mine/:id', requireAuth, getMyOrder);
r.post('/mine/:id/cancel', requireAuth, cancelMyOrder);
r.post('/mine/:id/rma', requireAuth, requestRMA);
export default r;
