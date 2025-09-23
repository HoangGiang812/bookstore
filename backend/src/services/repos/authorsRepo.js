import mongoose from 'mongoose';
import Author from '../../models/Author.js';
import Book from '../../models/Book.js';
import { slugify } from '../../utils/slug.js';

const mapAuthor = (a) => ({
  id: a._id?.toString() ?? a.id,
  name: a.name ?? a.fullName ?? a.displayName ?? 'Unknown',
  avatar: a.avatarUrl ?? a.avatar ?? a.photoUrl ?? null,
  slug: a.slug ?? slugify(a.name ?? a.fullName ?? a.displayName ?? ''),

  bookCount: a.bookCount ?? 0,
});

export async function listAuthors({ limit = 50, start = 0, q = '' }) {
  const take = Math.min(500, start + limit + 50);
  const match = q
    ? {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { fullName: { $regex: q, $options: 'i' } },
          { displayName: { $regex: q, $options: 'i' } },
        ],
      }
    : {};

  const rows = await Author.aggregate([
    { $match: match },
    { $skip: start },
    { $limit: take },
    {
      $lookup: {
        from: 'books',
        let: { aid: '$_id' },
        pipeline: [
          { $match: { $expr: { $in: ['$$aid', { $ifNull: ['$authorIds', []] }] } } },
          { $count: 'count' },
        ],
        as: 'bookStats',
      },
    },
    { $addFields: { bookCount: { $ifNull: [{ $first: '$bookStats.count' }, 0] } } },
  ]);

  return rows.slice(0, limit).map(mapAuthor);
}

export async function getAuthorById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const oid = new mongoose.Types.ObjectId(id);

  const rows = await Author.aggregate([
    { $match: { _id: oid } },
    {
      $lookup: {
        from: 'books',
        let: { aid: '$_id' },
        pipeline: [
          { $match: { $expr: { $in: ['$$aid', { $ifNull: ['$authorIds', []] }] } } },
          { $count: 'count' },
        ],
        as: 'bookStats',
      },
    },
    { $addFields: { bookCount: { $ifNull: [{ $first: '$bookStats.count' }, 0] } } },
    { $limit: 1 },
  ]);

  if (!rows.length) return null;
  return mapAuthor(rows[0]);
}
export async function getAuthorBySlug(slug) {
  const rows = await Author.aggregate([
    { $match: { slug } },
    {
      $lookup: {
        from: 'books',
        let: { aid: '$_id' },
        pipeline: [
          { $match: { $expr: { $in: ['$$aid', { $ifNull: ['$authorIds', []] }] } } },
          { $count: 'count' },
        ],
        as: 'bookStats',
      },
    },
    { $addFields: { bookCount: { $ifNull: [{ $first: '$bookStats.count' }, 0] } } },
    { $limit: 1 },
  ]);
  if (!rows.length) return null;
  return mapAuthor(rows[0]);
}
