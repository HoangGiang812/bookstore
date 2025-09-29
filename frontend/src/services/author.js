// src/services/author.js
const BASE = '/api';

/** API kiểu object (giữ nguyên để nơi khác có thể dùng) */
export const AuthorService = {
  async search(q, { signal } = {}) {
    const url = new URL(`${BASE}/authors`, window.location.origin);
    if (q) url.searchParams.set('q', q);
    const res = await fetch(url.toString(), { signal });
    if (!res.ok) throw new Error('Failed to search authors');
    return res.json();
  },

  async getById(id) {
    const res = await fetch(`${BASE}/authors/id/${id}`);
    if (!res.ok) throw new Error('Author not found');
    return res.json();
  },

  async getBySlug(slug) {
    const res = await fetch(`${BASE}/authors/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error('Author not found');
    return res.json();
  },
};

/** ============
 *  Exports tương thích code cũ
 *  - Authors.jsx đang import { fetchAuthors }
 *  - AuthorDetail helpers có thể dùng { fetchAuthorBySlug }
 * ============ */

/**
 * Lấy danh sách tác giả (limit, start, q)
 * Trả về mảng authors
 */
export async function fetchAuthors(limit = 20, start = 0, q = '') {
  const params = new URLSearchParams();
  params.set('limit', String(Math.max(1, Number(limit) || 20)));
  params.set('start', String(Math.max(0, Number(start) || 0)));
  if (q) params.set('q', String(q).trim());

  const res = await fetch(`${BASE}/authors?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch authors');
  return res.json();
}

/**
 * Lấy tác giả theo slug
 */
export async function fetchAuthorBySlug(slug) {
  if (!slug) throw new Error('Missing slug');
  const res = await fetch(`${BASE}/authors/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error('Author not found');
  return res.json();
}

export default AuthorService;
