import { RMA } from '../models/RMA.js';
import { Order } from '../models/Order.js';
import mongoose from 'mongoose';

export async function requestRMA(req, res) {
  const orderId = req.params.id;
  // ✅ Lấy dữ liệu mới từ body
  const { type, items, customerNote, images, bankInfo } = req.body; 
  
  const order = await Order.findOne({ _id: orderId, userId: req.user._id });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  
  // Kiểm tra dữ liệu
  if (!['return', 'exchange'].includes(type)) {
    return res.status(400).json({ message: 'Invalid type' });
  }
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: 'Items are required' });
  }

  // Kiểm tra xem đã yêu cầu chưa
  const existingRMA = await RMA.findOne({ orderId: order._id, status: 'requested' });
  if (existingRMA) {
    return res.status(409).json({ message: 'Bạn đã gửi yêu cầu cho đơn này rồi.' });
  }

  if (type === 'return' && (!bankInfo?.bankName || !bankInfo?.accountNo || !bankInfo?.accountName)) {
      return res.status(400).json({ message: 'Vui lòng cung cấp thông tin ngân hàng để hoàn tiền.' });
  }

  // Lấy thông tin sách từ đơn hàng để điền vào RMA items
  const rmaItems = items.map(reqItem => {
    const orderItem = order.items.find(oi => 
      String(oi.bookId) === String(reqItem.bookId)
    );
    return {
      bookId: reqItem.bookId,
      title: orderItem ? orderItem.title : 'Unknown Book',
      qty: reqItem.qty,
      reason: reqItem.reason
    };
  });

  const rma = await RMA.create({
    orderId: new mongoose.Types.ObjectId(orderId),
    userId: req.user._id,
    type,
    status: 'requested',
    items: rmaItems,
    images: images || [],
    customerNote: customerNote,
    bankInfo: bankInfo,
    pickupAddress: order.shippingAddress
  });
  
  res.status(201).json(rma);
}