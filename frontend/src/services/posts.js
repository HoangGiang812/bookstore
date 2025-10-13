// File: frontend/src/services/posts.js (ĐÃ CẬP NHẬT)

import api from './api';

/**
 * Lấy danh sách tất cả bài viết đã xuất bản
 * @returns {Promise<Array>}
 */
export async function fetchPosts() {
  try {
    // isPublic: true để không gửi token cho request công khai này
    const data = await api.get('/posts', { isPublic: true });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Lỗi khi tải danh sách bài viết:", error);
    throw error;
  }
}

/**
 * Lấy chi tiết một bài viết bằng slug
 * @param {string} slug
 * @returns {Promise<Object>}
 */
export async function fetchPostBySlug(slug) {
  try {
    const data = await api.get(`/posts/${slug}`, { isPublic: true });
    return data;
  } catch (error) {
    console.error(`Lỗi khi tải bài viết với slug ${slug}:`, error);
    throw error;
  }
}

/**
 * Lấy danh sách các bài viết liên quan
 * @param {string} slug
 * @returns {Promise<Array>}
 */
export async function fetchRelatedPosts(slug) {
  try {
    const data = await api.get(`/posts/${slug}/related`, { isPublic: true });
    // Đảm bảo luôn trả về một mảng, kể cả khi API trả về null/undefined
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Lỗi khi tải bài viết liên quan cho slug ${slug}:`, error);
    // Nếu có lỗi, trả về một mảng rỗng để không làm hỏng giao diện
    return [];
  }
}