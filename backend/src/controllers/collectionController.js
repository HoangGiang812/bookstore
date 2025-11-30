import { Collection } from '../models/Collection.js';

// 1. GET /api/collections (Lấy danh sách tất cả BST đang hiển thị)
export const listPublicCollections = async (req, res) => {
  try {
    const list = await Collection.find({ isActive: true })
      .select('name slug description banner books createdAt') 
      .populate({
        path: 'books',
        select: 'coverUrl image',
        match: { isActive: true }
      })
      .sort({ createdAt: -1 })
      .lean();

    const result = list.map(col => {
      const validBooks = (col.books || []).filter(b => b);

      return {
        _id: col._id,
        name: col.name,
        slug: col.slug,
        description: col.description,
        banner: col.banner,
        bookCount: validBooks.length, 
        previewImages: validBooks.slice(0, 3).map(b => b.coverUrl || b.image).filter(Boolean)
      };
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// 2. GET /api/collections/:slug (Chi tiết BST - Giữ nguyên logic populate của bạn)
export const getCollectionBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const collection = await Collection.findOne({ slug: slug, isActive: true })
      .populate({
        path: 'books',
        match: { isActive: true },
        select: 'title slug price discountPercent coverUrl image author stock soldCount' // Lấy thêm stock, soldCount
      })
      .lean();

    if (!collection) return res.status(404).json({ message: 'Không tìm thấy bộ sưu tập' });
    
    // Lọc sách null
    collection.books = (collection.books || []).filter(b => b);
    
    res.json(collection);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};