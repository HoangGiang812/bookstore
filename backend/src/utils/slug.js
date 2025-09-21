export const slugify = (s = '') =>
  s.toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-');

export const randomISBN13 = () =>
  Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join('');

export const randomCode = () =>
  `BK-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
