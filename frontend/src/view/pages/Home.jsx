// src/view/pages/Home.jsx
import { useEffect, useMemo, useState } from "react";
import PromoSlider from "../components/PromoSlider.jsx";
import DealCard from "../components/DealCard.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import api, { getImageUrl } from "../../services/api.js";
import { useCart } from "../../store/useCart";
import { useAuth } from "../../store/useAuth";
import { useNavigate } from "react-router-dom";

// helpers
const windowSlice = (list, start, size) => {
  const n = list?.length || 0;
  if (!n) return [];
  const s = Math.max(0, Math.min(start, Math.max(0, n - size)));
  return list.slice(s, s + size);
};

const WINDOW = 5;
const AUTHOR_WINDOW = 6;

const toNumber = (v) =>
  typeof v === "number"
    ? v
    : typeof v === "string"
    ? Number(v.replace(/[^\d]/g, "")) || 0
    : 0;

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

// Chuẩn hoá book + xử lý luôn URL ảnh (kể cả /uploads)
const normalizeBook = (b) => {
  const originalPrice = toNumber(b?.price ?? 0);
  const discountPercent = toNumber(
    b?.discountPercent ?? b?.discount ?? 0
  );
  const hasDiscount = discountPercent > 0 && originalPrice > 0;

  const price =
    toNumber(b?.salePrice ?? 0) > 0
      ? toNumber(b.salePrice)
      : hasDiscount
      ? Math.round(originalPrice * (1 - discountPercent / 100))
      : originalPrice;

  const imageRaw =
    b?.images?.[0]?.url ||
    b?.cover?.url ||
    b?.coverUrl ||
    b?.image ||
    "";

  const image = getImageUrl(imageRaw || "/placeholder.png");

  return {
    id: b._id || b.id,
    slug: b.slug || null,
    title: b.title || b.name || "—",
    image,
    price,
    originalPrice,
    discount: discountPercent,
    discountPercent,
  };
};

// Helper lấy avatar tác giả (support cả uploads & URL ngoài)
const getAuthorAvatar = (a) =>
  getImageUrl(
    a.avatar ||
      a.avatarUrl ||
      a.photoUrl ||
      a.imageUrl ||
      a.image ||
      a.picture ||
      ""
  );

