// src/services/cart.js
import { load, save } from '../view/services/storage'; // đổi path nếu file khác chỗ

const keyFor = (uid) => (uid ? `cart_${uid}` : 'cart_guest');

// tiện ích phát sự kiện để Header cập nhật badge ngay
const emit = (name, detail) => {
  try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
  try { window.dispatchEvent(new Event('cart:changed')); } catch {}
};

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
    categoryId:
      book.categoryId ||
      (Array.isArray(book.categoryIds) ? book.categoryIds[0] : null),
    quantity: Math.max(1, Number(qty || 1)),
  };

  const list = getCart(uid);
  const idx = list.findIndex((i) => (i.id || i.bookId) === id);
  let next;
  if (idx >= 0) {
    next = list.map((i) =>
      (i.id || i.bookId) === id
        ? { ...i, quantity: Math.min(999, Number(i.quantity || 0) + item.quantity) }
        : i
    );
  } else {
    next = [item, ...list];
  }
  save(keyFor(uid), next);
  emit('cart:itemAdded', { id, qty: item.quantity });
  return next;
};

export const updateCart = (uid, id, qty) => {
  const n = Math.max(0, Number(qty || 0));
  const list = getCart(uid);
  const next =
    n <= 0
      ? list.filter((i) => (i.id || i.bookId) !== id)
      : list.map((i) =>
          (i.id || i.bookId) === id ? { ...i, quantity: Math.max(1, n) } : i
        );
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

// ===== Helpers hiển thị (BE sẽ tính lại khi checkout) =====
export const calcSubtotal = (items) =>
  (items || []).reduce((s, it) => s + Number(it.price || 0) * Number(it.quantity || 0), 0);

export const shippingFee = (subtotal) => (Number(subtotal) >= 300000 ? 0 : 30000);

export const applyCoupon = (code, subtotal) => {
  const map = { GIAM10: 0.9, FREESHIP300: 1 };
  const rate = map[String(code || '').toUpperCase()] || 1;
  return { valid: rate !== 1, total: Math.round(Number(subtotal || 0) * rate) };
};

// ====== BUY NOW support ======
// Lưu đầy đủ snapshot món “mua ngay” (KHÔNG thêm vào giỏ):
// data = { id, qty, price, title, image, categoryId }
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
