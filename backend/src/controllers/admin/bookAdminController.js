import { Book } from '../../models/Book.js';
import { Collection } from '../../models/Collection.js';
import slugify from 'slugify';
import { upload as multerUpload } from './bookImportController.js';

// ✅ 1. LIST BOOKS: Đưa sách nổi bật (featured) lên đầu
export const listBooks = async (req, res) => {
  try {
    const { q } = req.query;
    let query = {};
    if (q) {
      query = {
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { author: { $regex: q, $options: 'i' } },
          { code: { $regex: q, $options: 'i' } }
        ]
      };
    }

    const books = await Book.find(query)
      .sort({ featured: -1, createdAt: -1 }) // ✅ Featured lên đầu, sau đó đến mới nhất
      .lean();

    res.json({ items: books });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ 2. CREATE BOOK: Đảm bảo lưu Description
export const createBook = async (req, res) => {
  try {
    // Lấy toàn bộ body để không bị sót trường nào (như description, specs...)
    const payload = { ...req.body };
    
    // Tự động tạo slug nếu chưa có
    if (!payload.slug && payload.title) {
        payload.slug = slugify(payload.title, { lower: true, strict: true, locale: 'vi' });
    }

    const newBook = await Book.create(payload);
    res.status(201).json(newBook);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ 3. UPDATE BOOK: Đảm bảo lưu Description
export const updateBook = async (req, res) => {
  try {
    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      req.body, // Cập nhật mọi trường gửi lên
      { new: true }
    );
    if (!updatedBook) return res.status(404).json({ message: 'Book not found' });
    res.json(updatedBook);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getBook = async (req, res) => {
    const { id } = req.params;
    const doc = await Book.findById(id).lean();
    if (!doc) return res.status(404).json({ message: 'book_not_found' });
    res.json(doc);
};

export const removeBook = async (req, res) => {
    const { id } = req.params;
    await Book.findByIdAndDelete(id);
    res.json({ ok: true });
};

export const intake = async (req, res) => {
    // Giữ nguyên logic intake cũ của bạn
    const { id } = req.params;
    const qty = Number(req.body?.qty || 0);
    const b = await Book.findById(id);
    if (!b) return res.status(404).json({ message: 'book_not_found' });
    b.stock = Math.max(0, (b.stock || 0) + qty);
    b.status = b.stock > 0 ? 'available' : 'out-of-stock';
    await b.save();
    res.json(b);
};

export const uploadCover = [
    // Giữ nguyên logic upload cũ của bạn
    multerUpload.single('file'),
    async (req, res) => {
        if (!req.file) return res.status(400).json({ message: 'file_required' });
        const url = `/uploads/${req.file.filename}`;
        return res.json({ url });
    },
];


// ✅ 4. TOGGLE FEATURED: Đồng bộ với Collection
export const toggleFeatured = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });

    // Đảo trạng thái
    const nextState = !book.featured;
    book.featured = nextState;
    book.isFeatured = nextState; // Đồng bộ cả 2 trường nếu model cũ còn dùng
    await book.save();

    // --- LOGIC ĐỒNG BỘ VỚI BỘ SƯU TẬP "Sách Nổi Bật" ---
    // Giả sử bạn đã tạo bộ sưu tập có slug là 'sach-noi-bat'
    // (Nếu chưa có, hãy vào Admin > Bộ sưu tập để tạo nhé)
    try {
        const featuredCol = await Collection.findOne({ slug: 'sach-noi-bat' });
        if (featuredCol) {
            if (nextState) {
                // Thêm vào nếu chưa có ($addToSet tránh trùng)
                await Collection.findByIdAndUpdate(featuredCol._id, {
                    $addToSet: { books: book._id }
                });
            } else {
                // Gỡ ra nếu bỏ nổi bật
                await Collection.findByIdAndUpdate(featuredCol._id, {
                    $pull: { books: book._id }
                });
            }
        }
    } catch (err) {
        console.error("Lỗi đồng bộ Collection:", err);
        // Không return lỗi, vì việc chính là toggle book đã xong
    }

    res.json(book);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};