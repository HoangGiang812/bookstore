// src/view/pages/Categories.jsx
import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { Search, Grid, List } from "lucide-react";
import api from "../../services/api";
import DealCard from "../components/DealCard";
import { useCart } from "../../store/useCart";
import { useAuth } from "../../store/useAuth";
import * as CartSvc from "../../services/cart"; // dùng setBuyNow

/* ===== Helpers ===== */
const extractItems = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.docs)) return payload.docs;
  if (payload.data) {
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data.docs)) return payload.data.docs;
  }
  return [];
};

const BOOK_ENDPOINTS = ["/books", "/book", "/public/books", "/store/books", "/products"];
async function fetchBooksWithFallback(params) {
  let lastErr;
  for (const path of BOOK_ENDPOINTS) {
    try {
      const res = await api.get(path, { params });
      const items = extractItems(res);
      return { items, usedPath: path };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Không tìm thấy endpoint sách phù hợp");
}

const normalize = (s = "") =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ép string "320.000đ" -> 320000
const toNumber = (v) =>
  typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[^\d]/g, "")) || 0 : 0;

function mapBook(b) {
  const categoryObj = b.category || b.categoryId || b.categoryRef || null;
  const catName =
    categoryObj?.name ||
    b.categoryName ||
    (Array.isArray(b.categories) ? b.categories[0]?.name : b.category) ||
    "Khác";

  const price = toNumber(b?.price?.sale ?? b?.salePrice ?? b?.price);
  const original = toNumber(b?.price?.value ?? b?.originalPrice ?? b?.price);

  return {
    id: b._id || b.id || b.bookId,
    slug: b.slug || null,
    title: b.title || b.name || "—",
    author:
      b.author?.name ||
      b.authorName ||
      (Array.isArray(b.authors) ? b.authors[0]?.name : b.author) ||
      "—",
    price,
    originalPrice: original,
    rating: b.ratingAverage ?? b.rating ?? 0,
    reviewCount: b.reviewsCount ?? b.reviewCount ?? 0,
    discount:
      toNumber(b.discount) ||
      (original > 0 && price > 0 && original > price
        ? Math.round(((original - price) / original) * 100)
        : 0),
    category: catName,
    categorySlug: categoryObj?.slug || b.categorySlug || normalize(catName),
    image:
      b.images?.[0]?.url ||
      b.cover?.url ||
      b.coverUrl ||
      b.image ||
      "/placeholder.png",
  };
}

/* bump header badge ngay khi thêm giỏ */
const bumpHeader = () => {
  try {
    localStorage.setItem("__cart_bump__", String(Date.now()));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("cart:changed"));
  } catch {}
};

