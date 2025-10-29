// File: src/services/wishlist.js
import api from './api'; // Import file api.js của bạn

// GET /api/wishlist
export const list = () => {
  return api.get('/wishlist'); //
};

// POST /api/wishlist/:bookId
export const add = (bookId) => {
  // Không cần body, chỉ cần gọi POST
  return api.post(`/wishlist/${bookId}`, null); 
};

// DELETE /api/wishlist/:bookId
export const remove = (bookId) => {
  return api.delete(`/wishlist/${bookId}`); //
};