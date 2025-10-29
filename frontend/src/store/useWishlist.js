// File: src/store/useWishlist.js (SỬA LẠI HOÀN CHỈNH)
import create from 'zustand';
import api from '../services/api';

// 2. SỬA: Xóa hàm getToken (api.js sẽ tự lo)

export const useWishlist = create((set, get) => ({
    wishlist: [], // state ban đầu
    loading: false,

    /**
     * HÀM 1: Lấy wishlist (Dùng api.js)
     */
    fetchWishlist: async () => {
        // 3. SỬA: Không cần kiểm tra token, api.js sẽ làm
        set({ loading: true });
        try {
            // 4. SỬA: Dùng api.get thay vì fetch
            const data = await api.get('/wishlist/my'); 
            
            // api.js đã tự xử lý lỗi, nên ta chỉ cần set data
            set({ wishlist: data, loading: false });

        } catch (error) {
            console.error("Lỗi khi tải wishlist:", error);
            // Nếu lỗi (kể cả 401), api.js đã ném lỗi
            set({ wishlist: [], loading: false });
        }
    },

    /**
     * HÀM 2: Thêm/Xóa (Toggle) (Dùng api.js)
     */
    toggleWishlist: async (book) => {
        // 5. SỬA: Không cần kiểm tra token
        const bookId = book._id || book.id;
        if (!bookId) return;

        const currentWishlist = get().wishlist;
        const isLiked = currentWishlist.some(item => (item._id || item.id) === bookId);

        // (Optimistic update giữ nguyên)
        if (isLiked) {
            set({ wishlist: currentWishlist.filter(item => (item._id || item.id) !== bookId) });
        } else {
            set({ wishlist: [...currentWishlist, book] });
        }

        try {
            // 6. SỬA: Dùng api.post thay vì fetch
            await api.post('/wishlist/toggle', { bookId });
        } catch (error) {
            console.error("Lỗi khi toggle wishlist:", error);
            set({ wishlist: currentWishlist }); // Rollback
        }
    },

    /**
     * HÀM 3: Xóa wishlist khi logout (giữ nguyên)
     */
    clearWishlist: () => {
        set({ wishlist: [] });
    }
}));