// src/services/shipping.js
import api from './api';

/**
 * Ước lượng phí ship từ BE.
 * @param {string} province - Tỉnh/Thành phố (ví dụ "Hà Nội")
 * @param {number} subtotal - Tạm tính (VND)
 * @returns {Promise<number>} phí ship (VND)
 */
export async function estimateShipping(province, subtotal) {
  const q = new URLSearchParams({
    province: String(province || ''),
    subtotal: String(Number(subtotal || 0)),
  }).toString();

  const res = await api.get(`/api/public/shipping/estimate?${q}`);
  // api.get trả về đối tượng { ok, data } hoặc data trực tiếp tùy implement của bạn;
  // ở project này api.js trả về data (JSON) luôn:
  return Number(res?.fee || 0);
}
