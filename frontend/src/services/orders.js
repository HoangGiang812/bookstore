// src/services/orders.js
import api from './api';

/* ===== ORDERS API ===== */

// Tạo đơn
export const createOrder = (payload) =>
  api.post('/api/orders', payload);

// Danh sách đơn của tôi (params: { status, limit, skip, ... })
export const listOrders = (params = {}) =>
  api.get('/api/orders/mine', { params });

// Chi tiết đơn của tôi
export const getOrder = (id) =>
  api.get(`/api/orders/mine/${id}`);

/* ===== Hủy / Yêu cầu hủy / Rút yêu cầu hủy ===== */

// Hủy đơn của tôi (pending & chưa thanh toán → huỷ ngay; ngược lại → tạo yêu cầu huỷ)
export const cancelOrder = (id, reasonOrData = '') => {
  const body = typeof reasonOrData === 'string'
    ? { reason: reasonOrData }
    : (reasonOrData || {});
  return api.post(`/api/orders/mine/${id}/cancel`, body);
};

// Rút yêu cầu huỷ (khi đang cancel_requested)
export const withdrawCancel = (id) =>
  api.post(`/api/orders/mine/${id}/cancel/withdraw`);

/* ===== Cập nhật địa chỉ (pending|processing) ===== */

export const updateAddress = (id, addr) =>
  api.patch(`/api/orders/mine/${id}/address`, addr);

/* ===== RMA (đổi/trả) ===== */

export const requestRMA = (id, reason) =>
  api.post(`/api/orders/mine/${id}/rma`, { reason });

/* ===== Theo dõi tiến trình & xác nhận ===== */

// Lấy timeline theo dõi đơn (BE route: GET /api/orders/:id/tracking)
export const tracking = async (id) => {
  const d = await api.get(`/api/orders/${id}/tracking`);
  return Array.isArray(d) ? d : (d?.events || []);
};

// KH xác nhận "Đã nhận hàng" -> completed
export const confirmReceived = (id) =>
  api.post(`/api/orders/mine/${id}/confirm`);

// (Tuỳ chọn) Capture thanh toán (BE route: POST /api/orders/:id/pay/capture)
export const capture = (id) =>
  api.post(`/api/orders/${id}/pay/capture`);

/* ===== ALIASES để tương thích code cũ (Cart.jsx, v.v.) ===== */
export const create = createOrder;
export const list   = listOrders;
export const cancel = cancelOrder;
export const rma    = requestRMA;
// alias cho nơi gọi Orders.mine(...)
export const mine   = listOrders;
