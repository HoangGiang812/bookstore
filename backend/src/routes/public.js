import { Router } from 'express';
import { listBooks, suggestBooks, getBook, relatedBooks, listCategories, listAuthors, listPublishers, publicBanners, publicPage } from '../controllers/publicController.js';

const r = Router();
r.get('/books', listBooks);
r.get('/books/suggest', suggestBooks);
r.get('/books/:id', getBook);
r.get('/books/:id/related', relatedBooks);
r.get('/categories', listCategories);
r.get('/authors', listAuthors);
r.get('/publishers', listPublishers);
r.get('/banners', publicBanners);
r.get('/pages/:slug', publicPage);

export default r;
