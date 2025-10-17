// File: src/routes/admin/posts.js
import { Router } from 'express';
import { attachUserFromToken, requireAuth, requireRoles } from '../../middlewares/auth.js';
import * as Ctrl from '../../controllers/admin/postAdminController.js';

const r = Router();
const guard = [attachUserFromToken, requireAuth, requireRoles(['admin', 'staff'])];

r.get('/', ...guard, Ctrl.list);
r.post('/', ...guard, Ctrl.create);
r.patch('/:id', ...guard, Ctrl.update);
r.delete('/:id', ...guard, Ctrl.remove);

export default r;
