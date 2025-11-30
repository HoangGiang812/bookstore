// backend/src/cron/autoComplete.js
import { Order } from '../models/Order.js';

export const runAutoCompleteJob = async () => {
  try {
    // Tìm các đơn 'delivered' đã quá 3 ngày (3 * 24 * 60 * 60 * 1000 ms)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    
    const overdueOrders = await Order.find({
      status: 'delivered',
      deliveredAt: { $lt: threeDaysAgo } // Giao trước thời điểm 3 ngày trước
    });

    if (overdueOrders.length === 0) return;

    console.log(`[CRON] Tìm thấy ${overdueOrders.length} đơn cần hoàn tất tự động.`);

    for (const order of overdueOrders) {
      order.status = 'completed';
      order.completedAt = new Date();
      order.history.unshift({
        at: new Date(),
        type: 'completed',
        by: 'system',
        note: 'Tự động hoàn tất sau 3 ngày'
      });
      await order.save();
    }
    console.log(`[CRON] Đã hoàn tất ${overdueOrders.length} đơn hàng.`);
  } catch (e) {
    console.error("[CRON] Lỗi auto complete:", e);
  }
};