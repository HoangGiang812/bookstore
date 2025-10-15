// frontend/src/services/admin.js
import api from './api';

export const overview = (params) =>
  api.get('/admin/overview', { params });

/* =========================
 * Books (Admin)
 * ========================= */
export const listBooks = (params) =>
  api.get('/admin/books', { params });

export const getBook = (id) =>
  api.get(`/admin/books/${id}`);

export const createBook = (payload) => {
  const body = {
    ...payload,
    title: String(payload?.title || '').trim(),
    authorName: String(payload?.authorName || '').trim(),
    price: Number(payload?.price || 0),
    discountPercent: Math.max(0, Number(payload?.discountPercent || 0)),
    stock: Math.max(0, Number(payload?.stock || 0)),
    coverUrl: String(payload?.coverUrl || '').trim(),
    status:
      payload?.status === 'out-of-stock'
        ? 'out-of-stock'
        : (Number(payload?.stock) > 0 ? 'available' : 'out-of-stock'),
  };
  return api.post('/admin/books', body);
};

export const updateBook = (id, payload) => {
  const body = {
    ...payload,
    ...(payload?.title !== undefined ? { title: String(payload.title).trim() } : {}),
    ...(payload?.authorName !== undefined ? { authorName: String(payload.authorName).trim() } : {}),
    ...(payload?.price !== undefined ? { price: Math.max(0, Number(payload.price)) } : {}),
    discountPercent: Math.max(0, Number(payload?.discountPercent || 0)),
    ...(payload?.stock !== undefined ? { stock: Math.max(0, Number(payload.stock)) } : {}),
    ...(payload?.coverUrl !== undefined ? { coverUrl: String(payload.coverUrl).trim() } : {}),
    ...(payload?.status
      ? { status: payload.status === 'out-of-stock' ? 'out-of-stock' : 'available' }
      : {}),
  };
  return api.patch(`/admin/books/${id}`, body);
};

export const deleteBook = (id) =>
  api.delete(`/admin/books/${id}`);

export const toggleBookFlags = (id, payload) =>
  api.patch(`/admin/books/${id}`, payload);

export const stockIntake = async (bookId, qty, note) => {
  try {
    return await api.post(`/admin/books/${bookId}/intake`, { qty, note });
  } catch (e) {
    const b = await getBook(bookId);
    const current = Number(b?.stock || 0);
    const next = Math.max(0, current + Number(qty || 0));
    return updateBook(bookId, { stock: next, lastStockNote: note });
  }
};

/* =========================
 * Categories (Public Admin UI → /api/categories)
 * ========================= */
export const categories = {
  list: (params) => api.get('/categories', { params }),
  create: (payload) => api.post('/categories', payload),
  get: (id) => api.get(`/categories/${id}`),
  update: (id, payload) => api.patch(`/categories/${id}`, payload),
  remove: (id) => api.delete(`/categories/${id}`),
};

/* =========================
 * Authors (Public endpoints)
 * ========================= */
export const authors = {
  list: (params) => api.get('/authors', { params }),
  search: (q, extra = {}) =>
    api.get('/authors', { params: { q, ...(extra || {}) } }),
  create: (payload) => api.post('/authors', payload),
  get: (id) => api.get(`/authors/id/${id}`),
  getBySlug: (slug) => api.get(`/authors/${encodeURIComponent(slug)}`),
  update: (idOrSlug, payload) => api.patch(`/authors/${idOrSlug}`, payload),
  remove: (idOrSlug) => api.delete(`/authors/${idOrSlug}`),
};

/* =========================
 * Publishers (Admin)
 * ========================= */
export const publishers = {
  list: (params) => api.get('/admin/publishers', { params }),
  create: (payload) => api.post('/admin/publishers', payload),
  get: (id) => api.get(`/admin/publishers/${id}`),
  update: (id, payload) => api.patch(`/admin/publishers/${id}`, payload),
  remove: (id) => api.delete(`/admin/publishers/${id}`),
};

/* =========================
 * Orders / RMA / Coupons / Users / Content / Settings
 * ========================= */
export const orders = {
  list: (params) => api.get('/admin/orders', { params }),
  updateStatus: (id, status, payload = {}) =>
    api.patch(`/admin/orders/${id}/status`, { status, ...payload }),
};

export const rma = {
  list: (params) => api.get('/admin/rmas', { params }),
  update: (id, payload) => api.patch(`/admin/rmas/${id}`, payload),
};

export const coupons = {
  list: (params) => api.get('/admin/coupons', { params }),
  create: (payload) => api.post('/admin/coupons', payload),
  update: (id, payload) => api.patch(`/admin/coupons/${id}`, payload),
  remove: (id) => api.delete(`/admin/coupons/${id}`),
};

export const users = {
  list: (params) => api.get('/admin/users', { params }),
  update: (id, payload) => api.patch(`/admin/users/${id}`, payload),
};

export const banners = {
  list: () => api.get('/admin/banners'),
  create: (payload) => api.post('/admin/banners', payload),
  update: (id, payload) => api.patch(`/admin/banners/${id}`, payload),
  remove: (id) => api.delete(`/admin/banners/${id}`),
};

export const pages = {
  list: () => api.get('/admin/pages'),
  create: (payload) => api.post('/admin/pages', payload),
  update: (id, payload) => api.patch(`/admin/pages/${id}`, payload),
  remove: (id) => api.delete(`/admin/pages/${id}`),
};

export const settings = {
  get: () => api.get('/admin/settings'),
  update: (payload) => api.put('/admin/settings', payload),
};
