// File: src/models/Wishlist.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const wishlistSchema = new Schema({
    // 'user' sẽ lưu _id của người dùng
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Phải khớp với tên Model User của bạn
        required: true
    },
    // 'book' sẽ lưu _id của cuốn sách
    book: {
        type: Schema.Types.ObjectId,
        ref: 'Book', // Phải khớp với tên Model Book của bạn
        required: true
    }
}, { timestamps: true });

// Đảm bảo một user chỉ "thích" một cuốn sách 1 lần
wishlistSchema.index({ user: 1, book: 1 }, { unique: true });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);
export default Wishlist;