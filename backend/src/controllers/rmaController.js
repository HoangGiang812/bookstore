import { RMA } from '../models/RMA.js';
import { Order } from '../models/Order.js';
import mongoose from 'mongoose';

export async function requestRMA(req, res) {
  const orderId = req.params.id;
  const { type, items, reason } = req.body;
  const order = await Order.findOne({ _id: orderId, userId: req.user._id });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (!['return', 'exchange', 'refund'].includes(type)) return res.status(400).json({ message: 'Invalid type' });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: 'No items' });

  const rma = await RMA.create({
    orderId: new mongoose.Types.ObjectId(orderId),
    userId: req.user._id,
    type,
    status: 'requested',
    items: items.map(it => ({ bookId: it.bookId, qty: it.qty, reason: it.reason || reason }))
  });
  res.status(201).json(rma);
}
