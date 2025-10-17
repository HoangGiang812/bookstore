import slugify from 'slugify';
import { Post } from '../../models/Post.js';

const makeSlug = (title, fallback = '') => {
  const base = slugify(String(title || fallback), { lower: true, strict: true, locale: 'vi' });
  const now = Date.now().toString(36);
  return `${base}-${now}`;
};

export async function create(req, res) {
  try {
    const { title, content, excerpt, featuredImage, author, status = 'draft', tags = [] } = req.body || {};
    if (!title || !content || !excerpt || !featuredImage || !author) {
      return res.status(400).json({ message: 'Thiếu trường bắt buộc (title, content, excerpt, featuredImage, author)' });
    }
    const slug = req.body.slug?.trim() || makeSlug(title);

    const doc = await Post.create({ title, slug, content, excerpt, featuredImage, author, status, tags });
    // Trả thẳng document (không có toPublic trên schema)
    return res.status(201).json(doc);
  } catch (e) {
    if (e.code === 11000 && e.keyPattern?.slug) {
      return res.status(409).json({ message: 'Slug đã tồn tại' });
    }
    if (e?.name === 'ValidationError') {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ', details: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const payload = { ...req.body };
    if (payload.slug) payload.slug = payload.slug.trim();

    const doc = await Post.findByIdAndUpdate(id, payload, { new: true });
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

    return res.json(doc);
  } catch (e) {
    if (e.code === 11000 && e.keyPattern?.slug) {
      return res.status(409).json({ message: 'Slug đã tồn tại' });
    }
    console.error(e);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;
    const r = await Post.findByIdAndDelete(id);
    if (!r) return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

export async function list(req, res) {
  try {
    const { q = '', status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (q) filter.title = { $regex: q, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Post.find(filter)
        .populate('author', 'name avatar') // giống public controller → FE hiển thị tên tác giả
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Post.countDocuments(filter),
    ]);

    return res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}
