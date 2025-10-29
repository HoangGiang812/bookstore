// backend/src/routes/orders.js
import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import {
  createOrder,
  myOrders,
  getMyOrder,
  cancelMyOrder,
  confirmReceived,
  trackingMyOrder,
  captureMyPayment,
  withdrawCancelMyOrder,
  updateMyShippingAddress,
} from '../controllers/orderController.js';
import { requestRMA } from '../controllers/rmaController.js';

const r = Router();

// Create + mine
r.post('/', requireAuth, createOrder);
r.get('/mine', requireAuth, myOrders);
r.get('/mine/:id', requireAuth, getMyOrder);

// Edit shipping address (pending/processing)
r.patch('/mine/:id/address', requireAuth, updateMyShippingAddress);

// Cancel / withdraw cancel
r.post('/mine/:id/cancel', requireAuth, cancelMyOrder);
r.post('/mine/:id/cancel/withdraw', requireAuth, withdrawCancelMyOrder);

// RMA
r.post('/mine/:id/rma', requireAuth, requestRMA);

// Buyer confirm received
r.post('/mine/:id/confirm', requireAuth, confirmReceived);

// Timeline
r.get('/mine/:id/tracking', requireAuth, trackingMyOrder);

// (Optional) capture payment (used by return pages)
r.post('/mine/:id/pay/capture', requireAuth, captureMyPayment);

export default r;
