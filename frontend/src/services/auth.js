// src/services/auth.js
import api from './api';
import { save } from './storage';

export async function register(payload) {
  const data = await api.post('/auth/register', payload);
  const tokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
  save('current_user', data.user);
  save('tokens', tokens);
  return { user: data.user, tokens };
}

export async function login({ email, password }) {
  const data = await api.post('/auth/login', { email, password });
  const tokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
  save('current_user', data.user);
  save('tokens', tokens);
  return { user: data.user, tokens };
}

export const me = async () => api.get('/api/me');

export async function logoutAll() {
  const wrap = JSON.parse(localStorage.getItem('bookstore_data_v1') || '{}');
  const rt = wrap?.tokens?.refreshToken;
  if (rt) { try { await api.post('/auth/logout', { refreshToken: rt }); } catch {} }
  save('current_user', null);
  save('tokens', null);
}

// — cập nhật hồ sơ / số điện thoại (không OTP theo yêu cầu) —
export async function updateProfile(partial) {
  return api.put('/api/me', partial); // {name?, phone?, avatarUrl? ...}
}
export async function updatePhone(phone) {
  return api.put('/api/me', { phone });
}

// — đổi mật khẩu —
export async function changePassword(oldPassword, newPassword) {
  return api.patch('/api/security/password', { oldPassword, newPassword });
}

// — PIN + OTP qua email —
export async function requestPinOtp() {
  return api.post('/api/security/pin/otp', {});
}
export async function setPin(pin, otp) {
  return api.post('/api/security/pin', { pin, otp });
}

// — yêu cầu xoá tài khoản —
export async function requestDeleteAccount(reason) {
  return api.post('/api/security/delete-request', { reason });
}
