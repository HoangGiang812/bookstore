import { Order } from '../../models/Order.js';
import { Book } from '../../models/Book.js';
import { Transaction } from '../../models/Transaction.js';

export const addOrderNote = async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const note = { ts: new Date(), by: req.user?.name || req.user?.email, text };
  const order = await Order.findByIdAndUpdate(
    id,
    { $push: { notes: { $each: [note], $position: 0 } } },
    { new: true }
  ).lean();
  if (!order) return res.status(404).json({ message: 'order_not_found' });
  res.json(order);
};

export const refundOrder = async (req, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body;
  const order = await Order.findById(id);
  if (!order) return res.status(404).json({ message: 'order_not_found' });

  const newRefund = (order.refundAmount || 0) + Number(amount || 0);
  order.refundAmount = newRefund;
  order.paymentStatus = newRefund >= order.total ? 'refunded' : 'partial_refund';
  if (order.paymentStatus === 'refunded') {
    order.status = 'refunded';
    // trả tồn kho
    for (const it of order.items) {
      await Book.findByIdAndUpdate(it.product, { $inc: { stock: it.qty } });
    }
  }
  order.history.unshift({ ts: new Date(), type: 'refund', amount, reason, by: req.user?.name || 'system' });
  await order.save();

  await Transaction.create({
    order: order._id,
    type: 'refund',
    amount,
    status: 'succeeded',
    reason,
  });

  res.json(order.toObject());
};
