// src/view/components/Toast.jsx
import { useEffect, useRef } from 'react';
import { useUI } from '../../store/useUI';

const styles = {
  base: 'max-w-sm w-full ml-auto mb-3 rounded-xl shadow-lg ring-1 ring-black/5 flex items-center', // Thêm flex items-center
  success: 'bg-emerald-50 text-emerald-800 border border-emerald-100',
  error: 'bg-rose-50 text-rose-800 border border-rose-100',
  info: 'bg-white text-gray-800 border border-gray-100',
  warning: 'bg-amber-50 text-amber-800 border border-amber-100',
  
  iconWrap: {
    success: 'text-emerald-600',
    error: 'text-rose-600',
    info: 'text-gray-600',
    warning: 'text-amber-600',
  },
};

function Icon({ type }) {
  if (type === 'success') {
    return (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (type === 'error') {
    return (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }

  if (type === 'warning') {
    return (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function Toast() {
  const { toast, hideToast } = useUI();
  const timerRef = useRef(null);
  const lastId = useRef(null);

  useEffect(() => {
    if (!toast) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    lastId.current = toast.id;
    timerRef.current = setTimeout(() => {
      if (lastId.current === toast.id) hideToast();
    }, toast.duration || 3000); // Tăng thời gian hiện lên 3s cho dễ đọc
    return () => clearTimeout(timerRef.current);
  }, [toast, hideToast]);

  if (!toast) return null;

  // Mặc định type là success nếu thiếu
  const type = toast.type && styles[toast.type] ? toast.type : 'success';
  const hasTitle = toast.title && toast.title.trim().length > 0;

  return (
    // SỬA: top-4 -> bottom-4
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 animate-fade-in-down">
      <div
        className={`${styles.base} ${styles[type]} p-4 min-w-[300px]`}
        role="alert"
      >
        <div className={`mr-3 ${styles.iconWrap[type]}`}>
          <Icon type={type} />
        </div>
        <div className="flex-1">
          {hasTitle && <h4 className="font-bold text-sm mb-0.5">{toast.title}</h4>}
          <p className="text-sm opacity-90">{toast.msg || toast.message}</p>
        </div>
        <button
          onClick={hideToast}
          className="ml-4 text-current opacity-50 hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
      </div>
    </div>
  );
}