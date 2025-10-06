import { create } from 'zustand';

export const useUI = create((set, get) => ({
  toast: null,
  showToast: (opts = {}) => {
    const payload = {
      id: Date.now(),
      type: opts.type || 'success',    // 'success' | 'error' | 'info'
      title: opts.title || '',
      msg: opts.message || opts.msg || '',
      duration: Number.isFinite(opts.duration) ? opts.duration : 2500,
    };
    set({ toast: payload });
  },
  hideToast: () => set({ toast: null }),
}));
