import { Router } from 'express';
import { 
  listCollections, 
  createCollection, 
  getCollectionDetails,
  updateCollection, 
  deleteCollection 
} from '../../controllers/admin/collectionAdminController.js';

const router = Router();

router.get('/', listCollections);
router.post('/', createCollection);
router.get('/:id', getCollectionDetails);
router.patch('/:id', updateCollection);
router.delete('/:id', deleteCollection);

export default router;