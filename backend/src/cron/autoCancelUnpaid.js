import { Order } from '../models/Order.js';
import { Book } from '../models/Book.js';

export const runAutoCancelJob = async () => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Tìm đơn treo quá 24h
    const staleOrders = await Order.find({
      status: 'pending',
      'payment.status': 'unpaid',
      'payment.method': { $ne: 'cod' }, // Không phải COD
      createdAt: { $lt: oneDayAgo }
    });

    if (staleOrders.length === 0) return;

    console.log(`[CRON] Tìm thấy ${staleOrders.length} đơn chưa thanh toán quá hạn.`);

    for (const order of staleOrders) {
      // 1. Hoàn tồn kho
      if (order.items) {
          const ops = order.items.map(it => ({
              updateOne: { filter: { _id: it.bookId }, update: { $inc: { stock: it.qty, soldCount: -it.qty } } }
          }));
          await Book.bulkWrite(ops);
      }

      // 2. Hủy đơn
      order.status = 'cancelled';
      order.cancelledAt = new Date();
      order.history.unshift({
        at: new Date(),
        type: 'cancelled',
        by: 'system',
        note: 'Tự động hủy do quá hạn thanh toán 24h'
      });
      await order.save();
    }
    console.log(`[CRON] Đã hủy tự động ${staleOrders.length} đơn.`);
  } catch (e) {
    console.error("[CRON] Auto Cancel Error:", e);
  }
};