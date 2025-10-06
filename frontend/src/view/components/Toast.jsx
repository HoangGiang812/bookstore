import { useEffect, useRef } from 'react';
import { useUI } from '../../store/useUI';

const styles = {
  base: 'max-w-sm w-full ml-auto mb-3 rounded-xl shadow-lg ring-1 ring-black/5',
  success: 'bg-emerald-50 text-emerald-800',
  error: 'bg-rose-50 text-rose-800',
  info: 'bg-white text-gray-800',
  iconWrap: {
    success: 'text-emerald-600',
    error: 'text-rose-600',
    info: 'text-gray-600',
  },
};

function Icon({ type }) {
  if (type === 'success') {
    return (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.5 14.914l-3.207-3.207a1 1 0 111.414-1.414l1.793 1.793 7.5-7.5a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
  }
  if (type === 'error') {
    return (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-5a1 1 0 112 0 1 1 0 01-2 0zm0-6a1 1 0 012 0v4a1 1 0 11-2 0V7z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11 7h2v6h-2V7zm0 8h2v2h-2v-2z" />
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fillOpacity=".2" />
    </svg>
  );
}

export default function Toast() {
  const { toast, hideToast } = useUI();
  const timerRef = useRef(null);
  const lastId = useRef(null);

  useEffect(() => {
    if (!toast) return;
    // reset timer nếu toast mới
    if (timerRef.current) clearTimeout(timerRef.current);
    lastId.current = toast.id;
    timerRef.current = setTimeout(() => {
      if (lastId.current === toast.id) hideToast();
    }, toast.duration || 2500);
    return () => clearTimeout(timerRef.current);
  }, [toast, hideToast]);

  if (!toast) return null;

  const type = toast.type || 'success';
  const hasTitle = toast.title && toast.title.trim().length > 0;

  return (
    <div className="fixed inset-0 pointer-events-none flex items-end justify-end p-4 sm:p-6 z-[1000]">
      <div
        className={`pointer-events-auto transition-all translate-y-0 opacity-100 ${styles.base} ${styles[type]}`}
        role="status"
        aria-live="polite"
      >
        <div className="p-3 flex gap-3 items-start">
          <div className={`mt-0.5 ${styles.iconWrap[type]}`}>
            <Icon type={type} />
          </div>
          <div className="flex-1 min-w-0">
            {hasTitle && <div className="font-medium">{toast.title}</div>}
            <div className={`text-sm ${hasTitle ? 'opacity-80' : 'font-medium'}`}>{toast.msg}</div>
          </div>
          <button
            onClick={hideToast}
            className="p-1 rounded hover:bg-black/5 focus:outline-none shrink-0 text-gray-500"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
      </div>
    </div>
  );
}
