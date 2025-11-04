// src/view/pages/BookDetail.jsx
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Minus, Plus, ShoppingCart, Heart, Star } from "lucide-react";
import { useCart } from "../../store/useCart";
import { useAuth } from "../../store/useAuth";
import * as Catalog from "../../services/catalog";
import * as CartSvc from "../../services/cart";
import * as ReviewAPI from "../../services/reviews";
import { useWishlist } from "../../store/useWishlist";

/* --------- helpers --------- */
const toVND = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** tạo slug dự phòng khi BE chưa trả */
const slugify = (s = "") =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

/* =================================================================== */

export default function BookDetail() {
  const { slug } = useParams();
  const nav = useNavigate();
  const cart = useCart();
  const { user } = useAuth();
  const location = useLocation();
  const { wishlist, toggleWishlist } = useWishlist();

  const [qty, setQty] = useState(1);
  const [book, setBook] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ rating summary lấy từ API (để hiển thị dưới tên sách)
  const [ratingSum, setRatingSum] = useState({ avg: 0, cnt: 0 });

  // ---- fetch main book + related ----
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const b = await Catalog.getBook(slug);
        if (!mounted) return;

        // Thu gom danh sách tên tác giả
        const namesFromArray =
          Array.isArray(b.authorNames)
            ? b.authorNames
            : Array.isArray(b.authors)
            ? b.authors.map((x) => x?.name || x?.fullName || x?.displayName).filter(Boolean)
            : [];
        const namesFromString =
          typeof b.author === "string"
            ? b.author.split(",").map((s) => s.trim()).filter(Boolean)
            : b.authorName
            ? [String(b.authorName)]
            : [];
        const authorNames = (namesFromArray.length ? namesFromArray : namesFromString).filter(Boolean);

        // Slug tác giả
        const slugsFromArray =
          Array.isArray(b.authorSlugs)
            ? b.authorSlugs
            : Array.isArray(b.authors)
            ? b.authors.map((x) => x?.slug).filter(Boolean)
            : [];

        // Chuẩn hoá {name, slug}
        const authors = authorNames.map((name, i) => {
          const slugRaw =
            slugsFromArray[i] ||
            b.authorSlug ||
            (Array.isArray(b.authors) && b.authors[i]?.slug) ||
            "";
          return { name, slug: slugRaw && String(slugRaw).trim() ? slugRaw : slugify(name) };
        });

        const authorDisplay = authors.map((a) => a.name).join(", ");
        const firstAuthorSlug = authors[0]?.slug || "";

        const normalized = {
          id: b._id || b.id,
          _id: b._id || b.id,
          title: b.title,
          author: authorDisplay,
          authorSlug: firstAuthorSlug,
          authors,
          image: b.coverUrl || b.image,
          originalPrice: Number(b.price ?? 0),
          discountPercent: Number(b.discountPercent ?? 0),
          price: (Number(b.discountPercent ?? 0) > 0)
            ? Math.round(Number(b.price ?? 0) * (1 - Number(b.discountPercent ?? 0) / 100))
            : Number(b.price ?? 0),
          ratingAvg: Number(b.ratingAvg ?? b.rating ?? 0),
          ratingCnt: Number(b.ratingCnt ?? b.ratingCount ?? b.reviewsCount ?? 0),
          stock: Number(b.stock ?? 0),
          description: b.description || "",
          categoryIds: Array.isArray(b.categoryIds) ? b.categoryIds : [],
          categoryId: b.categoryId || (Array.isArray(b.categoryIds) ? b.categoryIds[0] : null),
        };
        setBook(normalized);

        // ---- lấy summary rating từ API
        try {
          const s = await ReviewAPI.getSummary(normalized._id);
          setRatingSum({ avg: Number(s?.avg || 0), cnt: Number(s?.cnt || 0) });
        } catch {
          setRatingSum({ avg: normalized.ratingAvg || 0, cnt: normalized.ratingCnt || 0 });
        }

        // ---- related
        let rel = [];
        try {
          rel = await Catalog.relatedBooks(b);
        } catch {}
        if (!rel || rel.length === 0) {
          const qAuthor = authors[0]?.name || authorDisplay;
          if (qAuthor) {
            try { rel = await Catalog.getBooks({ q: qAuthor, limit: 12 }); } catch {}
          }
        }
        if ((!rel || rel.length === 0) && normalized.title) {
          try {
            rel = await Catalog.getBooks({
              q: normalized.title.split(" ").slice(0, 2).join(" "),
              limit: 12,
            });
          } catch {}
        }
        const cleaned =
          (rel || [])
            .filter((r) => (r._id || r.id) !== normalized.id)
            .map((r) => ({
              id: r._id || r.id,
              title: r.title,
              author: r.author?.name || r.author || r.authorName || "",
              image: r.coverUrl || r.image,
              price: Number(r.salePrice ?? r.price ?? 0),
              originalPrice:
                Number(
                  r.originalPrice ??
                    r.priceOriginal ??
                    (r.discountPercent > 0 && r.price
                      ? Math.round(Number(r.price) / (1 - Number(r.discountPercent) / 100))
                      : r.price)
                ) || 0,
              discountPercent:
                r.discountPercent ??
                (r.originalPrice && r.price && r.originalPrice > r.price
                  ? Math.round(((r.originalPrice - r.price) / r.originalPrice) * 100)
                  : 0),
              rating: Number(r.ratingAvg ?? r.rating ?? 0),
              slug: r.slug,
            }))
            .slice(0, 12) || [];
        setRelated(cleaned);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [slug]);

  const liked = useMemo(() => {
    if (!book) return false;
    const id = book._id || book.id;
    return wishlist.some(item => (item._id || item.id) === id);
  }, [wishlist, book]);

  const hasDiscount = book && book.originalPrice > book.price && book.originalPrice > 0;

  const stockPercent = useMemo(() => {
    if (!book) return 0;
    const cap = Math.max(10, book.stock || 0);
    return clamp(((book.stock || 0) / cap) * 100, 0, 100);
  }, [book]);

  // ✅ Thêm vào giỏ: nếu chưa đăng nhập → login rồi quay lại
  const handleAddToCart = () => {
    if (!book) return;
    try {
      if (!user) {
        const next = window.location.pathname + window.location.search + window.location.hash;
        nav(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      cart.add(book, Math.max(1, qty));
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("Cần đăng nhập") || msg.toLowerCase().includes("unauthorized")) {
        const next = window.location.pathname + window.location.search + window.location.hash;
        nav(`/login?next=${encodeURIComponent(next)}`);
      } else {
        alert(msg || "Không thể thêm vào giỏ");
      }
    }
  };

  const toggleLike = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (user) {
      // (Phải có book rồi mới cho bấm)
      if (book) {
        toggleWishlist(book);
      }
    } else {
      // Nếu chưa đăng nhập, chuyển hướng sang trang login
      // và lưu lại trang này để quay lại
      nav('/login', { state: { from: location.pathname } }); 
    }
  };

  if (loading || !book) {
    return (
      <div className="container px-4 py-10">
        <button onClick={() => nav(-1)} className="inline-flex items-center gap-2 text-gray-600 hover:text-black mb-6">
          <ChevronLeft size={20} /> Quay lại
        </button>
        <div className="animate-pulse">Đang tải…</div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      {/* back */}
      <button onClick={() => nav(-1)} className="inline-flex items-center gap-2 text-gray-600 hover:text-black mb-4">
        <ChevronLeft size={20} /> Quay lại
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: cover */}
        <div>
          <div className="rounded-2xl border shadow-sm p-4 lg:p-6">
            <img
              src={book.image || "/placeholder.jpg"}
              alt={book.title}
              className="w-full rounded-xl object-contain"
              style={{ maxHeight: 560 }}
              onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
            />
          </div>
        </div>

        {/* RIGHT: info */}
        <div>
          <h1 className="text-3xl lg:text-4xl font-extrabold mb-2">{book.title}</h1>

          <p className="mb-2 text-gray-600">
            <span className="text-gray-500">Tác giả:</span>{" "}
            {Array.isArray(book.authors) && book.authors.length > 0 ? (
              <>
                {book.authors.map((a, i) => (
                  <span key={a.slug || a.name}>
                    <Link
                      to={`/authors/${encodeURIComponent(a.slug || slugify(a.name))}`}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      {a.name}
                    </Link>
                    {i < book.authors.length - 1 ? ", " : ""}
                  </span>
                ))}
              </>
            ) : book.author ? (
              book.authorSlug ? (
                <Link to={`/authors/${encodeURIComponent(book.authorSlug)}`} className="font-semibold text-blue-600 hover:underline">
                  {book.author}
                </Link>
              ) : (
                <span className="font-semibold">{book.author}</span>
              )
            ) : (
              <span className="font-semibold">Đang cập nhật</span>
            )}
          </p>

          {/* ✅ Rating trung bình: nằm DƯỚI tên và TRÊN giá */}
          <div className="flex items-center gap-2 mb-4">
            <Stars value={ratingSum.avg} />
            <span className="text-gray-600">
              {Number(ratingSum.avg || 0).toFixed(1)} · {ratingSum.cnt || 0} đánh giá
            </span>
          </div>

          {/* Price row */}
          <div className="flex items-center gap-4 mb-3">
            <span className="text-3xl font-extrabold text-rose-600">{toVND(book.price)}</span>
            {hasDiscount && (
              <>
                <span className="line-through text-gray-500">{toVND(book.originalPrice)}</span>
                <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-600 font-semibold text-sm">
                  -
                  {book.discountPercent ??
                    Math.round(((book.originalPrice - book.price) / book.originalPrice) * 100)}
                  %
                </span>
              </>
            )}
          </div>

          {/* Stock state + progress */}
          <div className="mb-4">
            {book.stock > 0 ? (
              <span className="inline-block mb-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                Còn hàng: {book.stock}
              </span>
            ) : (
              <span className="inline-block mb-2 px-3 py-1 rounded-full bg-rose-100 text-rose-600 text-sm font-semibold">
                Hết hàng
              </span>
            )}
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full"
                style={{ width: `${stockPercent}%`, background: "linear-gradient(90deg, #3A59D1, #7AC6D2, #B5FCCD)" }}
              />
            </div>
          </div>

          {/* Qty + actions */}
          <div className="flex items-center flex-wrap gap-4 mb-5">
            <div className="flex items-center border rounded-xl overflow-hidden">
              <button onClick={() => setQty((q) => clamp(q - 1, 1, 999))} className="p-3 hover:bg-gray-50">
                <Minus size={16} />
              </button>
              <span className="px-4 min-w-[2ch] text-center font-semibold">{qty}</span>
              <button onClick={() => setQty((q) => clamp(q + 1, 1, 999))} className="p-3 hover:bg-gray-50">
                <Plus size={16} />
              </button>
            </div>

            {/* ✅ Thêm vào giỏ */}
            <button
              onClick={handleAddToCart}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white shadow-sm hover:shadow transition"
              style={{ background: "linear-gradient(90deg, #3A59D1, #3D90D7)", textShadow: "0 1px 1px rgba(0,0,0,.25)" }}
              disabled={book.stock <= 0}
              title={book.stock <= 0 ? "Hết hàng" : "Thêm vào giỏ"}
            >
              <ShoppingCart size={18} /> Thêm vào giỏ
            </button>

            {/* ✅ Mua ngay */}
            <button
              onClick={() => {
                const q = Math.max(1, qty);
                cart.add(book, q);
                const pid = book.id || book._id;
                CartSvc.setBuyNow({ id: pid, qty: q });
                if (!user) {
                  nav(`/login?next=${encodeURIComponent("/cart?buy=1")}`);
                  return;
                }
                nav("/cart?buy=1");
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border hover:bg-gray-50"
              disabled={book.stock <= 0}
              title={book.stock <= 0 ? "Hết hàng" : "Mua ngay"}
            >
              Mua ngay
            </button>

            <button 
              onClick={toggleLike}
              className={`inline-flex items-center gap-2 px-3 py-3 rounded-xl 
                          ${liked ? 'bg-red-50 text-red-600' : 'hover:bg-gray-100'}`}
              aria-label="Yêu thích"
            >
              <Heart size={18} fill={liked ? 'currentColor' : 'none'} /> 
              {liked ? 'Đã thích' : 'Yêu thích'}
            </button>
          </div>

          {/* Description */}
          {book.description && <p className="text-gray-700 leading-relaxed">{book.description}</p>}
        </div>
      </div>

      {/* Reviews Section */}
      <ReviewSection
        bookId={book._id}
        onSummaryChanged={(s) => {
          // cập nhật live block sao bên trên
          setRatingSum({ avg: Number(s?.avg || 0), cnt: Number(s?.cnt || 0) });
        }}
      />

      {/* Related */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Sách liên quan</h2>
        {related.length === 0 ? (
          <div className="text-gray-500">Chưa có gợi ý.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {related.map((b) => (
              <RelatedCard key={b.id} b={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- small components ---------- */
function Stars({ value = 0 }) {
  const rounded = Math.round((Number(value) || 0) * 2) / 2; // làm tròn 0.5
  const full = Math.floor(rounded);
  const half = rounded - full >= 0.5;
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => {
        const isFull = i < full;
        const isHalf = i === full && half;
        return (
          <span key={i} className="relative w-4 h-4 mr-[2px] inline-block">
            <Star className={`w-4 h-4 ${isFull || isHalf ? "text-yellow-400" : "text-gray-300"}`} />
            {isHalf && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                <Star className="w-4 h-4 text-yellow-400" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function RelatedCard({ b }) {
  const hasDiscount = b.originalPrice > b.price && b.originalPrice > 0;
  return (
    <Link
      to={`/books/${b.slug || b.id}`}
      className="group border rounded-2xl p-3 hover:shadow-sm transition bg-white"
      title={b.title}
    >
      <div className="aspect-[3/4] rounded-xl bg-white grid place-items-center overflow-hidden mb-3">
        <img
          src={b.image || "/placeholder.jpg"}
          alt={b.title}
          className="max-h-full max-w-full object-contain group-hover:scale-[1.02] transition"
          onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
        />
      </div>
      <div className="text-sm text-gray-500 mb-1 line-clamp-1">{b.author || "—"}</div>
      <div className="font-semibold leading-snug line-clamp-2 mb-2 group-hover:text-indigo-700">
        {b.title}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-rose-600 font-bold">{toVND(b.price)}</span>
        {hasDiscount && <span className="line-through text-xs text-gray-500">{toVND(b.originalPrice)}</span>}
      </div>
    </Link>
  );
}

/* ================= Review Section (list + CTA) ================= */
function ReviewSection({ bookId, onSummaryChanged }) {
  const { user } = useAuth();
  const [can, setCan] = useState(false);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const limit = 5;

  // load quyền + list
  useEffect(() => {
    if (!bookId) return;
    (async () => {
      try {
        if (user) {
          const r = await ReviewAPI.canReview(bookId);
          setCan(!!r?.ok); // ✅ chỉ true nếu user đã mua & đơn delivered/completed
        } else setCan(false);
      } catch { setCan(false); }
      await loadPage(0);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, user?._id]);

  async function loadPage(p = 0) {
    try {
      const r = await ReviewAPI.listReviews(bookId, { limit, skip: p * limit });
      setItems(r?.items || []);
      setPage(p);
    } catch {}
  }

  const loginNext = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);

  return (
    <section id="reviews" className="mt-10">
      <h3 className="text-xl font-semibold mb-3">Đánh giá & nhận xét</h3>

      {/* ✅ Không còn form nhập. Chỉ hiện CTA tuỳ điều kiện */}
     {user ? (
        can ? (
          <div className="p-3 mb-4 rounded-lg border bg-green-50 text-green-800 flex items-center justify-between">
            <div>
              <div className="font-medium">Bạn đã mua sản phẩm này.</div>
              <div className="text-sm opacity-90">Hãy vào trang “Đánh giá sản phẩm” để gửi đánh giá.</div>
            </div>
            <Link to="/account/reviews" className="btn-primary px-4 py-2 rounded-lg">Viết đánh giá</Link>
          </div>
        ) : null // 👈 đăng nhập nhưng chưa đủ điều kiện → KHÔNG hiện gì
      ) : (
        <div className="p-3 mb-4 rounded-lg border bg-gray-50 text-gray-700">
          Vui lòng <Link to={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)}`} className="text-blue-600 underline">đăng nhập</Link> để xem quyền đánh giá.
        </div>
      )}

      {/* Danh sách nhận xét */}
      <div className="space-y-3">
        {items.map((rv) => (
          <div key={rv._id} className="p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <img
                src={rv.userId?.avatar || "/avatar.png"}
                onError={(e) => { e.currentTarget.src = "/avatar.png"; }}
                className="w-8 h-8 rounded-full object-cover"
                alt=""
              />
              <div>
                <div className="font-medium">{rv.userId?.name || rv.userId?.email || "Người dùng"}</div>
                <div className="text-xs text-gray-500">{new Date(rv.createdAt).toLocaleString("vi-VN")}</div>
                {rv.verifiedPurchase && (
                  <span className="inline-block text-[12px] px-2 py-[2px] rounded bg-emerald-100 text-emerald-700 mt-1">
                    Đã mua xác thực
                  </span>
                )}
              </div>
              <div className="ml-auto text-amber-400">
                {"★".repeat(rv.rating)}{"☆".repeat(5 - rv.rating)}
              </div>
            </div>
            {rv.title && <div className="mt-2 font-medium">{rv.title}</div>}
            {rv.content && <div className="mt-1 text-sm text-gray-700 whitespace-pre-line">{rv.content}</div>}
          </div>
        ))}
        {items.length === 0 && <div className="text-gray-600">Chưa có nhận xét nào</div>}

        <div className="flex justify-center gap-2 pt-2">
          <button className="btn bg-gray-100 hover:bg-gray-200" disabled={page === 0} onClick={() => loadPage(page - 1)}>
            Trước
          </button>
          <button
            className="btn bg-gray-100 hover:bg-gray-200"
            disabled={items.length < limit}
            onClick={() => loadPage(page + 1)}
          >
            Sau
          </button>
        </div>
      </div>
    </section>
  );
}
