import * as WL from '../services/wishlist'
export const list = (userId)=> WL.list(userId);
export const toggle = (userId, book)=> WL.toggle(userId, book);
