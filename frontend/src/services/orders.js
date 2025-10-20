// src/services/orders.js
import api from './api';

/* ===== ORDERS API (điểm gọi duy nhất) ===== */

// Tạo đơn
export const createOrder = (payload) =>
  api.post('/api/orders', payload);

// Danh sách đơn của tôi (hỗ trợ params: {status, limit, skip,...})
export const listOrders = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return api.get(`/api/orders/mine${q ? `?${q}` : ''}`);
};

// Chi tiết đơn của tôi
export const getOrder = (id) =>
  api.get(`/api/orders/mine/${id}`);

// Hủy đơn của tôi
export const cancelOrder = (id) =>
  api.post(`/api/orders/mine/${id}/cancel`);

// Gửi yêu cầu đổi/trả (RMA)
export const requestRMA = (id, reason) =>
  api.post(`/api/orders/mine/${id}/rma`, { reason });

/* ===== Theo dõi tiến trình & xác nhận thanh toán ===== */

// Lấy timeline theo dõi đơn (dùng cho Stepper)
export const tracking = async (id) => {
  const d = await api.get(`/api/orders/${id}/tracking`);
  return Array.isArray(d) ? d : (d?.events || []);
};

// Đánh dấu đã thanh toán (gọi ở trang return/payment-success)
export const capture = (id) =>
  api.post(`/api/orders/${id}/pay/capture`);

/* ===== ALIASES để tương thích code cũ (Cart.jsx, v.v.) ===== */
// Cart.jsx có thể đang import { create } từ services/orders.js
export const create = createOrder;
export const list   = listOrders;
export const cancel = cancelOrder;
export const rma    = requestRMA;
// ✅ alias cho AccountReviews.jsx: Orders.mine({ status: 'delivered' })
export const mine   = listOrders;
