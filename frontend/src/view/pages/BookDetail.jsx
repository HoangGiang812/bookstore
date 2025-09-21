// src/view/pages/BookDetail.jsx
import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Minus, Plus, ShoppingCart, Heart, Star } from "lucide-react";
import { useCart } from "../../store/useCart";
import { useAuth } from "../../store/useAuth";
import * as Catalog from "../../services/catalog";

/* --------- helpers --------- */
const toVND = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* =================================================================== */

export default function BookDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const cart = useCart();
  const { user } = useAuth();

  const [qty, setQty] = useState(1);
  const [book, setBook] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---- fetch main book + related ----
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const b = await Catalog.getBook(id);
        if (!mounted) return;
        // Chuẩn hóa tối thiểu các field để render an toàn
        const normalized = {
          id: b._id || b.id,
          title: b.title,
          author:
            b.author ||
            (Array.isArray(b.authorNames) ? b.authorNames.join(", ") : b.authorName) ||
            "",
          image: b.coverUrl || b.image,
          price: Number(b.salePrice ?? b.price ?? 0),
          originalPrice:
            Number(
              b.originalPrice ??
                b.priceOriginal ??
                (b.discountPercent > 0 && b.price
                  ? Math.round(Number(b.price) / (1 - Number(b.discountPercent) / 100))
                  : b.price)
            ) || 0,
          discountPercent:
            b.discountPercent ??
            (b.originalPrice && b.price && b.originalPrice > b.price
              ? Math.round(((b.originalPrice - b.price) / b.originalPrice) * 100)
              : 0),
          rating: Number(b.rating ?? 0),
          ratingCount: Number(b.ratingCount ?? b.reviewsCount ?? 0),
          stock: Number(b.stock ?? 0),
          description: b.description || "",
        };
        setBook(normalized);

        // ---- related: ưu tiên API /related, nếu không có: theo tác giả/tiêu đề ----
        let rel = [];
        try {
          rel = await Catalog.relatedBooks(b);
        } catch {
          /* ignore */
        }
        if (!rel || rel.length === 0) {
          // fallback theo tác giả
          if (normalized.author) {
            try {
              rel = await Catalog.getBooks({ q: normalized.author, limit: 12 });
            } catch {}
          }
        }
        if ((!rel || rel.length === 0) && normalized.title) {
          // fallback theo từ khóa tiêu đề
          try {
            rel = await Catalog.getBooks({
              q: normalized.title.split(" ").slice(0, 2).join(" "),
              limit: 12,
            });
          } catch {}
        }
        // lọc bỏ chính nó + chuẩn hóa tối thiểu
        const cleaned =
          (rel || [])
            .filter((r) => (r._id || r.id) !== normalized.id)
            .map((r) => ({
              id: r._id || r.id,
              title: r.title,
              author: r.author || r.authorName || "",
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
              rating: Number(r.rating ?? 0),
            }))
            .slice(0, 12) || [];

        setRelated(cleaned);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const hasDiscount =
    book && book.originalPrice > book.price && book.originalPrice > 0;

  const stockPercent = useMemo(() => {
    if (!book) return 0;
    const cap = Math.max(10, book.stock || 0);
    return clamp(((book.stock || 0) / cap) * 100, 0, 100);
  }, [book]);

  if (loading || !book) {
    return (
      <div className="container px-4 py-10">
        <button
          onClick={() => nav(-1)}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-black mb-6"
        >
          <ChevronLeft size={20} /> Quay lại
        </button>
        <div className="animate-pulse">Đang tải…</div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      {/* back */}
      <button
        onClick={() => nav(-1)}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-black mb-4"
      >
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
          <h1 className="text-3xl lg:text-4xl font-extrabold mb-2">
            {book.title}
          </h1>
          <p className="mb-3 text-gray-600">
            <span className="text-gray-500">Tác giả:</span>{" "}
            <span className="font-semibold">{book.author || "Đang cập nhật"}</span>
          </p>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <Stars value={book.rating} />
            <span className="text-gray-600">
              {book.rating?.toFixed ? book.rating.toFixed(1) : book.rating} ·{" "}
              {book.ratingCount || 0} đánh giá
            </span>
          </div>

          {/* Price row */}
          <div className="flex items-center gap-4 mb-3">
            <span className="text-3xl font-extrabold text-rose-600">
              {toVND(book.price)}
            </span>
            {hasDiscount && (
              <>
                <span className="line-through text-gray-500">
                  {toVND(book.originalPrice)}
                </span>
                <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-600 font-semibold text-sm">
                  -{book.discountPercent ?? Math.round(((book.originalPrice - book.price) / book.originalPrice) * 100)}%
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
                style={{
                  width: `${stockPercent}%`,
                  background:
                    "linear-gradient(90deg, #3A59D1, #7AC6D2, #B5FCCD)",
                }}
              />
            </div>
          </div>

          {/* Qty + add to cart */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center border rounded-xl overflow-hidden">
              <button
                onClick={() => setQty((q) => clamp(q - 1, 1, 999))}
                className="p-3 hover:bg-gray-50"
              >
                <Minus size={16} />
              </button>
              <span className="px-4 min-w-[2ch] text-center font-semibold">
                {qty}
              </span>
              <button
                onClick={() => setQty((q) => clamp(q + 1, 1, 999))}
                className="p-3 hover:bg-gray-50"
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              onClick={() => cart.add(book, qty)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white shadow-sm hover:shadow transition"
              style={{
                background: "linear-gradient(90deg, #3A59D1, #3D90D7)",
                textShadow: "0 1px 1px rgba(0,0,0,.25)",
              }}
              disabled={book.stock <= 0}
              title={book.stock <= 0 ? "Hết hàng" : "Thêm vào giỏ"}
            >
              <ShoppingCart size={18} /> Thêm vào giỏ
            </button>

            <button className="inline-flex items-center gap-2 px-3 py-3 rounded-xl hover:bg-gray-100">
              <Heart size={18} /> Yêu thích
            </button>
          </div>

          {/* Description */}
          {book.description && (
            <p className="text-gray-700 leading-relaxed">
              {book.description}
            </p>
          )}
        </div>
      </div>

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
  const n = Math.round(value);
  return (
    <div className="flex">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < n ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

function RelatedCard({ b }) {
  const hasDiscount = b.originalPrice > b.price && b.originalPrice > 0;
  return (
    <Link
      to={`/book/${b.id}`}
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
      <div className="text-sm text-gray-500 mb-1 line-clamp-1">
        {b.author || "—"}
      </div>
      <div className="font-semibold leading-snug line-clamp-2 mb-2 group-hover:text-indigo-700">
        {b.title}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-rose-600 font-bold">{toVND(b.price)}</span>
        {hasDiscount && (
          <span className="line-through text-xs text-gray-500">
            {toVND(b.originalPrice)}
          </span>
        )}
      </div>
    </Link>
  );
}
