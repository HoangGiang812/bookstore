import Author from '../../models/Author.js';

const mapAuthor = (a) => ({
  id:     a._id?.toString() ?? a.id,
  name:   a.name ?? a.fullName ?? a.displayName ?? 'Unknown',
  avatar: a.avatar ?? a.photoUrl ?? null,
});

export async function listAuthors({ limit = 50, start = 0 }) {
  const take = Math.min(500, start + limit + 50);

  const rows = await Author.find({}, 'name fullName displayName avatar photoUrl')
    .limit(take)
    .lean();

  return rows.slice(start, start + limit).map(mapAuthor);
}
