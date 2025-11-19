import { Collection } from '../../models/Collection.js';
import { Book } from '../../models/Book.js'; // Import Book model

// GET /api/admin/collections
// Lấy danh sách bộ sưu tập (không cần populate books, chỉ cần đếm)
export const listCollections = async (req, res) => {
  try {
    const collections = await Collection.find({})
      .sort({ createdAt: -1 })
      .lean();

    // Thêm số lượng sách vào mỗi collection
    const result = collections.map(c => ({
      ...c,
      bookCount: c.books ? c.books.length : 0
    }));

    res.json({ items: result });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// POST /api/admin/collections
export const createCollection = async (req, res) => {
  try {
    const { name, description, books = [] } = req.body;
    const newCollection = new Collection({ name, description, books });
    await newCollection.save();
    res.status(201).json(newCollection);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// GET /api/admin/collections/:id
// Lấy chi tiết 1 collection (dùng cho trang Sửa)
export const getCollectionDetails = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('books', 'title coverUrl author') // Chỉ lấy 1 vài trường của sách
      .lean();

    if (!collection) {
      return res.status(404).json({ message: 'Không tìm thấy' });
    }
    res.json(collection);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// PATCH /api/admin/collections/:id
export const updateCollection = async (req, res) => {
  try {
    const { name, description, books = [] } = req.body;

    const updatedCollection = await Collection.findByIdAndUpdate(
      req.params.id,
      { name, description, books },
      { new: true, runValidators: true } // 'new: true' để trả về document đã update
    );

    if (!updatedCollection) {
      return res.status(404).json({ message: 'Không tìm thấy' });
    }
    res.json(updatedCollection);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// DELETE /api/admin/collections/:id
export const deleteCollection = async (req, res) => {
  try {
    const deleted = await Collection.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy' });
    }
    res.json({ message: 'Xóa thành công' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};