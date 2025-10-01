import api from './api';

export const create = (payload) => api.post('/api/orders', payload);

export const mine = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return api.get(`/api/orders/mine${q ? ('?' + q) : ''}`);
};

export const detail = (id) => api.get(`/api/orders/mine/${id}`);

export const cancel = (id) => api.post(`/api/orders/mine/${id}/cancel`);

export const requestRMA = (id, payload) => api.post(`/api/orders/mine/${id}/rma`, payload);
