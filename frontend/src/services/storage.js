const KEY = 'bookstore_data_v1';

const getAll = () => JSON.parse(localStorage.getItem(KEY) || '{}');
const setAll = (d) => localStorage.setItem(KEY, JSON.stringify(d));

export const load = (k, def) => {
  const a = getAll();
  return a[k] ?? def;
};
export const save = (k, v) => {
  const a = getAll();
  a[k] = v;
  setAll(a);
};
export const reset = () => localStorage.removeItem(KEY);
