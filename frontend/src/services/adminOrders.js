import api from './api';

// Duyệt/Từ chối yêu cầu huỷ (đổi URL nếu BE khác)
export const approveCancel = async (orderId, note='') => {
  try { return await api.patch(`/admin/orders/${orderId}/cancel/approve`, { note }); }
  catch { return await api.patch(`/orders/${orderId}/cancel/approve`, { note }); }
};

export const rejectCancel = async (orderId, reason='') => {
  try { return await api.patch(`/admin/orders/${orderId}/cancel/reject`, { reason }); }
  catch { return await api.patch(`/orders/${orderId}/cancel/reject`, { reason }); }
};
