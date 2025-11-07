// src/view/components/PromoSlider.jsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

export default function PromoSlider({
  items = [],
  auto = 6000,
  autoRange = [5000, 9000],
}) {
  const [index, setIndex] = useState(0);
  const [pause, setPause] = useState(false);
  const timerRef = useRef(null);

  // Chuẩn hoá dữ liệu từ Home
  const slides = Array.isArray(items)
    ? items.filter(Boolean).map((s, idx) => {
        const link = s.to ?? s.link ?? "#";
        return {
          id: s.id ?? s._id ?? `banner-${idx}`,
          title: s.title ?? "",
          subtitle: s.subtitle ?? "",
          cta: s.cta ?? s.ctaText ?? "",
          link,
          imageUrl: s.imageUrl ?? s.image ?? s.bg ?? "",
          active: s.active ?? true,
        };
      })
    : [];

  // Chỉ lấy banner active và có ảnh
  const activeSlides = slides.filter(
    (s) => s.active !== false && !!s.imageUrl
  );
  const len = activeSlides.length;

  if (!len) return null;

  // Giữ index hợp lệ
  useEffect(() => {
    setIndex((prev) => (prev >= len ? 0 : prev));
  }, [len]);

  // Auto slide
  useEffect(() => {
    if (len <= 1 || pause) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    let [min, max] =
      Array.isArray(autoRange) && autoRange.length === 2
        ? autoRange
        : [auto, auto];

    min = Math.max(1000, Number(min) || 0);
    max = Math.max(min, Number(max) || min);

    const delay =
      min === max
        ? min
        : Math.floor(Math.random() * (max - min + 1)) + min;

    timerRef.current = setTimeout(() => {
      setIndex((prev) => ((prev + 1) % len + len) % len);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [len, pause, index, auto, autoRange]);

  // Điều khiển phím
  useEffect(() => {
    if (len <= 1 || typeof window === "undefined") return;

    const handler = (e) => {
      if (e.key === "ArrowLeft") {
        setIndex((prev) => (prev - 1 + len) % len);
      } else if (e.key === "ArrowRight") {
        setIndex((prev) => (prev + 1) % len);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [len]);

  const isExternal = (link) => /^https?:\/\//i.test(link);

  const SlideWrapper = ({ link, children }) => {
    if (!link || link === "#") return <div className="h-full">{children}</div>;

    if (isExternal(link)) {
      return (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="block h-full"
        >
          {children}
        </a>
      );
    }

    return (
      <Link to={link} className="block h-full">
        {children}
      </Link>
    );
  };

  const goPrev = () => {
    if (len <= 1) return;
    setIndex((prev) => (prev - 1 + len) % len);
  };

  const goNext = () => {
    if (len <= 1) return;
    setIndex((prev) => (prev + 1) % len);
  };

  return (
    <div
      className="relative overflow-hidden m-0 p-0"
      style={{ marginTop: 0, paddingTop: 0 }}
    >
      <div
        className="relative h-[220px] sm:h-[260px] md:h-[320px] lg:h-[380px]"
        onMouseEnter={() => setPause(true)}
        onMouseLeave={() => setPause(false)}
      >
        {activeSlides.map((s, i) => {
          const active = i === index;
          return (
            <div
              key={s.id}
              className={`absolute inset-0 transition-opacity duration-700 ${
                active
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none select-none"
              }`}
              aria-hidden={!active}
            >
              <SlideWrapper link={s.link}>
                <div className="relative w-full h-full rounded-3xl overflow-hidden">
                  {/* Ảnh banner */}
                  <img
                    src={s.imageUrl}
                    alt={s.title || "Banner"}
                    className="w-full h-full object-cover"
                  />

                  {/* Text overlay */}
                  {(s.title || s.subtitle || s.cta) && (
                    <div className="absolute inset-0 flex flex-col justify-center items-start px-6 md:px-12 text-white">
                      {s.title && (
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold drop-shadow">
                          {s.title}
                        </h2>
                      )}

                      {s.subtitle && (
                        <p className="mt-2 text-sm md:text-base lg:text-lg max-w-xl text-white/95 drop-shadow">
                          {s.subtitle}
                        </p>
                      )}

                      {s.cta && s.link && (
                        <div
                          className="
                            mt-4
                            inline-flex items-center justify-center
                            px-8 py-3
                            rounded-full
                            bg-white/95 text-gray-900
                            text-base font-semibold
                            shadow-lg
                            whitespace-nowrap
                            self-start
                          "
                        >
                          {s.cta}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </SlideWrapper>
            </div>
          );
        })}

        {/* Nút điều hướng: vòng trắng nhỏ hơn + dấu ở giữa */}
        {len > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Slide trước"
              className="
                absolute left-3 md:left-5 top-1/2 -translate-y-1/2
                z-10
                w-10 h-10 md:w-12 md:h-12
                rounded-full
                bg-white/90 hover:bg-white
                text-gray-700 text-2xl md:text-3xl
                flex items-center justify-center
                leading-none
                shadow-lg
              "
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Slide sau"
              className="
                absolute right-3 md:right-5 top-1/2 -translate-y-1/2
                z-10
                w-10 h-10 md:w-12 md:h-12
                rounded-full
                bg-white/90 hover:bg-white
                text-gray-700 text-2xl md:text-3xl
                flex items-center justify-center
                leading-none
                shadow-lg
              "
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Dots */}
      {len > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {activeSlides.map((s, i) => (
            <button
              key={s.id || i}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className={
                i === index
                  ? "h-3 w-8 rounded-full bg-white shadow border border-white/80"
                  : "h-2.5 w-2.5 rounded-full bg-white/60 hover:bg-white"
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
