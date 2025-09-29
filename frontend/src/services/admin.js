// src/services/admin.js
import api from './api';

/* ===========================
 * 2.1 Tổng quan
 * =========================== */
export const overview = (params) =>
  api.get('/admin/overview', { params }); // range=day|week|month...

/* ===========================
 * 2.2 Sản phẩm (Books)
 * - BE tự sinh: code, slug, isbn
 * - FE đảm bảo: discountPercent >= 0
 * - status: 'available' | 'out-of-stock'
 * =========================== */

export const listBooks = (params) =>
  api.get('/admin/books', { params }); // { items: [...] }

export const getBook = (id) =>
  api.get(`/admin/books/${id}`);

export const createBook = (payload) => {
  // FE chỉ gửi các field cần thiết; BE tự xử lý authorName -> Author & bookCount
  const body = {
    ...payload,
    // Chuẩn hoá dữ liệu gửi lên
    title: String(payload?.title || '').trim(),
    authorName: String(payload?.authorName || '').trim(),
    price: Number(payload?.price || 0),
    discountPercent: Math.max(0, Number(payload?.discountPercent || 0)),
    stock: Math.max(0, Number(payload?.stock || 0)),
    coverUrl: String(payload?.coverUrl || '').trim(),
    // Nếu không truyền status, BE tự suy theo stock; vẫn set rõ ràng:
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

/**
 * Nhập kho: ưu tiên endpoint chuyên dụng /intake.
 * Nếu BE chưa có /intake, fallback: đọc stock hiện tại rồi cộng và update.
 */
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

/* ===========================
 * 2.2 Catalog: Categories / Authors / Publishers
 * =========================== */

export const categories = {
  list: (params) => api.get('/admin/categories', { params }),
  create: (payload) => api.post('/admin/categories', payload),
  get: (id) => api.get(`/admin/categories/${id}`),
  update: (id, payload) => api.patch(`/admin/categories/${id}`, payload),
  remove: (id) => api.delete(`/admin/categories/${id}`),
};

/**
 * LƯU Ý: routes authors của BE là /api/authors (không phải /api/admin/authors)
 * - list/search: GET /authors?q=...
 * - get:        GET /authors/id/:id  hoặc GET /authors/:slug
 * - create:     POST /authors        (yêu cầu quyền admin ở server)
 * - update:     PATCH /authors/:idOrSlug
 * - remove:     DELETE /authors/:idOrSlug
 */
export const authors = {
  // dùng cho autocomplete: params = { q, limit, start }
  list: (params) => api.get('/authors', { params }),
  search: (q, extra = {}) =>
    api.get('/authors', { params: { q, ...(extra || {}) } }),
  create: (payload) => api.post('/authors', payload),
  // get theo id (phù hợp với FE hiện tại)
  get: (id) => api.get(`/authors/id/${id}`),
  // nếu bạn dùng slug:
  getBySlug: (slug) => api.get(`/authors/${encodeURIComponent(slug)}`),
  update: (idOrSlug, payload) => api.patch(`/authors/${idOrSlug}`, payload),
  remove: (idOrSlug) => api.delete(`/authors/${idOrSlug}`),
};

export const publishers = {
  list: (params) => api.get('/admin/publishers', { params }),
  create: (payload) => api.post('/admin/publishers', payload),
  get: (id) => api.get(`/admin/publishers/${id}`),
  update: (id, payload) => api.patch(`/admin/publishers/${id}`, payload),
  remove: (id) => api.delete(`/admin/publishers/${id}`),
};

/* ===========================
 * 2.3 Đơn hàng & 2.4 Thanh toán/Hoàn tiền
 * =========================== */

export const orders = {
  list: (params) => api.get('/admin/orders', { params }), // q, status, from, to, customer
  updateStatus: (id, status, payload = {}) =>
    api.patch(`/admin/orders/${id}/status`, { status, ...payload }),
};

/* ===========================
 * 2.3 RMA
 * =========================== */

export const rma = {
  list: (params) => api.get('/admin/rmas', { params }),
  update: (id, payload) => api.patch(`/admin/rmas/${id}`, payload),
};

/* ===========================
 * 2.5 Mã giảm giá
 * =========================== */

export const coupons = {
  list: (params) => api.get('/admin/coupons', { params }),
  create: (payload) => api.post('/admin/coupons', payload),
  update: (id, payload) => api.patch(`/admin/coupons/${id}`, payload),
  remove: (id) => api.delete(`/admin/coupons/${id}`),
};

/* ===========================
 * 2.6 Người dùng & phân quyền
 * =========================== */

export const users = {
  list: (params) => api.get('/admin/users', { params }),
  update: (id, payload) => api.patch(`/admin/users/${id}`, payload), // lock/unlock, role
};

/* ===========================
 * 2.7 Nội dung
 * =========================== */

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

/* ===========================
 * 2.7 Cấu hình
 * =========================== */

export const settings = {
  get: () => api.get('/admin/settings'),
  update: (payload) => api.put('/admin/settings', payload),
};
