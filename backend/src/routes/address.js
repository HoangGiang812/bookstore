// src/routes/address.js
import express from 'express';
import {
  listMyAddresses,
  createMyAddress,
  updateMyAddress,
  deleteMyAddress,
  setDefaultMyAddress,
} from '../controllers/addressController.js';

const router = express.Router();

/** YÊU CẦU: middleware auth phải gắn ở ngoài (app.use) hoặc ở đây.
 *  Ví dụ: router.use(authRequired);
 *  Ở dưới mình chỉ định tuyến thuần tuý.
 */

router.get('/', listMyAddresses);
router.post('/', createMyAddress);
router.put('/:id', updateMyAddress);
router.delete('/:id', deleteMyAddress);
router.patch('/:id/default', setDefaultMyAddress);

export default router;
