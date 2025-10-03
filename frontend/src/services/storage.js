// src/view/services/storage.js
const KEY = 'bookstore_data_v1';

const getAll = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
};

const setAll = (d) => {
  localStorage.setItem(KEY, JSON.stringify(d));
  // 🔔 Thông báo trong cùng tab
  try { window.dispatchEvent(new Event('cart:changed')); } catch {}
  // 🔔 Kích hoạt storage event cho các tab khác
  try { localStorage.setItem('__cart_bump__', String(Date.now())); } catch {}
};

export const load = (k, def) => {
  const a = getAll();
  return a[k] ?? def;
};

export const save = (k, v) => {
  const a = getAll();
  a[k] = v;
  setAll(a); // sẽ phát 'cart:changed' và '__cart_bump__'
};

export const reset = () => {
  localStorage.removeItem(KEY);
  try { window.dispatchEvent(new Event('cart:changed')); } catch {}
};
