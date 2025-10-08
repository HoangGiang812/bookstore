// backend/src/controllers/userController.js
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { sendMail, otpTemplate } from '../utils/email.js';

/* ---------------- helpers ---------------- */
const normalizeDob = (dob) => ({
  d: dob?.d != null ? String(dob.d) : '',
  m: dob?.m != null ? String(dob.m) : '',
  y: dob?.y != null ? String(dob.y) : '',
});

const toAddr = (a) => ({
  id: String(a._id),
  label: a.label || 'Nhà riêng',
  receiver: a.receiver || a.fullName || '',
  phone: a.phone || '',
  province: a.province || '',
  district: a.district || '',
  ward: a.ward || '',
  detail: a.detail || a.line1 || '',
  isDefault: !!a.isDefault,
});

const ensureOneDefault = (arr = []) => {
  if (arr.length && !arr.some(x => x.isDefault)) arr[0].isDefault = true;
};

/* =================== Hồ sơ =================== */
export async function me(req, res) {
  const u = await User.findById(req.user._id).lean();
  if (!u) return res.status(404).json({ message: 'Not found' });

  const addresses = (u.addresses || []).map(toAddr);
  ensureOneDefault(addresses);

  const out = {
    ...u,
    dob: normalizeDob(u.dob),
    addresses,
  };
  delete out.passwordHash;
  return res.json(out);
}

export async function updateProfile(req, res) {
  const { name, avatar, avatarUrl, dob, gender, nation } = req.body || {};
  const u = await User.findById(req.user._id);
  if (!u) return res.status(404).json({ message: 'Not found' });

  if (typeof name === 'string') u.name = name;

  // chấp nhận cả avatar lẫn avatarUrl
  const newAvatar =
    typeof avatarUrl === 'string' ? avatarUrl :
    typeof avatar === 'string'    ? avatar    :
    undefined;
  if (newAvatar) u.avatarUrl = newAvatar;

  if (dob && typeof dob === 'object') {
    u.dob = normalizeDob(dob);
  }
  if (typeof gender === 'string' && gender) u.gender = gender;
  if (typeof nation === 'string' && nation) u.nation = nation;

  await u.save();

  // trả lại user đã cập nhật (chuẩn hoá giống me())
  const plain = u.toObject({ getters: false, virtuals: false });
  const addresses = (plain.addresses || []).map(toAddr);
  ensureOneDefault(addresses);
  const out = {
    ...plain,
    dob: normalizeDob(plain.dob),
    addresses,
  };
  delete out.passwordHash;
  return res.json(out);
}

/* ============ Số điện thoại (không OTP) ============ */
export async function updatePhone(req, res) {
  const { phone } = req.body || {};
  if (!phone || !String(phone).trim()) {
    return res.status(400).json({ message: 'Thiếu số điện thoại' });
  }
  const u = await User.findById(req.user._id);
  if (!u) return res.status(404).json({ message: 'Not found' });

  u.phone = String(phone).trim();
  await u.save();
  return res.json({ ok: 1, phone: u.phone });
}

/* =================== Đổi mật khẩu =================== */
export async function changePassword(req, res) {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword)
    return res.status(400).json({ message: 'Thiếu mật khẩu' });

  const u = await User.findById(req.user._id);
  if (!u) return res.status(404).json({ message: 'Not found' });

  const ok = await bcrypt.compare(oldPassword, u.passwordHash || '');
  if (!ok) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });

  u.passwordHash = await bcrypt.hash(newPassword, 10);
  await u.save();
  return res.json({ ok: 1 });
}

/* ============ PIN qua email OTP ============ */
function genOtp() { return String(Math.floor(100000 + Math.random() * 900000)); }

export async function sendPinOtp(req, res) {
  const u = await User.findById(req.user._id);
  if (!u?.email) return res.status(400).json({ message: 'Tài khoản chưa có email' });

  const otp = genOtp();
  u.pinOtp = otp;
  u.pinOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút
  await u.save();

  try {
    await sendMail({ to: u.email, subject: 'Mã OTP thiết lập PIN', html: otpTemplate(otp) });
  } catch {}
  return res.json({ ok: 1 });
}

