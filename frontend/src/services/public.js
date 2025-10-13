// File: frontend/src/services/public.js

import api from './api'; // Import api client đã có của bạn

/**
 * Lấy nội dung trang tĩnh từ backend bằng slug
 * @param {string} slug - Slug của trang (ví dụ: 'about')
 * @returns {Promise<Object>}
 */
export const fetchPageBySlug = async (slug) => {
  try {
    // Thêm tùy chọn { isPublic: true } để báo cho api client không gửi token
    // Đây là cách làm đúng nhất dựa trên cấu trúc file api.js của bạn
    const data = await api.get(`/public/pages/${slug}`, { isPublic: true });
    return data;
  } catch (error) {
    console.error("Lỗi khi tải trang công khai:", error);
    throw error; // Ném lỗi ra để component xử lý
  }
};