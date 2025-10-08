import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as user from '../controllers/userController.js';

const r = Router();

// ----- Hồ sơ cơ bản -----
r.get('/me', requireAuth, user.me);
r.patch('/me/profile', requireAuth, user.updateProfile);

// ----- Số điện thoại (KHÔNG OTP theo yêu cầu) -----
r.patch('/me/phone', requireAuth, user.updatePhone);

// ----- Đổi mật khẩu -----
r.patch('/me/password', requireAuth, user.changePassword);

// ----- PIN qua email OTP -----
r.post('/me/pin/request-otp', requireAuth, user.sendPinOtp);
r.post('/me/pin/verify', requireAuth, user.setPinWithOtp);

// ----- Yêu cầu xoá tài khoản -----
r.post('/me/delete-request', requireAuth, user.createDeleteRequest);

// ----- Sổ địa chỉ (theo id) -----
r.get('/me/addresses', requireAuth, user.listAddresses);
r.post('/me/addresses', requireAuth, user.addAddress);
r.delete('/me/addresses/:id', requireAuth, user.deleteAddress);
r.patch('/me/addresses/:id/default', requireAuth, user.setDefaultAddress);
// (tuỳ chọn) cập nhật 1 địa chỉ:
r.put('/me/addresses/:id', requireAuth, user.updateAddress);

export default r;
