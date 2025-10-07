// src/services/cart.js
import { load, save } from '../view/services/storage';
import api from '../services/api';

const keyFor = (uid) => (uid ? `cart_${uid}` : 'cart_guest');

// ---- cart events ----
const emit = (name, detail) => {
  try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
  try { window.dispatchEvent(new Event('cart:changed')); } catch {}
};

// ---- basic cart ops ----
export const getCart = (uid) => load(keyFor(uid), []);

export const addToCart = (uid, book, qty = 1) => {
  const id = book._id || book.id;
  if (!id) throw new Error('Thiếu book id');

  const item = {
    id,
    bookId: id,
    title: book.title,
    price: Number(book.salePrice ?? book.price ?? 0),
    image: book.image || book.coverUrl || '/placeholder.png',
    categoryId: book.categoryId || (Array.isArray(book.categoryIds) ? book.categoryIds[0] : null),
    quantity: Math.max(1, Number(qty || 1)),
  };

  const list = getCart(uid);
  const idx = list.findIndex((i) => (i.id || i.bookId) === id);
  const next =
    idx >= 0
      ? list.map((i) => ( (i.id || i.bookId) === id ? { ...i, quantity: Math.min(999, Number(i.quantity || 0) + item.quantity) } : i ))
      : [item, ...list];

  save(keyFor(uid), next);
  emit('cart:itemAdded', { id, qty: item.quantity });
  return next;
};

export const updateCart = (uid, id, qty) => {
  const n = Math.max(0, Number(qty || 0));
  const list = getCart(uid);
  const next = n <= 0
    ? list.filter((i) => (i.id || i.bookId) !== id)
    : list.map((i) => ((i.id || i.bookId) === id ? { ...i, quantity: Math.max(1, n) } : i));
  save(keyFor(uid), next);
  emit('cart:itemUpdated', { id, qty: n });
  return next;
};

export const clearCart = (uid) => {
  save(keyFor(uid), []);
  emit('cart:cleared');
  return [];
};

export const removeFromCart = (uid, id) => {
  const next = getCart(uid).filter((i) => (i.id || i.bookId) !== id);
  save(keyFor(uid), next);
  emit('cart:itemRemoved', { id });
  return next;
};

// ---- display helpers ----
export const calcSubtotal = (items) =>
  (items || []).reduce((s, it) => s + Number(it.price || 0) * Number(it.quantity || 0), 0);

// ========== SHIPPING RULES (FE) ==========
const FREE_SHIP_THRESHOLD = 500_000;

// tỉnh đặt shop
const SHOP_PROVINCE = 'Hồ Chí Minh';

// các tỉnh giáp ranh (tự chỉnh nếu muốn)
const NEAR_PROVINCES = ['Bình Dương', 'Đồng Nai', 'Long An'];

// mức phí theo vùng (tự chỉnh nếu muốn)
const FEE_SAME_CITY = 20_000;
const FEE_NEAR = 25_000;
const FEE_FAR = 30_000;

// fallback cũ (giữ để không phá chỗ khác đang import)
export const shippingFee = (subtotal) =>
  Number(subtotal) >= FREE_SHIP_THRESHOLD ? 0 : FEE_FAR;

// TÍNH PHÍ SHIP LOCAL THEO TỈNH
function shippingFeeLocal(province, subtotal) {
  const sub = Number(subtotal || 0);
  if (sub >= FREE_SHIP_THRESHOLD) return 0;

  const p = String(province || '').trim();
  if (!p) return FEE_FAR;

  if (equalsProvince(p, SHOP_PROVINCE)) return FEE_SAME_CITY;
  if (NEAR_PROVINCES.some((x) => equalsProvince(p, x))) return FEE_NEAR;
  return FEE_FAR;
}

function normalizeName(s) {
  return String(s || '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function equalsProvince(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  // chấp nhận một vài biến thể tên HCM
  const isHCM = (x) => /(hồ chí minh|ho chi minh|tp\.?\s*hcm|tphcm)/i.test(x);
  if (isHCM(a) && isHCM(b)) return true;
  return na === nb;
}

// Ưu tiên BE, BE không hợp lệ thì dùng local
export async function shippingFeeFor(province, subtotal) {
  try {
    const q = new URLSearchParams({
      province: String(province || ''),
      subtotal: String(Number(subtotal || 0)),
    }).toString();

    const data = await api.get(`/api/public/shipping/estimate?${q}`);
    const fee = Number(data?.fee);
    if (Number.isFinite(fee) && fee >= 0) return fee;

    // BE trả không hợp lệ -> FE tự tính
    return shippingFeeLocal(province, subtotal);
  } catch {
    // BE lỗi -> FE tự tính
    return shippingFeeLocal(province, subtotal);
  }
}

// ---- coupon demo ----
export const applyCoupon = (code, subtotal) => {
  const map = { GIAM10: 0.9, FREESHIP300: 1 };
  const rate = map[String(code || '').toUpperCase()] || 1;
  return { valid: rate !== 1, total: Math.round(Number(subtotal || 0) * rate) };
};

// ---- BUY NOW helpers ----
export const setBuyNow = (data) => {
  const safe = data && data.id ? {
    id: data.id,
    qty: Math.max(1, Number(data.qty || 1)),
    price: Number(data.price || 0),
    title: data.title || '',
    image: data.image || '/placeholder.png',
    categoryId: data.categoryId || null,
  } : null;
  save('buy_now', safe);
  try { window.dispatchEvent(new Event('buy:now')); } catch {}
};

export const getBuyNow = () => load('buy_now', null);

export const clearBuyNow = () => {
  save('buy_now', null);
  try { window.dispatchEvent(new Event('buy:cleared')); } catch {}
};