export async function setPinWithOtp(req, res) {
  const { otp, pin } = req.body || {};
  if (!/^\d{4,6}$/.test(pin || ''))
    return res.status(400).json({ message: 'PIN phải 4–6 chữ số' });

  const u = await User.findById(req.user._id);
  if (!u) return res.status(404).json({ message: 'Not found' });

  if (!u.pinOtp || !u.pinOtpExpires || new Date() > u.pinOtpExpires || otp !== u.pinOtp) {
    return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn' });
  }
  u.pinHash = await bcrypt.hash(pin, 10);
  u.pinOtp = null;
  u.pinOtpExpires = null;
  await u.save();
  return res.json({ ok: 1 });
}

/* ============ Yêu cầu xoá tài khoản ============ */
export async function createDeleteRequest(req, res) {
  const { reason } = req.body || {};
  const u = await User.findById(req.user._id);
  if (!u) return res.status(404).json({ message: 'Not found' });

  u.lastDeleteRequest = { reason: reason || null, status: 'pending', createdAt: new Date() };
  await u.save();
  return res.json({ ok: 1 });
}

/* ============ Địa chỉ (theo id) ============ */
export async function listAddresses(req, res) {
  const u = await User.findById(req.user._id);
  if (!u) return res.status(404).json({ message: 'Not found' });

  const items = (u.addresses || []).map(toAddr);
  ensureOneDefault(items);
  return res.json(items);
}

export async function addAddress(req, res) {
  const u = await User.findById(req.user._id);
  if (!u) return res.status(404).json({ message: 'Not found' });

  const b = req.body || {};
  const doc = {
    label: b.label || 'Nhà riêng',
    receiver: b.receiver || b.fullName || '',
    fullName: b.fullName || b.receiver || '',
    phone: b.phone || '',
    province: b.province || '',
    district: b.district || '',
    ward: b.ward || '',
    detail: b.detail || b.line1 || '',
    line1: b.line1 || b.detail || '',
    isDefault: !!b.isDefault,
  };
  if (doc.isDefault) u.addresses.forEach(a => a.isDefault = false);
  u.addresses.unshift(doc);
  ensureOneDefault(u.addresses);
  await u.save();
  return res.json(toAddr(u.addresses[0]));
}

export async function updateAddress(req, res) {
  const { id } = req.params;
  const b = req.body || {};
  const u = await User.findById(req.user._id);
  if (!u) return res.status(404).json({ message: 'Not found' });

  const a = u.addresses.id(id);
  if (!a) return res.status(404).json({ message: 'Address not found' });

  if (b.label !== undefined) a.label = b.label;
  if (b.receiver !== undefined) { a.receiver = b.receiver; a.fullName = b.receiver; }
  if (b.phone !== undefined) a.phone = b.phone;
  if (b.province !== undefined) a.province = b.province;
  if (b.district !== undefined) a.district = b.district;
  if (b.ward !== undefined) a.ward = b.ward;
  if (b.detail !== undefined) { a.detail = b.detail; a.line1 = b.detail; }
  if (b.isDefault === true) { u.addresses.forEach(x => x.isDefault = false); a.isDefault = true; }

  await u.save();
  return res.json(toAddr(a));
}

export async function deleteAddress(req, res) {
  const { id } = req.params;
  const u = await User.findById(req.user._id);
  if (!u) return res.status(404).json({ message: 'Not found' });

  const before = u.addresses.length;
  u.addresses = u.addresses.filter(a => String(a._id) !== String(id));
  ensureOneDefault(u.addresses);
  await u.save();
  return res.json({ ok: 1, removed: before - u.addresses.length });
}

export async function setDefaultAddress(req, res) {
  const { id } = req.params;
  const u = await User.findById(req.user._id);
  if (!u) return res.status(404).json({ message: 'Not found' });

  let found = false;
  u.addresses.forEach(a => {
    const is = String(a._id) === String(id);
    a.isDefault = is; if (is) found = true;
  });
  if (!found) return res.status(404).json({ message: 'Address not found' });

  await u.save();
  return res.json({ ok: 1 });
}
