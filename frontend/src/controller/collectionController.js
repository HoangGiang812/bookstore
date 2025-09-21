import * as Catalog from '../services/catalog'
export const list = ()=> Catalog.getCollections();
export const read = (id)=> Catalog.getCollection(id);
export const related = (book)=> Catalog.relatedBooks(book);
