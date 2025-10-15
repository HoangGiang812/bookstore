import { Router } from 'express';
import { publicPage, publicBanners } from '../controllers/bookController.js';

const router = Router();

// GET /api/public/pages/:slug  -> lấy trang tĩnh (about, terms,…)
router.get('/pages/:slug', publicPage);

// (tuỳ chọn) banner public
router.get('/banners', publicBanners);

export default router;
