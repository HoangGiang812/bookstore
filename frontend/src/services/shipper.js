import api from './api';

// Lấy danh sách đơn GIAO HÀNG
export const getTasks = () => api.get('/shipper/tasks');

// Lấy danh sách đơn LẤY HÀNG HOÀN (RMA)
export const getRMATasks = () => api.get('/shipper/rma-tasks');

// --- HÀNH ĐỘNG GIAO HÀNG ---
export const pickupOrder = (id) => api.post(`/shipper/tasks/${id}/pickup`);
export const completeOrder = (id, data) => api.post(`/shipper/tasks/${id}/complete`, data);
export const failOrder = (id, data) => api.post(`/shipper/tasks/${id}/fail`, data);
export const retryOrder = (id) => api.post(`/shipper/tasks/${id}/retry`);
export const returnWarehouse = (id) => api.post(`/shipper/tasks/${id}/return`);

// --- HÀNH ĐỘNG LẤY HÀNG HOÀN ---
export const pickupRMA = (id) => api.post(`/shipper/rma-tasks/${id}/pickup`);
export const dropoffRMA = (id) => api.post(`/shipper/rma-tasks/${id}/dropoff`);