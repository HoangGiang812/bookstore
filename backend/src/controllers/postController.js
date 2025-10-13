// File: backend/src/controllers/postController.js (ĐÃ CẬP NHẬT)

import { Post } from '../models/Post.js'; // Import Model mà bạn đã tạo

/**
 * @desc    Lấy danh sách các bài viết đã xuất bản
 * @route   GET /api/posts
 * @access  Public
 */
export const listPosts = async (req, res) => {
  try {
    const posts = await Post.find({ status: 'published' })
      .populate('author', 'name avatar')
      .sort({ createdAt: -1 })
      .lean();

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};

/**
 * @desc    Lấy chi tiết một bài viết bằng slug
 * @route   GET /api/posts/:slug
 * @access  Public
 */
export const getPostBySlug = async (req, res) => {
  try {
    const post = await Post.findOne({
      slug: req.params.slug,
      status: 'published',
    })
      .populate('author', 'name avatar')
      .lean();

    if (post) {
      res.json(post);
    } else {
      res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};


// <<< HÀM CÒN THIẾU CỦA BẠN NẰM Ở ĐÂY >>>
/**
 * @desc    Lấy các bài viết liên quan dựa trên tags
 * @route   GET /api/posts/:slug/related
 * @access  Public
 */
export const getRelatedPosts = async (req, res) => {
  try {
    const currentPost = await Post.findOne({ slug: req.params.slug }).lean();
    if (!currentPost || !currentPost.tags || currentPost.tags.length === 0) {
      return res.json([]);
    }

    const relatedPosts = await Post.find({
      tags: { $in: currentPost.tags },
      _id: { $ne: currentPost._id }
    })
    .sort({ createdAt: -1 })
    .limit(3)
    .select('title slug featuredImage excerpt createdAt')
    .lean();

    res.json(relatedPosts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
};