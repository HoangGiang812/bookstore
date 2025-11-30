import { Router } from 'express';
import { getHomepageLayout } from '../controllers/admin/settingController.js';
import { publicPage, publicBanners } from '../controllers/bookController.js';
import { getCollectionBySlug, listPublicCollections } from '../controllers/collectionController.js';
const router = Router();

// GET /api/public/pages/:slug  -> lấy trang tĩnh (about, terms,…)
router.get('/pages/:slug', publicPage);

// (tuỳ chọn) banner public
router.get('/banners', publicBanners);
router.get('/collections', listPublicCollections);
router.get('/collections/:slug', getCollectionBySlug);
router.get('/layout', getHomepageLayout);

export default router;
