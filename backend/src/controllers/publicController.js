import { Book } from '../models/Book.js';
import { Category } from '../models/Category.js';
import { Author } from '../models/Author.js';
import { Publisher } from '../models/Publisher.js';
import { Banner } from '../models/Banner.js';
import { Page } from '../models/Page.js';
import { parsePaging } from '../utils/pagination.js';

export async function listBooks(req, res) {
  const { q, categoryId, authorId, publisherId, priceMin, priceMax, year, ratingMin, sort } = req.query;
  const { limit, skip } = parsePaging(req);
  const filter = {};
  if (q) filter.$text = { $search: q };
  if (categoryId) filter.categories = categoryId;
  if (authorId) filter.authors = authorId;
  if (publisherId) filter.publisherId = publisherId;
  if (priceMin || priceMax) filter.price = {};
  if (priceMin) filter.price.$gte = Number(priceMin);
  if (priceMax) filter.price.$lte = Number(priceMax);
  if (ratingMin) filter.ratingAvg = { $gte: Number(ratingMin) };
  let cursor = Book.find(filter).lean().skip(skip).limit(limit);
  if (sort === 'latest') cursor = cursor.sort({ createdAt: -1 });
  else if (sort === 'price_asc') cursor = cursor.sort({ price: 1 });
  else if (sort === 'price_desc') cursor = cursor.sort({ price: -1 });
  else if (sort === 'rating') cursor = cursor.sort({ ratingAvg: -1 });
  const items = await cursor;
  const total = await Book.countDocuments(filter);
  res.json({ items, total, pageSize: limit });
}

export async function suggestBooks(req, res) {
  const { q } = req.query;
  const items = await Book.find(q ? { title: new RegExp(q, 'i') } : {}).select('title slug').limit(10).lean();
  res.json(items);
}

export async function getBook(req, res) {
  const book = await Book.findById(req.params.id).lean();
  if (!book) return res.status(404).json({ message: 'Not found' });
  res.json(book);
}

export async function relatedBooks(req, res) {
  const cur = await Book.findById(req.params.id).lean();
  if (!cur) return res.status(404).json({ message: 'Not found' });
  const items = await Book.find({ _id: { $ne: cur._id }, categories: { $in: cur.categories || [] } }).limit(10).lean();
  res.json(items);
}

export async function listCategories(_req, res) {
  res.json(await Category.find({ active: true }).sort({ sort: 1 }).lean());
}
export async function listAuthors(_req, res) {
  res.json(await Author.find({ active: true }).lean());
}
export async function listPublishers(_req, res) {
  res.json(await Publisher.find({ active: true }).lean());
}

export async function publicBanners(_req, res) {
  res.json(await Banner.find({ active: true }).sort({ sort: 1 }).lean());
}
export async function publicPage(req, res) {
  const page = await Page.findOne({ slug: req.params.slug, published: true }).lean();
  if (!page) return res.status(404).json({ message: 'Not found' });
  res.json(page);
}
