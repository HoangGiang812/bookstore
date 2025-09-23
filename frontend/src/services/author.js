import { api } from "./api";

export async function fetchAuthors(limit = 20, start = 0, q = "") {
  const res = await api.get("/authors", { params: { limit, start, q } });
  const data = res?.data ?? res;
  return Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
}
export async function fetchAuthorBySlug(slug) {
  const res = await api.get(`/authors/${slug}`);
  return res?.data ?? res;
}