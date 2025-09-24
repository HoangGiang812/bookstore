import Author from '../models/Author.js';
import { slugify } from './slug.js';

export async function makeUniqueAuthorSlug(nameOrSlug) {
  const base = slugify(nameOrSlug || '');
  if (!base) return '';
  let slug = base;
  let i = 1;
  while (await Author.exists({ slug })) {
    i += 1;
    slug = `${base}-${i}`;
  }
  return slug;
}
