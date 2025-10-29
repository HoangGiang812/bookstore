// File: src/routes/wishlist.js
import express from 'express';
import Wishlist from '../models/Wishlist.js'; // Import model Wishlist mới
import { requireAuth } from '../middlewares/auth.js'; // Hoặc middleware isAuth của bạn

const wishlistRouter = express.Router();

// === API 1: Lấy danh sách yêu thích của user (GET /api/wishlist/my) ===
// (Chúng ta dùng /my để tránh nhầm lẫn với /:id sau này)
wishlistRouter.get(
    '/my',
    requireAuth, // Chỉ user đã đăng nhập mới được gọi
    async (req, res) => {
        try {
            // req.user._id lấy từ middleware requireAuth
            const wishlists = await Wishlist.find({ user: req.user._id })
                                            .populate('book'); // Lấy luôn thông tin sách

            // Chỉ trả về mảng các cuốn sách [book, book, book]
            const books = wishlists.map(item => item.book).filter(Boolean); // .filter(Boolean) để loại bỏ sách đã bị xóa
            res.send(books);

        } catch (error) {
            res.status(500).send({ message: 'Lỗi server khi tải wishlist' });
        }
    }
);

// === API 2: Thêm/Xóa (Toggle) một mục (POST /api/wishlist/toggle) ===
wishlistRouter.post(
    '/toggle',
    requireAuth, // Yêu cầu đăng nhập
    async (req, res) => {
        const { bookId } = req.body;
        const userId = req.user._id;

        if (!bookId) {
            return res.status(400).send({ message: 'Không tìm thấy bookId' });
        }

        try {
            // 1. Kiểm tra xem item đã tồn tại chưa
            const existingItem = await Wishlist.findOne({
                user: userId,
                book: bookId
            });

            if (existingItem) {
                // 2. Nếu đã tồn tại -> Xóa nó đi (Bỏ thích)
                await Wishlist.deleteOne({ _id: existingItem._id });
                res.send({ 
                    message: 'Đã xóa khỏi wishlist', 
                    action: 'removed' 
                });
            } else {
                // 3. Nếu chưa tồn tại -> Tạo mới (Thích)
                const newItem = new Wishlist({
                    user: userId,
                    book: bookId
                });
                await newItem.save();
                res.status(201).send({ 
                    message: 'Đã thêm vào wishlist', 
                    action: 'added' 
                });
            }

        } catch (error) {
            res.status(500).send({ message: 'Lỗi server', error: error.message });
        }
    }
);

export default wishlistRouter;