// src/services/payments.js
import api from './api';

/** Lấy thông tin chuyển khoản + QR cho 1 đơn hàng */
export const bankInfo = (orderId) =>
  api.get('/api/payments/bank/info', { params: { orderId } });

/** Admin xác nhận đã nhận tiền (đối soát thủ công) */
export const adminMarkBankPaid = (orderId) =>
  api.post(`/api/payments/bank/${orderId}/mark-paid`);