/* ===================== PAGE ===================== */
export default function Categories() {
  const [layout, setLayout] = useState("grid");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [catSlug, setCatSlug] = useState("all");
  const [author, setAuthor] = useState("all");
  const [rating, setRating] = useState(0);

  const [categories, setCategories] = useState([{ slug: "all", name: "Tất cả" }]);
  const [authors, setAuthors] = useState(["all"]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Pagination (4x4)
  const PER_PAGE = 16;
  const [page, setPage] = useState(1);

  const [sp] = useSearchParams();
  const cart = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const params = useParams();

  // đọc query ban đầu
  useEffect(() => {
    const by = sp.get("by");
    const value = sp.get("value");
    const q = sp.get("q");
    const s = sp.get("sort");
    if (q) setSearch(q);
    if (s) setSort(s);
    if (by === "category" && value) setCatSlug(normalize(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load danh mục (sidebar)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/categories", { params: { active: true } });
        const items =
          res?.items ||
          res?.data?.items ||
          (Array.isArray(res) ? res : []) ||
          (Array.isArray(res?.data) ? res.data : []);
        const mapped = items
          .map((c) => ({ id: c._id, name: c.name, slug: c.slug || normalize(c.name || "") }))
          .filter((c) => c.name);
        if (!cancelled) setCategories([{ slug: "all", name: "Tất cả" }, ...mapped]);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Load sách (có hỗ trợ deep)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const deepFlag = sp.get("deep") === "1" || sp.get("deep") === "true";
        const p = {
          q: search || undefined,
          sort,
          category: catSlug !== "all" ? catSlug : undefined,
          categorySlug: catSlug !== "all" ? catSlug : undefined,
          // các biến thể để BE dễ hiểu:
          deep: deepFlag ? 1 : undefined,
          includeDescendants: deepFlag ? true : undefined,
          recursive: deepFlag ? true : undefined,
          limit: 200,
        };
        const { items } = await fetchBooksWithFallback(p);
        if (cancelled) return;
        const mapped = items.map(mapBook);

        const aSet = new Set(mapped.map((b) => b.author).filter(Boolean));
        setAuthors(["all", ...Array.from(aSet)]);
        setBooks(mapped);
        setPage(1);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Lỗi tải dữ liệu");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [search, sort, catSlug, sp]);

  // Lọc client
  const filtered = useMemo(() => {
    let f = [...books];
    if (author !== "all") f = f.filter((b) => b.author === author);
    if (rating > 0) f = f.filter((b) => Math.floor(b.rating || 0) >= rating);
    if (search) f = f.filter((b) => (b.title + b.author).toLowerCase().includes(search.toLowerCase()));

    switch (sort) {
      case "price-asc":
        f.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        f.sort((a, b) => b.price - a.price);
        break;
      case "bestseller":
        f.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
        break;
      default:
        f.sort((a, b) => (b.publishYear || 0) - (a.publishYear || 0));
    }
    return f;
  }, [books, author, rating, search, sort]);

  // Paging
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  /* ================= handlers cho DealCard ================= */

  // ✅ Thêm giỏ KHÔNG cần đăng nhập
  const handleAdd = (bk) => {
    cart.add(bk, 1);
    bumpHeader();
  };

  // ✅ Mua ngay: bắt đăng nhập & chỉ thanh toán món đó
  const handleBuy = (bk) => {
    const q = 1;
    cart.add(bk, q);
    CartSvc.setBuyNow({ id: bk.id || bk._id, qty: q });
    bumpHeader();
    if (!user) return nav(`/login?next=${encodeURIComponent("/cart?buy=1")}`);
    nav("/cart?buy=1");
  };

  // phản ứng theo slug trên URL
  useEffect(() => {
    if (params.slug) setCatSlug(params.slug);
    else setCatSlug("all");
    // eslint-disable-next-line
  }, [params.slug]);

  return (
    <div className="container px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Danh mục sách</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLayout("grid")}
            className={`p-2 rounded ${layout === "grid" ? "bg-purple-600 text-white" : "bg-white"}`}
            title="Lưới"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setLayout("list")}
            className={`p-2 rounded ${layout === "list" ? "bg-purple-600 text-white" : "bg-white"}`}
            title="Danh sách"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-4 text-red-700 bg-red-50 border border-red-200 rounded p-3">{err}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <aside className="card p-4">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-600"
                placeholder="Tìm kiếm…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Categories */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Danh mục</h4>
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {categories.map((c) => (
                <button
                  key={c.slug}
                  className={`flex items-center gap-2 w-full text-left px-2 py-1 rounded ${catSlug === c.slug ? "bg-purple-100 font-bold text-purple-600" : ""}`}
                  onClick={() =>
                    nav(
                      c.slug === "all"
                        ? "/categories"
                        : `/categories/${c.slug}?deep=1` // mặc định deep=1 khi chọn danh mục
                    )
                  }
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Sắp xếp</h4>
            <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Mới nhất</option>
              <option value="price-asc">Giá từ thấp đến cao</option>
              <option value="price-desc">Giá từ cao đến thấp</option>
              <option value="bestseller">Bán chạy</option>
            </select>
          </div>

          {/* Author */}
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Tác giả</h4>
            <select className="input" value={author} onChange={(e) => setAuthor(e.target.value)}>
              {authors.map((a) => (
                <option key={a} value={a}>
                  {a === "all" ? "Tất cả" : a}
                </option>
              ))}
            </select>
          </div>

          {/* Rating */}
          <div>
            <h4 className="font-semibold mb-2">Đánh giá tối thiểu</h4>
            <select className="input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              <option value="0">Tất cả</option>
              <option value="1">≥ 1 sao</option>
              <option value="2">≥ 2 sao</option>
              <option value="3">≥ 3 sao</option>
              <option value="4">≥ 4 sao</option>
              <option value="5">5 sao</option>
            </select>
          </div>
        </aside>

        {/* List */}
        <main className="md:col-span-3">
          {loading ? (
            <p>Đang tải…</p>
          ) : pageItems.length ? (
            <>
              {/* Grid 4×4 */}
              <div
                className={`grid ${
                  layout === "grid"
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    : "grid-cols-1"
                } gap-6`}
              >
                {pageItems.map((b) => (
                  <DealCard
                    key={b.id || b._id}
                    book={b}
                    onAdd={handleAdd}   // ✅ thêm giỏ không cần login
                    onBuy={handleBuy}   // ✅ mua ngay cần login
                  />
                ))}
              </div>

              {/* Pagination */}
              {pageCount > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-2 rounded-lg border bg-white disabled:opacity-40"
                  >
                    Trước
                  </button>
                  {Array.from({ length: pageCount }).map((_, i) => {
                    const idx = i + 1;
                    const active = idx === page;
                    return (
                      <button
                        key={idx}
                        onClick={() => setPage(idx)}
                        className={`min-w-9 px-3 py-2 rounded-lg border ${
                          active ? "bg-purple-600 text-white border-purple-600" : "bg-white"
                        }`}
                      >
                        {idx}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={page === pageCount}
                    className="px-3 py-2 rounded-lg border bg-white disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              )}
            </>
          ) : (
            <p>Không tìm thấy sách phù hợp.</p>
          )}
        </main>
      </div>
    </div>
  );
}
