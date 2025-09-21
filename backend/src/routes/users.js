import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { me, updateMe, listAddresses, addAddress, updateAddress, deleteAddress } from '../controllers/userController.js';

const r = Router();
r.get('/me', requireAuth, me);
r.put('/me', requireAuth, updateMe);

r.get('/addresses', requireAuth, listAddresses);
r.post('/addresses', requireAuth, addAddress);
r.put('/addresses/:index', requireAuth, updateAddress);
r.delete('/addresses/:index', requireAuth, deleteAddress);

export default r;
