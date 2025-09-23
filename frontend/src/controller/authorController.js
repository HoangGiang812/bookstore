import { fetchAuthors, fetchAuthorBySlug } from "@/services/author";

export async function getAuthors({ page = 1, limit = 20, q = "" } = {}) {
  const start = (page - 1) * limit;
  const data = await fetchAuthors(limit, start, q);
  return Array.isArray(data) ? data : [];
}

export async function getAuthor(slug) {
  if (!slug) return null;
  return await fetchAuthorBySlug(slug);
}