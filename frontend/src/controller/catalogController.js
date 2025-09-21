import * as Catalog from '../services/catalog'
export const listBooks = (params)=> Catalog.getBooks(params);
export const readBook = (id)=> Catalog.getBook(id);
export const listReviews = (bookId)=> Catalog.getReviews(bookId);
export const createReview = (payload)=> Catalog.addReview(payload);
