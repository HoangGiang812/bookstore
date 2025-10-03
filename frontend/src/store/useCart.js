// src/store/useCart.js
import { create } from 'zustand';
import * as Cart from '../services/cart';
import { useAuth } from './useAuth';

function emitCartChanged() {
  try { window.dispatchEvent(new Event('cart:changed')); } catch {}
}

export const useCart = create((set, get) => ({
  items: [],

  init() {
    const u = useAuth.getState().user;
    const uid = u?._id || u?.id || null;          // null -> cart_guest
    set({ items: Cart.getCart(uid) });
    emitCartChanged();                             // đồng bộ badge ngay khi load
  },

  add(book, qty = 1) {
    const u = useAuth.getState().user;            // có thể null → giỏ khách
    const uid = u?._id || u?.id || null;
    const next = Cart.addToCart(uid, book, qty);
    set({ items: next });
    emitCartChanged();                             // 🔔 cập nhật Header ngay lập tức
  },

  update(id, qty) {
    const u = useAuth.getState().user;
    const uid = u?._id || u?.id || null;
    const next = Cart.updateCart(uid, id, qty);
    set({ items: next });
    emitCartChanged();
  },

  remove(id) {
    const u = useAuth.getState().user;
    const uid = u?._id || u?.id || null;
    const next = Cart.removeFromCart(uid, id);
    set({ items: next });
    emitCartChanged();
  },

  clear() {
    const u = useAuth.getState().user;
    const uid = u?._id || u?.id || null;
    const next = Cart.clearCart(uid);
    set({ items: next });
    emitCartChanged();
  },

  subtotal() {
    return Cart.calcSubtotal(get().items);
  },
}));
