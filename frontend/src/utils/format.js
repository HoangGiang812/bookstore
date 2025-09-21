export const money = (n=0) => (n||0).toLocaleString('vi-VN') + 'đ';
export const sleep = (ms=500) => new Promise(r=>setTimeout(r, ms));
export const uid = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
export const today = () => new Date().toISOString().slice(0,10);
