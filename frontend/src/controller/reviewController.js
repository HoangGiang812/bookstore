import * as Catalog from '../services/catalog'
export const list = (bookId)=> Catalog.getReviews(bookId);
export const create = (payload)=> Catalog.addReview(payload);
export const update = (id, userId, patch)=> Catalog.updateReview(id, userId, patch);
export const remove = (id, userId)=> Catalog.deleteReview(id, userId);
