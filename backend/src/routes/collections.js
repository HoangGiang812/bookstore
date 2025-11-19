import { Router } from 'express';
import { getCollectionBySlug } from '../controllers/collectionController.js';

const router = Router();

router.get('/:slug', getCollectionBySlug);

export default router;