// src/services/reviews.js
import api from './api';

export const getSummary  = (bookId) => api.get(`/api/books/${bookId}/ratings`);

export const listReviews = (bookId, params = {}) => {
  const q = new URLSearchParams(params).toString();
  return api.get(`/api/books/${bookId}/reviews${q ? `?${q}` : ''}`);
};

export const canReview  = (bookId) => api.get(`/api/books/${bookId}/reviews/can`);

export const postReview = (bookId, payload) =>
  api.post(`/api/books/${bookId}/reviews`, payload);

export const myReview   = (bookId) => api.get(`/api/books/${bookId}/reviews/mine`);

export const deleteMine = (bookId) => api.delete(`/api/books/${bookId}/reviews`);
