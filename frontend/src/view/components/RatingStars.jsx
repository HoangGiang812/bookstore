// src/view/components/RatingStars.jsx
export default function RatingStars({ value = 0, size = 20, className = '' }) {
  const v = Math.max(0, Math.min(5, Number(value)));
  const full = Math.floor(v);
  const half = v - full >= 0.5;

  return (
    <div className={`inline-flex items-center ${className}`}>
      {[...Array(5)].map((_, i) => {
        const filled = i < full;
        const showHalf = i === full && half;
        return (
          <svg key={i} viewBox="0 0 20 20" width={size} height={size}
               className={`mx-[1px] ${filled || showHalf ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor">
            {showHalf ? (
              <defs>
                <linearGradient id={`half-${i}`} x1="0" x2="1">
                  <stop offset="50%" stopColor="currentColor" />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
            ) : null}
            <path d="M10 1.5 12.7 7l6 .5-4.6 4 1.4 6L10 14.7 4.5 18.5l1.4-6L1.3 7.5 7.3 7z"
                  fill={showHalf ? `url(#half-${i})` : 'currentColor'} />
          </svg>
        );
      })}
    </div>
  );
}
