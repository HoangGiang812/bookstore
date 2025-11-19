import { Router } from 'express';
import { listRMA, updateRMAStatus } from '../../controllers/admin/rmaAdminController.js';

const router = Router();

router.get('/', listRMA);
router.patch('/:id', updateRMAStatus); // API cho các nút Duyệt/Từ chối

export default router;