export default function Home() {
  const [bests, setBests] = useState([]);
  const [news, setNews] = useState([]);
  const [deals, setDeals] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [promoItems, setPromoItems] = useState([]);

  const [bestStart, setBestStart] = useState(0);
  const [newStart, setNewStart] = useState(0);
  const [dealStart, setDealStart] = useState(0);
  const [authorStart, setAuthorStart] = useState(0);

  const cart = useCart();
  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get("/api/books", {
        params: { group: "bestsellers", limit: 50 },
      }),
      api.get("/api/books", {
        params: { group: "new", limit: 50 },
      }),
      api.get("/api/books", {
        params: { group: "deals", limit: 50 },
      }),
      api.get("/api/authors", { params: { limit: 50 } }),
      api.get("/api/public/banners"),
    ])
      .then(([b1, b2, b3, a, bannersRes]) => {
        // books & authors
        setBests(extractItems(b1).map(normalizeBook));
        setNews(extractItems(b2).map(normalizeBook));
        setDeals(extractItems(b3).map(normalizeBook));
        setAuthors(extractItems(a));

        // banners -> chuẩn hoá cho PromoSlider
        const raw = extractItems(bannersRes?.data ?? bannersRes);

        const mapped = raw
          .filter((b) => {
            const active = b.active !== false; // mặc định true
            const rightPos =
              !b.position || b.position === "home-hero"; // chỉ hero
            const imgRaw = b.imageUrl || b.image || b.coverUrl;
            return active && rightPos && !!imgRaw;
          })
          .sort((a, b) => (a.sort || 0) - (b.sort || 0))
          .map((b, idx) => {
            const imgRaw = b.imageUrl || b.image || b.coverUrl;
            const img = getImageUrl(imgRaw);
            return {
              id: b._id || b.id || idx,
              title: b.title || "",
              subtitle: b.subtitle || "",
              cta: b.ctaText || "",
              to: b.link || "#",
              bg: img,
              image: img,
              imageUrl: img,
            };
          });

        setPromoItems(mapped);
      })
      .catch((err) => {
        console.error("Load home data error:", err);
      });
  }, []);

  const bestMax = Math.max(0, (bests?.length || 0) - WINDOW);
  const newMax = Math.max(0, (news?.length || 0) - WINDOW);
  const dealMax = Math.max(0, (deals?.length || 0) - WINDOW);
  const authorMax = Math.max(0, (authors?.length || 0) - AUTHOR_WINDOW);

  const bestItems = useMemo(
    () => windowSlice(bests, bestStart, WINDOW),
    [bests, bestStart]
  );
  const newItems = useMemo(
    () => windowSlice(news, newStart, WINDOW),
    [news, newStart]
  );
  const dealItems = useMemo(
    () => windowSlice(deals, dealStart, WINDOW),
    [deals, dealStart]
  );
  const authorItems = useMemo(
    () => windowSlice(authors, authorStart, AUTHOR_WINDOW),
    [authors, authorStart]
  );

  const handleAdd = (bk) => cart.add(bk, 1);
  const handleBuy = (bk) => {
    cart.add(bk, 1);
    if (!user) nav("/login?next=/cart");
    else nav("/cart");
  };

  return (
    <div className="min-h-screen">
      {/* HERO / PROMO SLIDER - KHÔNG DÙNG <section> ĐỂ TRÁNH MARGIN GLOBAL */}
      {promoItems.length > 0 && (
        <div className="home-hero m-0 p-0">
          <div className="mx-auto max-w-7xl px-0 md:px-4">
            <PromoSlider items={promoItems} autoRange={[5000, 9000]} />
          </div>
        </div>
      )}

      {/* Best loved */}
      <section className="py-8 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeader title="Sách được yêu thích nhất" subtitle="" />
          <div className="relative">
            <button
              onClick={() => setBestStart((p) => Math.max(0, p - 1))}
              disabled={bestStart === 0}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-3 py-2 shadow disabled:opacity-40"
            >
              ←
            </button>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {bestItems.map((b) => (
                <DealCard
                  key={b.id}
                  book={b}
                  onAdd={handleAdd}
                  onBuy={handleBuy}
                />
              ))}
            </div>
            <button
              onClick={() => setBestStart((p) => Math.min(bestMax, p + 1))}
              disabled={bestStart >= bestMax}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-3 py-2 shadow disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      </section>

      {/* New */}
      <section className="py-8 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeader title="Sách mới" subtitle="Vừa cập bến" />
          <div className="relative">
            <button
              onClick={() => setNewStart((p) => Math.max(0, p - 1))}
              disabled={newStart === 0}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-3 py-2 shadow disabled:opacity-40"
            >
              ←
            </button>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {newItems.map((b) => (
                <DealCard
                  key={b.id}
                  book={b}
                  onAdd={handleAdd}
                  onBuy={handleBuy}
                />
              ))}
            </div>
            <button
              onClick={() => setNewStart((p) => Math.min(newMax, p + 1))}
              disabled={newStart >= newMax}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-3 py-2 shadow disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      </section>

      {/* Authors */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeader
            title="Các tác giả"
            subtitle="Gặp gỡ những cái tên quen thuộc"
            to="/authors"
          />
          <div className="relative">
            <button
              onClick={() => setAuthorStart((p) => Math.max(0, p - 1))}
              disabled={authorStart === 0}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-3 py-2 shadow disabled:opacity-40"
            >
              ←
            </button>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4 items-start">
              {authorItems.map((a) => {
                const avatar = getAuthorAvatar(a);
                return (
                  <div key={a.id || a._id} className="text-center">
                    <div className="mx-auto h-[106px] w-[106px] rounded-full overflow-hidden bg-white border shadow-sm grid place-items-center">
                      <img
                        src={avatar}
                        alt={a.name}
                        className="h-full w-full object-cover grayscale hover:grayscale-0 transition"
                      />
                    </div>
                    <div className="mt-3 text-sm md:text-base font-medium leading-snug">
                      {a.name}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() =>
                setAuthorStart((p) => Math.min(authorMax, p + 1))
              }
              disabled={authorStart >= authorMax}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-3 py-2 shadow disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      </section>

      {/* Deals */}
      <section className="py-8 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeader
            title="Mới phát hành"
            subtitle="Khuyến mãi đặc biệt"
          />
          <div className="relative">
            <button
              onClick={() => setDealStart((p) => Math.max(0, p - 1))}
              disabled={dealStart === 0}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-3 py-2 shadow disabled:opacity-40"
            >
              ←
            </button>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {dealItems.map((b) => (
                <DealCard
                  key={b.id}
                  book={b}
                  onAdd={handleAdd}
                  onBuy={handleBuy}
                />
              ))}
            </div>
            <button
              onClick={() => setDealStart((p) => Math.min(dealMax, p + 1))}
              disabled={dealStart >= dealMax}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-3 py-2 shadow disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      </section>

      {/* ép chắc chắn hero không có margin/padding thừa nếu có CSS global */}
      <style>{`
        .home-hero {
          margin-top: 0 !important;
          padding-top: 0 !important;
        }
      `}</style>
    </div>
  );
}
