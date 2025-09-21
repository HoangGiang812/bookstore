import { api } from "./api";

export async function fetchAuthors(limit = 20, start = 0, q = "") {
  const res = await api.get("/authors", { params: { limit, start, q } });
  return res.data;
}

export async function fetchAuthorById(id) {
  const res = await api.get(`/authors/${id}`);
  return res.data;
}
