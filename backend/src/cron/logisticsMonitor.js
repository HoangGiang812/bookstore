import cron from 'node-cron';
import { Order } from '../models/Order.js';
import { RMA } from '../models/RMA.js';

// --- CẤU HÌNH THỜI GIAN (Config) ---
// Thời gian cho phép Shipper giữ đơn mà chưa lấy (Ví dụ: 2 tiếng)
const MAX_HOLD_TIME = 2 * 60 * 60 * 1000; 

// Thời gian đơn nằm chờ trên chợ chưa ai nhận (Ví dụ: 30 phút)
const MAX_WAIT_POOL_TIME = 30 * 60 * 1000; 

export const startLogisticsCron = () => {
    // Chạy quét mỗi 5 phút một lần
    cron.schedule('*/5 * * * *', async () => { 
        console.log('🕵️ [CRON] Đang quét hệ thống vận đơn...');
        await revokeStuckTasks();  // 1. Thu hồi đơn bị ngâm
        await flagUrgentTasks();   // 2. Đánh dấu đơn ế
    });
};

// ---------------------------------------------------------
// 1. CHỨC NĂNG THU HỒI ĐƠN BỊ NGÂM (Revoke)
// ---------------------------------------------------------
const revokeStuckTasks = async () => {
    const deadline = new Date(Date.now() - MAX_HOLD_TIME);

    // A. Quét Đơn Giao Hàng (Order)
    // Điều kiện: Đã gán/Chờ lấy (assigned/ready_to_pick) NHƯNG update lần cuối quá lâu
    const stuckOrders = await Order.find({
        status: { $in: ['assigned', 'ready_to_pick'] },
        updatedAt: { $lt: deadline }, 
        'shipping.shipperId': { $ne: null }
    });

    if (stuckOrders.length > 0) {
        console.log(`⚠️ Thu hồi ${stuckOrders.length} đơn giao hàng bị ngâm.`);
        for (const o of stuckOrders) {
            o.status = 'processing'; // Trả về trạng thái Chờ xử lý (lên Chợ)
            o.shipping.shipperId = null; // Xóa shipper
            o.shipping.status = 'pending';
            o.history.unshift({
                at: new Date(), type: 'system_revoke', by: 'SYSTEM',
                note: 'Hệ thống thu hồi đơn do Shipper không đi lấy hàng quá thời hạn.'
            });
            await o.save();
        }
    }

    // B. Quét Đơn Đổi Trả (RMA)
    // Điều kiện: Đang đi lấy (picking) NHƯNG update lần cuối quá lâu
    const stuckRMAs = await RMA.find({
        status: 'picking',
        updatedAt: { $lt: deadline },
        returnShipperId: { $ne: null }
    });

    if (stuckRMAs.length > 0) {
        console.log(`⚠️ Thu hồi ${stuckRMAs.length} đơn RMA bị ngâm.`);
        for (const r of stuckRMAs) {
            r.status = 'approved'; // Trả về trạng thái Duyệt (lên Chợ RMA)
            r.returnShipperId = null; // Xóa shipper
            r.adminNote = 'Hệ thống thu hồi do Shipper chậm trễ.';
            await r.save();
            
            // Đồng bộ sang Order
            await Order.findByIdAndUpdate(r.orderId, { rmaStatus: 'approved' });
        }
    }
};

// ---------------------------------------------------------
// 2. CHỨC NĂNG ĐÁNH DẤU ĐƠN "Ế" (Urgent Flag)
// ---------------------------------------------------------
const flagUrgentTasks = async () => {
    const deadline = new Date(Date.now() - MAX_WAIT_POOL_TIME);

    // A. Đơn Giao Hàng Ế
    // Điều kiện: Đang processing (trên chợ) + Tạo lâu rồi + Chưa gắn cờ Urgent
    await Order.updateMany(
        { 
            status: 'processing', 
            createdAt: { $lt: deadline },
            isUrgent: { $ne: true }
        },
        { 
            $set: { isUrgent: true },
            $push: { history: { at: new Date(), type: 'system_alert', by: 'SYSTEM', note: 'Đơn chờ quá lâu -> Đánh dấu Gấp.' } }
        }
    );

    // B. Đơn RMA Ế
    // RMA chưa có field isUrgent thì bạn có thể thêm vào Model RMA, hoặc dùng logic tương tự
    const staleRMAs = await RMA.find({
        status: 'approved',
        createdAt: { $lt: deadline },
        isUrgent: { $ne: true }
    });

    if (staleRMAs.length > 0) {
        console.log(`🚨 Có ${staleRMAs.length} đơn RMA ế khách. Đánh dấu khẩn cấp!`);
        
        // Cập nhật hàng loạt
        await RMA.updateMany(
            { _id: { $in: staleRMAs.map(r => r._id) } },
            { 
                $set: { isUrgent: true }
                // RMA có thể không có field history phức tạp như Order, nếu có thì push vào, không thì thôi.
            }
        );
    }
};