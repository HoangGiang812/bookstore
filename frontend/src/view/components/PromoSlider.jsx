import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

export default function PromoSlider({
  items = [],            // cho phép rỗng
  auto = 6000,
  autoRange,             // [minMs, maxMs]
}) {
  const [i, setI] = useState(0);
  const [pause, setPause] = useState(false);
  const timerRef = useRef(null);

  const len = Array.isArray(items) ? items.length : 0;

  // Nếu không có slide thì ẩn hẳn section
  if (!len) return null;

  // Auto next với khoảng thời gian linh hoạt
  useEffect(() => {
    if (pause || len <= 1) return; // không tự chạy nếu <2 slide

    const delay =
      Array.isArray(autoRange) && autoRange.length === 2
        ? Math.floor(Math.random() * (autoRange[1] - autoRange[0] + 1)) + autoRange[0]
        : auto || 6000;

    timerRef.current = setTimeout(() => {
      setI((p) => (p + 1) % len);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [i, pause, len, auto, autoRange]);

  // Điều khiển bằng phím trái/phải (bảo vệ khi thiếu window)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") setI((p) => (p - 1 + len) % len);
      if (e.key === "ArrowRight") setI((p) => (p + 1) % len);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [len]);

  // Nếu số slide thay đổi và index vượt biên → quay về 0
  useEffect(() => {
    setI((p) => (p >= len ? 0 : p));
  }, [len]);

  const goto = (n) => setI(((n % len) + len) % len);

  return (
    <section className="relative overflow-hidden">
      <div
        className="relative h-[360px] md:h-[520px]"
        onMouseEnter={() => setPause(true)}
        onMouseLeave={() => setPause(false)}
      >
        {items.map((s, idx) => (
          <div
            key={s.id ?? idx}
            className={`absolute inset-0 transition-opacity duration-700 ${idx === i ? "opacity-100" : "opacity-0"}`}
            aria-hidden={idx !== i}
          >
            <div className={`w-full h-full bg-gradient-to-r ${s.bg || "from-purple-600 to-indigo-600"}`} />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-4">
              <h2 className="text-4xl md:text-6xl font-extrabold">{s.title}</h2>
              {s.subtitle && <p className="mt-4 text-xl md:text-2xl text-white/90">{s.subtitle}</p>}
              {s.cta && (
                <Link
                  to={s.to || "#"}
                  className="mt-8 inline-flex items-center px-8 py-3 rounded-full bg-white text-gray-900 font-semibold hover:shadow-xl"
                >
                  {s.cta}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* dots */}
      {len > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3">
          {items.map((_, idx) => (
            <button
              key={idx}
              aria-label={`Slide ${idx + 1}`}
              onClick={() => goto(idx)}
              className={
                idx === i
                  ? "h-4 w-10 rounded-full bg-white/90 shadow border border-white/80"
                  : "h-3 w-3 rounded-full bg-white/60 hover:bg-white"
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
