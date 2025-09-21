// src/view/services/api.js
const ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");
const BASE = `${ORIGIN}/api`;
const stripApiPrefix = (p) => (p.startsWith("/api/") ? p.slice(4) : p);

// ---------------- Token helpers ----------------
function getTokens() {
  try {
    const t = JSON.parse(localStorage.getItem("tokens") || "null");
    if (t?.accessToken) return t;
  } catch {}
  try {
    const wrap = JSON.parse(localStorage.getItem("bookstore_data_v1") || "{}");
    if (wrap?.tokens?.accessToken) return wrap.tokens;
  } catch {}
  try {
    const auth = JSON.parse(localStorage.getItem("auth") || "null");
    if (auth?.accessToken)
      return { accessToken: auth.accessToken, refreshToken: auth.refreshToken };
  } catch {}
  try {
    const t2 = JSON.parse(localStorage.getItem("auth_tokens") || "null");
    if (t2?.accessToken) return t2;
  } catch {}
  return null;
}

function setTokens(next) {
  try {
    if (next) localStorage.setItem("tokens", JSON.stringify(next));
    else localStorage.removeItem("tokens");
  } catch {}

  try {
    const wrap = JSON.parse(localStorage.getItem("bookstore_data_v1") || "{}");
    if (next) wrap.tokens = next;
    else delete wrap.tokens;
    localStorage.setItem("bookstore_data_v1", JSON.stringify(wrap));
  } catch {}

  try {
    if (next) {
      const curr = JSON.parse(localStorage.getItem("auth") || "null") || {};
      localStorage.setItem(
        "auth",
        JSON.stringify({
          ...curr,
          accessToken: next.accessToken,
          refreshToken: next.refreshToken,
        })
      );
    } else {
      localStorage.removeItem("auth");
    }
  } catch {}

  try {
    if (next) localStorage.setItem("auth_tokens", JSON.stringify(next));
    else localStorage.removeItem("auth_tokens");
  } catch {}
}
function withParams(url, params) {
  if (!params) return url;
  const usp =
    params instanceof URLSearchParams
      ? params
      : new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null && v !== "")
            .map(([k, v]) => [
              k,
              Array.isArray(v) ? v.join(",") : String(v),
            ])
        );
  const q = usp.toString();
  return q ? `${url}${url.includes("?") ? "&" : "?"}${q}` : url;
}

async function rawPost(path, body) {
  const url = `${BASE}${stripApiPrefix(path)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body || {}),
  });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json")
    ? await res.json().catch(() => ({}))
    : await res.text();
  if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  return data;
}
async function request(
  path,
  { method = "GET", headers = {}, body, params, _retried } = {}
) {
  const isAbs = /^https?:\/\//i.test(path);
  const rel = isAbs ? path : stripApiPrefix(path.startsWith("/") ? path : `/${path}`);
  let url = isAbs ? rel : `${BASE}${rel}`;

  if ((method === "GET" || method === "DELETE") && params)
    url = withParams(url, params);

  const h = { Accept: "application/json", ...headers };
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (!isFormData && body != null) {
    h["Content-Type"] = h["Content-Type"] || "application/json";
  }

  const tokens = getTokens();
  if (tokens?.accessToken) h["Authorization"] = `Bearer ${tokens.accessToken}`;

  const opts = { method, headers: h };
  if (body != null) opts.body = isFormData ? body : JSON.stringify(body);

  console.log("API REQUEST:", method, url, params || "", body || "");

  const res = await fetch(url, opts);
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json")
    ? await res.json().catch(() => ({}))
    : await res.text();

  if (res.status === 401 && !_retried && tokens?.refreshToken) {
    try {
      const refreshed = await rawPost("/auth/refresh", {
        refreshToken: tokens.refreshToken,
      });
      const next = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken || tokens.refreshToken,
      };
      setTokens(next);
      return await request(path, { method, headers, body, params, _retried: true });
    } catch {
      setTokens(null);
    }
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    console.error("API ERROR:", method, url, msg, data);
    throw new Error(msg);
  }
  return data;
}
export const api = {
  get: (p, o = {}) => request(p, { ...o, method: "GET" }),
  post: (p, b, o = {}) => request(p, { ...o, method: "POST", body: b }),
  put: (p, b, o = {}) => request(p, { ...o, method: "PUT", body: b }),
  patch: (p, b, o = {}) => request(p, { ...o, method: "PATCH", body: b }),
  delete: (p, o = {}) => request(p, { ...o, method: "DELETE" }),
};

export default api;
