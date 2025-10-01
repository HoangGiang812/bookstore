// src/components/DealCard.jsx
import { useState } from "react";
import { FiShoppingCart } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/useAuth";

const FALLBACK_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='600'>
     <rect fill='#eee' width='100%' height='100%'/>
     <text x='50%' y='50%' text-anchor='middle' font-family='system-ui'
           font-size='18' fill='#888'>No Image</text>
   </svg>`
)}`;

const safe = (v) =>
  typeof v === "string" && (v.startsWith("data:") || /^https?:\/\//.test(v))
    ? v
    : FALLBACK_SVG;

export default function DealCard({ book = {}, onAdd, onBuy }) {
  const [liked, setLiked] = useState(false);
  const { user } = useAuth();
  const nav = useNavigate();

  const price = Number(book.price ?? 0);
  const originalPrice = Number(book.originalPrice ?? 0);
  const hasDiscount = originalPrice > price && originalPrice > 0;
  const discount = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  const id = book.id || book._id;

  const toggleLike = (e) => {
    e.preventDefault(); e.stopPropagation();
    setLiked((s) => !s);
  };

  const addToCart = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (typeof onAdd === "function") onAdd(book);
    else window.dispatchEvent(new CustomEvent("add-to-cart", { detail: book }));
  };

  const buyNow = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (typeof onBuy === "function") onBuy(book);
    else {
      window.dispatchEvent(new CustomEvent("add-to-cart", { detail: book }));
      if (!user) nav("/login?next=/cart");
      else nav("/cart");
    }
  };

  return (
    <div className="group">
      <Link
        to={id ? `/book/${id}` : "#"}
        className="relative block w-full h-[360px] md:h-[420px] rounded-2xl overflow-hidden border bg-white hover:shadow-md transition grid place-items-center"
      >
        {hasDiscount && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-[var(--color-danger)] px-2.5 py-1 text-xs font-semibold text-white">
            -{discount}%
          </span>
        )}

        <button
          onClick={toggleLike}
          aria-label="Yêu thích"
          className={`absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 border shadow ${
            liked ? "text-[var(--color-danger)]" : "text-gray-700"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7">
            <path d="M12 21s-7-4.35-9.33-7.33A5.86 5.86 0 0 1 3 4.67 5.33 5.33 0 0 1 8.33 4c1.9 0 3.05 1.09 3.67 2 .62-.91 1.77-2 3.67-2A5.33 5.33 0 0 1 21 4.67a5.86 5.86 0 0 1 .33 9C19 16.65 12 21 12 21Z" />
          </svg>
        </button>

        <img
          src={safe(book.image || book.cover || book.coverUrl)}
          alt={book.title || "Book cover"}
          className="w-[175px] h-[244px] object-contain duration-300 group-hover:scale-[1.01]"
          onError={(e) => { e.currentTarget.src = FALLBACK_SVG; }}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition">
          <button
            onClick={addToCart}
            className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full text-white shadow"
            style={{ background: "var(--cta-grad)" }}
          >
            <FiShoppingCart className="h-6 w-6" style={{ strokeWidth: 2.5 }} />
          </button>
          <button
            onClick={buyNow}
            className="pointer-events-auto h-12 px-6 rounded-lg font-semibold text-white shadow"
            style={{ background: "var(--buy-grad)", textShadow: "0 1px 2px rgba(0,0,0,.35)" }}
          >
            Mua ngay
          </button>
        </div>

        <div className="absolute inset-x-3 bottom-3 z-10">
          <div className="h-1.5 rounded-full w-[175px] max-w-[80%] mx-auto group-hover:opacity-0 transition-opacity"
               style={{ background: "linear-gradient(to right, var(--brand), var(--brand-light), #B5FCCD)" }} />
        </div>
      </Link>

      <div className="mt-3">
        <Link to={id ? `/book/${id}` : "#"} className="block text-base font-semibold leading-snug hover:underline">
          {book.title || "Sách chưa đặt tên"}
        </Link>

        <div className="mt-2 flex items-baseline gap-3">
          <div className="text-2xl font-extrabold text-[var(--color-price)]">
            {price.toLocaleString("vi-VN")}đ
          </div>
          {hasDiscount && (
            <div className="text-gray-400 line-through">
              {originalPrice.toLocaleString("vi-VN")}đ
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
