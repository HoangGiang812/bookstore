// src/controller/orderController.js
import * as Orders from '../services/orders';

/**
 * Wrapper để giữ tương thích code FE cũ:
 * - Các hàm vẫn nhận (userId, ...) nhưng thực tế không cần userId ở FE nữa.
 * - Nếu FE cũ đang import từ file này, không cần sửa nơi khác.
 */

// Tạo đơn
export const create  = (_userId, payload)       => Orders.createOrder(payload);

// Danh sách đơn của tôi (có thể truyền params {status,...} nếu muốn lọc từ BE)
export const list    = (_userId, params = {})   => Orders.listOrders(params);

// Hủy đơn
export const cancel  = (_userId, id)            => Orders.cancelOrder(id);

// Yêu cầu đổi/trả
export const rma     = (_userId, id, reason)    => Orders.requestRMA(id, reason);

// NEW: tracking & capture để hiển thị tiến trình sau thanh toán
export const tracking = (id)                    => Orders.tracking(id);
export const capture  = (id)                    => Orders.capture(id);
