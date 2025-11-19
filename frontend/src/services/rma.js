import api from './api'; 

// GET /api/admin/rma
// Lấy danh sách yêu cầu đổi trả
export const list = (params = {}) => {
  return api.get('/admin/rma', { params });
};

// PATCH /api/admin/rma/:id
// Cập nhật trạng thái (Duyệt/Từ chối/Hoàn tất)
export const update = (id, payload) => {
  // payload ví dụ: { status: 'approved' }
  return api.patch(`/admin/rma/${id}`, payload);
};