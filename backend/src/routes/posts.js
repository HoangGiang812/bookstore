// File: backend/src/routes/posts.js (ĐÃ CẬP NHẬT)

import { Router } from 'express';

// <<< BƯỚC 1: CẬP NHẬT DÒNG IMPORT NÀY >>>
import { listPosts, getPostBySlug, getRelatedPosts } from '../controllers/postController.js';

const router = Router();

// API để lấy danh sách tất cả bài viết
router.get('/', listPosts);

// <<< BƯỚC 2: THÊM ROUTE MỚI NÀY VÀO ĐÂY >>>
// QUAN TRỌNG: Route này phải được đặt TRƯỚC route '/:slug'
// để Express không nhầm "related" là một slug.
// API để lấy các bài viết liên quan
router.get('/:slug/related', getRelatedPosts);

// API để lấy chi tiết một bài viết theo slug (phải nằm sau các route con)
router.get('/:slug', getPostBySlug);

export default router;