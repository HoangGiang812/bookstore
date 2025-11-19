import { Collection } from '../models/Collection.js';

// GET /api/collections/:slug
// Lấy 1 bộ sưu tập bằng slug, và populate sách
export const getCollectionBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const collection = await Collection.findOne({ slug: slug, isActive: true })
      .populate({
        path: 'books',
        match: { isActive: true }, // Chỉ lấy sách cũng đang active
        // Chọn các trường mà DealCard (Trang chủ) cần
        select: 'title slug price discountPercent coverUrl author' 
      })
      .lean();

    if (!collection) {
      return res.status(404).json({ message: 'Không tìm thấy bộ sưu tập' });
    }

    // Lọc ra các sách null (nếu có)
    collection.books = collection.books.filter(book => book !== null);

    res.json(collection);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};