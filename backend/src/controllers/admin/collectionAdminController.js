import { Collection } from '../../models/Collection.js';
import { Book } from '../../models/Book.js';

// GET /api/admin/collections
export const listCollections = async (req, res) => {
  try {
    const collections = await Collection.find({})
      .sort({ createdAt: -1 })
      .lean();

    const result = collections.map(c => ({
      ...c,
      bookCount: c.books ? c.books.length : 0
    }));

    res.json({ items: result });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// POST /api/admin/collections (Tạo mới)
export const createCollection = async (req, res) => {
  try {
    // --- SỬA Ở ĐÂY: Lấy thêm banner, slug, isActive ---
    const { name, slug, description, banner, isActive, books = [] } = req.body;
    
    const newCollection = new Collection({ 
      name, 
      slug, // Nếu slug rỗng, model sẽ tự tạo từ name (nếu bạn đã config pre-save hook)
      description, 
      banner,   // <--- Quan trọng: Lưu ảnh banner
      isActive: isActive !== undefined ? isActive : true, // Mặc định là true
      books 
    });

    await newCollection.save();
    res.status(201).json(newCollection);
  } catch (e) {
    // Bắt lỗi trùng slug (E11000)
    if (e.code === 11000) {
        return res.status(400).json({ message: 'Slug (URL) đã tồn tại, vui lòng chọn tên khác.' });
    }
    res.status(500).json({ message: e.message });
  }
};

// GET /api/admin/collections/:id (Chi tiết)
export const getCollectionDetails = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('books', 'title coverUrl image author price stock') // Lấy thêm image, price, stock để hiển thị cột trái
      .lean();

    if (!collection) {
      return res.status(404).json({ message: 'Không tìm thấy' });
    }
    
    // Chuẩn hoá ảnh sách để frontend dễ dùng (vì sách có thể dùng coverUrl hoặc image)
    if (collection.books) {
        collection.books = collection.books.map(b => ({
            ...b,
            coverUrl: b.coverUrl || b.image // Fallback
        }));
    }

    res.json(collection);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// PATCH /api/admin/collections/:id (Cập nhật)
export const updateCollection = async (req, res) => {
  try {
    // --- SỬA Ở ĐÂY: Lấy thêm banner, slug, isActive ---
    const { name, slug, description, banner, isActive, books } = req.body;

    // Tạo object update chỉ chứa các trường có gửi lên
    const updateData = {};
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (banner !== undefined) updateData.banner = banner; // <--- Quan trọng
    if (isActive !== undefined) updateData.isActive = isActive;
    if (books) updateData.books = books;

    const updatedCollection = await Collection.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedCollection) {
      return res.status(404).json({ message: 'Không tìm thấy' });
    }
    res.json(updatedCollection);
  } catch (e) {
    if (e.code === 11000) {
        return res.status(400).json({ message: 'Slug (URL) đã tồn tại.' });
    }
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