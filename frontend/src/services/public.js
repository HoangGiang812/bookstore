
import api from './api'; 

/**
 * Lấy nội dung trang tĩnh từ backend bằng slug
 * @param {string} slug - Slug của trang (ví dụ: 'about')
 * @returns {Promise<Object>}
 */
export const fetchPageBySlug = async (slug) => {
  try {
    const data = await api.get(`/public/pages/${slug}`, { isPublic: true });
    return data;
  } catch (error) {
    console.error("Lỗi khi tải trang công khai:", error);
    throw error; // Ném lỗi ra để component xử lý
  }
};