// src/services/orders.js
import api from './api';

/* ===== ORDERS API (điểm gọi duy nhất) ===== */

// Tạo đơn
export const createOrder = (payload) =>
  api.post('/api/orders', payload);

// Danh sách đơn của tôi (hỗ trợ params: {status, limit, skip,...})
export const listOrders = (params = {}) =>
  api.get('/api/orders/mine', { params });

// Chi tiết đơn của tôi
export const getOrder = (id) =>
  api.get(`/api/orders/mine/${id}`);

// Hủy đơn của tôi
export const cancelOrder = (id, data = {}) =>
  api.post(`/api/orders/mine/${id}/cancel`, data);

// Gửi yêu cầu đổi/trả (RMA)
export const requestRMA = (id, reason) =>
  api.post(`/api/orders/mine/${id}/rma`, { reason });

/* ===== Theo dõi tiến trình & xác nhận ===== */

// Lấy timeline theo dõi đơn (dùng cho Stepper)
export const tracking = async (id) => {
  const d = await api.get(`/api/orders/mine/${id}/tracking`);
  // BE trả { events: [...] }
  return Array.isArray(d) ? d : (d?.events || []);
};

// KH xác nhận "Đã nhận hàng" -> completed
export const confirmReceived = (id) =>
  api.post(`/api/orders/mine/${id}/confirm`);

/* ===== (Tuỳ chọn) Capture thanh toán =====
   Với VNPay/MoMo: BE đã tự đánh dấu 'paid' ở Return/IPN -> FE KHÔNG CẦN gọi.
   Để tương thích code cũ (nếu có gọi Orders.capture), ta trả về trạng thái mới nhất của đơn.
*/
export const capture = async (id) => {
  try {
    const order = await getOrder(id);
    return { ok: 1, order };
  } catch (e) {
    return { ok: 0 };
  }
};

/* ===== ALIASES để tương thích code cũ (Cart.jsx, v.v.) ===== */
export const create = createOrder;
export const list   = listOrders;
export const cancel = cancelOrder;
export const rma    = requestRMA;
export const mine   = listOrders;
