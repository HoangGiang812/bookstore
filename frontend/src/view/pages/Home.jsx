import { useEffect, useMemo, useState } from "react";
import PromoSlider from "../components/PromoSlider.jsx";
import DealCard from "../components/DealCard.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import api from "../../services/api.js";

// helpers
const windowSlice = (list, start, size) => {
  const n = list?.length || 0;
  if (!n) return [];
  const s = Math.max(0, Math.min(start, Math.max(0, n - size)));
  return list.slice(s, s + size);
};
const WINDOW = 5;
const AUTHOR_WINDOW = 6;

// --- NEW: convert any string price ("320.000đ") to number 320000
const toNumber = (v) =>
  typeof v === "number"
    ? v
    : typeof v === "string"
    ? Number(v.replace(/[^\d]/g, "")) || 0
    : 0;

// --- NEW: extract array from common API shapes
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

// --- NEW: normalize a book object into the shape DealCard expects
const normalizeBook = (b) => {
  const priceValue   = toNumber(b?.price?.sale ?? b?.salePrice ?? b?.price);
  const originalVal  = toNumber(b?.price?.value ?? b?.originalPrice ?? b?.price);
  const image =
    b?.images?.[0]?.url || b?.cover?.url || b?.coverUrl || b?.image || "/placeholder.png";

  // try discount% from API if exists, else compute
  const rawDiscount = toNumber(b?.discount);
  const hasDisc = originalVal > 0 && priceValue > 0 && originalVal > priceValue;
  const discount =
    rawDiscount > 0
      ? rawDiscount
      : hasDisc
      ? Math.round(((originalVal - priceValue) / originalVal) * 100)
      : 0;

  return {
    id: b._id || b.id,
    title: b.title || b.name || "—",
    image,
    price: priceValue,
    originalPrice: originalVal,
    discount,
  };
};

export default function Home() {
  const [bests, setBests] = useState([]);
  const [news, setNews] = useState([]);
  const [deals, setDeals] = useState([]);
  const [authors, setAuthors] = useState([]);

  const [bestStart, setBestStart] = useState(0);
  const [newStart, setNewStart] = useState(0);
  const [dealStart, setDealStart] = useState(0);
  const [authorStart, setAuthorStart] = useState(0);

  const promoItems = [
    { id: "p1", title: "Giảm đến 50%", subtitle: "Ưu đãi sách hot cuối tuần", cta: "Mua ngay", to: "/deals", bg: "from-purple-600 to-indigo-600" },
    { id: "p2", title: "Sách mới cập bến", subtitle: "Khám phá bộ sưu tập 2025", cta: "Xem ngay", to: "/books?sort=newest", bg: "from-emerald-600 to-teal-600" },
    { id: "p3", title: "Tác giả nổi bật", subtitle: "Tuyển tập được yêu thích", cta: "Khám phá", to: "/authors", bg: "from-rose-600 to-orange-600" },
  ];

  useEffect(() => {
    Promise.all([
      api.get("/api/books",   { params: { group: "bestsellers", limit: 50 } }),
      api.get("/api/books",   { params: { group: "new",         limit: 50 } }),
      api.get("/api/books",   { params: { group: "deals",       limit: 50 } }),
      api.get("/api/authors", { params: { limit: 50 } }),
    ])
      .then(([b1, b2, b3, a]) => {
        // IMPORTANT: normalize before set
        setBests(extractItems(b1).map(normalizeBook));
        setNews(extractItems(b2).map(normalizeBook));
        setDeals(extractItems(b3).map(normalizeBook));
        setAuthors(extractItems(a));
      })
      .catch(console.error);
  }, []);

  const bestMax   = Math.max(0, (bests?.length   || 0) - WINDOW);
  const newMax    = Math.max(0, (news?.length    || 0) - WINDOW);
  const dealMax   = Math.max(0, (deals?.length   || 0) - WINDOW);
  const authorMax = Math.max(0, (authors?.length || 0) - AUTHOR_WINDOW);

  const bestItems   = useMemo(() => windowSlice(bests,   bestStart,   WINDOW),        [bests, bestStart]);
  const newItems    = useMemo(() => windowSlice(news,    newStart,    WINDOW),        [news, newStart]);
  const dealItems   = useMemo(() => windowSlice(deals,   dealStart,   WINDOW),        [deals, dealStart]);
  const authorItems = useMemo(() => windowSlice(authors, authorStart, AUTHOR_WINDOW), [authors, authorStart]);

  return (
    <div className="min-h-screen">
      {/* HERO / PROMO SLIDER */}
      <section className="py-0">
        <div className="mx-auto max-w-7xl px-0 md:px-4">
          <PromoSlider items={promoItems} autoRange={[5000, 9000]} />
        </div>
      </section>

      {/* Best loved */}
      <section className="py-8 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeader title="Sách được yêu thích nhất" subtitle="" />
          <div className="relative">
            <button onClick={() => setBestStart(p => Math.max(0, p - 1))} disabled={bestStart === 0}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-3 py-2 shadow disabled:opacity-40">←</button>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {bestItems.map(b => <DealCard key={b.id} book={b} />)}
            </div>
            <button onClick={() => setBestStart(p => Math.min(bestMax, p + 1))} disabled={bestStart >= bestMax}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-3 py-2 shadow disabled:opacity-40">→</button>
          </div>
        </div>
      </section>

      {/* New */}
      <section className="py-8 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeader title="Sách mới" subtitle="Vừa cập bến" />
          <div className="relative">
            <button onClick={() => setNewStart(p => Math.max(0, p - 1))} disabled={newStart === 0}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-3 py-2 shadow disabled:opacity-40">←</button>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {newItems.map(b => <DealCard key={b.id} book={b} />)}
            </div>
            <button onClick={() => setNewStart(p => Math.min(newMax, p + 1))} disabled={newStart >= newMax}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-3 py-2 shadow disabled:opacity-40">→</button>
          </div>
        </div>
      </section>

      {/* Authors */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeader title="Các tác giả" subtitle="Gặp gỡ những cái tên quen thuộc" to="/authors" />
          <div className="relative">
            <button onClick={() => setAuthorStart(p => Math.max(0, p - 1))} disabled={authorStart === 0}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-3 py-2 shadow disabled:opacity-40">←</button>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4 items-start">
              {authorItems.map(a => (
                <div key={a.id || a._id} className="text-center">
                  <div className="mx-auto h-[106px] w-[106px] rounded-full overflow-hidden bg-white border shadow-sm grid place-items-center">
                    <img src={a.avatar} alt={a.name} className="h-full w-full object-cover grayscale hover:grayscale-0 transition" />
                  </div>
                  <div className="mt-3 text-sm md:text-base font-medium leading-snug">{a.name}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setAuthorStart(p => Math.min(authorMax, p + 1))} disabled={authorStart >= authorMax}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-3 py-2 shadow disabled:opacity-40">→</button>
          </div>
        </div>
      </section>

      {/* Deals */}
      <section className="py-8 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeader title="Mới phát hành" subtitle="Khuyến mãi đặc biệt" />
          <div className="relative">
            <button onClick={() => setDealStart(p => Math.max(0, p - 1))} disabled={dealStart === 0}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-3 py-2 shadow disabled:opacity-40">←</button>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {dealItems.map(b => <DealCard key={b.id} book={b} />)}
            </div>
            <button onClick={() => setDealStart(p => Math.min(dealMax, p + 1))} disabled={dealStart >= dealMax}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full border bg-white/90 px-3 py-2 shadow disabled:opacity-40">→</button>
          </div>
        </div>
      </section>
    </div>
  );
}
