// backend/src/routes/orders.js
import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { createOrder, myOrders, getMyOrder, cancelMyOrder, confirmReceived, trackingMyOrder } from '../controllers/orderController.js';
import { requestRMA } from '../controllers/rmaController.js';

const r = Router();

r.post('/', requireAuth, createOrder);
r.get('/mine', requireAuth, myOrders);
r.get('/mine/:id', requireAuth, getMyOrder);
r.post('/mine/:id/cancel', requireAuth, cancelMyOrder);
r.post('/mine/:id/rma', requireAuth, requestRMA);

// NEW:
r.post('/mine/:id/confirm', requireAuth, confirmReceived);
r.get('/mine/:id/tracking', requireAuth, trackingMyOrder);

export default r;
