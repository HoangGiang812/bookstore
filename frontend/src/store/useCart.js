// src/store/useCart.js
import { create } from 'zustand';
import * as Cart from '../services/cart';
import { useAuth } from './useAuth';

export const useCart = create((set, get) => ({
  items: [],
  init() {
    const u = useAuth.getState().user;
    set({ items: Cart.getCart(u?._id || u?.id || null) });
  },
  add(book, qty = 1) {
    const u = useAuth.getState().user; // có thể null → giỏ khách
    set({ items: Cart.addToCart(u?._id || u?.id || null, book, qty) });
  },
  update(id, qty) {
    const u = useAuth.getState().user;
    set({ items: Cart.updateCart(u?._id || u?.id || null, id, qty) });
  },
  remove(id) {
    const u = useAuth.getState().user;
    set({ items: Cart.removeFromCart(u?._id || u?.id || null, id) });
  },
  clear() {
    const u = useAuth.getState().user;
    set({ items: Cart.clearCart(u?._id || u?.id || null) });
  },
  subtotal() {
    return Cart.calcSubtotal(get().items);
  },
}));
