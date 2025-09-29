// src/controller/authorController.js
// Dựa trên services: "@/services/author" phải cung cấp fetchAuthors(limit, start, q) & fetchAuthorBySlug(slug)

import { fetchAuthors, fetchAuthorBySlug } from "@/services/author";

/**
 * Lấy danh sách tác giả (phân trang + tìm kiếm).
 * @param {{page?:number, limit?:number, q?:string}} opts
 * @returns {Promise<Array>}
 */
export async function getAuthors({ page = 1, limit = 20, q = "" } = {}) {
  const safePage  = Math.max(1, Number(page)  || 1);
  const safeLimit = Math.max(1, Number(limit) || 20);
  const start = (safePage - 1) * safeLimit;

  try {
    const data = await fetchAuthors(safeLimit, start, String(q || "").trim());
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("[getAuthors] fetch failed:", err);
    return [];
  }
}

export async function getAuthor(slug) {
  if (!slug) return null;
  try {
    // encode để tránh lỗi slug có ký tự đặc biệt
    return await fetchAuthorBySlug(encodeURIComponent(String(slug)));
  } catch (err) {
    console.error("[getAuthor] fetch failed:", err);
    return null;
  }
}
