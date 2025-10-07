// src/services/shipping.js
import api from './api';

// Tỉnh/Thành của shop (để FE fallback phân biệt nội/ngoại tỉnh)
export const SHOP_ORIGIN_PROVINCE = 'Hồ Chí Minh';

// Chuẩn hoá tên tỉnh để so khớp linh hoạt
function normalizeProvince(p) {
  return String(p || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function isHCMName(p) {
  const n = normalizeProvince(p);
  if (!n) return false;
  return n.includes('ho chi minh') || n === 'hcm' || n === 'tp hcm' || n === 'tphcm' || n === 'sai gon' || n === 'sg';
}
const isLocal = (province) => isHCMName(province) || isHCMName(SHOP_ORIGIN_PROVINCE);

// Base rule fallback FE
const BASE_LOCAL = 20000;       // nội TP.HCM
const BASE_UPCOUNTRY = 40000;   // ngoại TP.HCM
const FREE_LOCAL = 300000;      // freeship nội tỉnh
const FREE_UPCOUNTRY = 500000;  // freeship ngoại tỉnh

export function localShippingFee(subtotal, province) {
  const local = isLocal(province);
  const threshold = local ? FREE_LOCAL : FREE_UPCOUNTRY;
  if (Number(subtotal || 0) >= threshold) return 0;
  return local ? BASE_LOCAL : BASE_UPCOUNTRY;
}

/**
 * Ước lượng phí ship từ BE. Nếu BE lỗi/không hợp lệ -> fallback FE.
 * @param {string} province - ví dụ "Hà Nội", "Bình Dương", "Hồ Chí Minh"
 * @param {number} subtotal - tạm tính
 * @returns {Promise<number>} fee (VND)
 */
export async function estimateShipping(province, subtotal) {
  try {
    const q = new URLSearchParams({
      province: String(province || ''),
      subtotal: String(Number(subtotal || 0)),
    }).toString();
    const res = await api.get(`/api/public/shipping/estimate?${q}`);
    const fee = Number(res?.fee);
    if (Number.isFinite(fee) && fee >= 0) return fee; // BE hợp lệ
    return localShippingFee(subtotal, province);
  } catch {
    return localShippingFee(subtotal, province);
  }
}
