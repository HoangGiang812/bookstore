import { useState } from "react";
import { FiShoppingCart } from "react-icons/fi";
import { Link } from "react-router-dom";

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

/* -------------------- FX helpers -------------------- */
function rippleAt(el, e) {
  try {
    const rect = el.getBoundingClientRect();
    const r = document.createElement("span");
    r.className = "fx-ripple";
    r.style.left = `${e.clientX - rect.left}px`;
    r.style.top = `${e.clientY - rect.top}px`;
    el.appendChild(r);
    setTimeout(() => r.remove(), 600);
  } catch {}
}

function flyToCart(fromEl, imageSrc) {
  const cartTarget =
    document.querySelector("[data-cart-target]") ||
    document.querySelector(".cart-icon") ||
    document.querySelector('a[href="/cart"]');
  if (!cartTarget || !fromEl) return;

  const from = fromEl.getBoundingClientRect();
  const to = cartTarget.getBoundingClientRect();

  const img = document.createElement("img");
  img.src = imageSrc || FALLBACK_SVG;
  img.alt = "book";
  img.className = "fx-fly";
  img.style.setProperty("--start-x", `${from.left + from.width / 2}px`);
  img.style.setProperty("--start-y", `${from.top + from.height / 2}px`);
  img.style.setProperty("--end-x", `${to.left + to.width / 2}px`);
  img.style.setProperty("--end-y", `${to.top + to.height / 2}px`);
  document.body.appendChild(img);

  cartTarget.classList.add("fx-cart-shake");
  setTimeout(() => cartTarget.classList.remove("fx-cart-shake"), 700);
  setTimeout(() => img.remove(), 820);
}
/* ---------------------------------------------------- */

export default function DealCard({ book = {}, onAdd, onBuy }) {
  const [liked, setLiked] = useState(false);

  const price = Number(book.price ?? 0);
  const originalPrice = Number(book.originalPrice ?? 0);
  const hasDiscount = originalPrice > price && originalPrice > 0;
  const discount = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  const id = book.id || book._id;
  const slug = book.slug;
  const bookUrl = slug ? `/books/${slug}` : id ? `/books/${id}` : "#";

  const toggleLike = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked((s) => !s);
  };

  // ✅ Thêm giỏ: không yêu cầu đăng nhập
  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    rippleAt(e.currentTarget, e);
    flyToCart(e.currentTarget, safe(book.image || book.cover || book.coverUrl));

    if (typeof onAdd === "function") {
      onAdd(book);
    } else {
      // fallback: phát event cho app bắt
      window.dispatchEvent(new CustomEvent("add-to-cart", { detail: book }));
    }

    // bump Header badge ngay
    try {
      localStorage.setItem("__cart_bump__", String(Date.now()));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("cart:changed"));
    } catch {}
  };

  // ✅ Mua ngay: để parent xử lý đăng nhập + setBuyNow
  const handleBuyNow = (e) => {
    e.preventDefault();
    e.stopPropagation();

    rippleAt(e.currentTarget, e);

    if (typeof onBuy === "function") {
      onBuy(book);
    } else {
      // fallback: phát event nếu bạn muốn lắng nghe ở cấp app
      window.dispatchEvent(new CustomEvent("buy-now", { detail: book }));
    }
  };

  return (
    <div className="group">
      <Link
        to={bookUrl}
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
          onError={(e) => {
            e.currentTarget.src = FALLBACK_SVG;
          }}
        />

        {/* Hàng nút */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition">
          <button
            onClick={handleAddToCart}
            className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full text-white shadow fx-btn"
            style={{ background: "var(--cta-grad)" }}
            aria-label="Thêm vào giỏ hàng"
            title="Thêm vào giỏ hàng"
          >
            <FiShoppingCart className="h-6 w-6" style={{ strokeWidth: 2.5 }} />
          </button>

          <button
            onClick={handleBuyNow}
            className="pointer-events-auto h-12 px-6 rounded-lg font-semibold text-white shadow fx-btn"
            style={{ background: "var(--buy-grad)", textShadow: "0 1px 2px rgba(0,0,0,.35)" }}
            aria-label="Mua ngay"
            title="Mua ngay"
          >
            Mua ngay
          </button>
        </div>

        <div className="absolute inset-x-3 bottom-3 z-10">
          <div
            className="h-1.5 rounded-full w-[175px] max-w-[80%] mx-auto group-hover:opacity-0 transition-opacity"
            style={{ background: "linear-gradient(to right, var(--brand), var(--brand-light), #B5FCCD)" }}
          />
        </div>
      </Link>

      <div className="mt-3">
        <Link to={bookUrl} className="block text-base font-semibold leading-snug hover:underline" title={book.title}>
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

      {/* FX CSS (có thể đưa vào globals.css) */}
      <style>{`
        .fx-btn { position: relative; overflow: hidden; transform: translateZ(0); }
        .fx-btn:active { transform: scale(.96); }

        .fx-ripple {
          position: absolute;
          width: 14px; height: 14px;
          margin: -7px 0 0 -7px;
          border-radius: 999px;
          background: rgba(255,255,255,.55);
          pointer-events: none;
          animation: fx-ripple .6s ease-out forwards;
        }
        @keyframes fx-ripple {
          from { transform: scale(0); opacity: .9; }
          to   { transform: scale(16); opacity: 0; }
        }

        .fx-fly {
          position: fixed;
          left: var(--start-x); top: var(--start-y);
          width: 64px; height: 84px;
          object-fit: cover;
          border-radius: 6px;
          box-shadow: 0 6px 16px rgba(0,0,0,.15);
          z-index: 9999;
          background: #fff;
          animation: fx-fly .8s cubic-bezier(.45,.05,.55,.95) forwards;
        }
        @keyframes fx-fly {
          0% {
            transform: translate(-50%,-50%) scale(1);
            opacity: 1;
          }
          55% {
            transform: translate(
              calc((var(--end-x) - var(--start-x)) * .55 - 50%),
              calc((var(--end-y) - var(--start-y)) * .55 - 50% - 120px)
            ) scale(.85);
            opacity: .9;
          }
          100% {
            transform: translate(
              calc(var(--end-x) - var(--start-x) - 50%),
              calc(var(--end-y) - var(--start-y) - 50%)
            ) scale(.25);
            opacity: 0;
          }
        }

        .fx-cart-shake { animation: fx-shake .6s ease-in-out; }
        @keyframes fx-shake {
          0%,100% { transform: translateX(0); }
          10%,30%,50%,70%,90% { transform: translateX(-3px); }
          20%,40%,60%,80%     { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
