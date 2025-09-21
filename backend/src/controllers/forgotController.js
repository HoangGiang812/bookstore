import bcrypt from 'bcryptjs';
import { User } from '../../models/User.js';
import { sendMail } from '../../services/mailer.js';

const genOTP = () => String(Math.floor(100000 + Math.random() * 900000)); // 6 số

// POST /api/auth/forgot
export async function forgotPassword(req, res) {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: 'email_required' });

  const u = await User.findOne({ email: String(email).toLowerCase().trim() });
  // Trả về ok ngay cả khi không tìm thấy để tránh dò email
  if (!u) return res.json({ ok: true });

  // chống spam: cách lần request trước >= 60s
  const now = Date.now();
  if (u.resetOtpRequestedAt && now - u.resetOtpRequestedAt.getTime() < 60 * 1000) {
    return res.status(429).json({ message: 'too_many_requests' });
  }

  const otp = genOTP();
  u.resetOtp = otp;
  u.resetOtpExpires = new Date(now + 10 * 60 * 1000); // 10 phút
  u.resetOtpTries = 0;
  u.resetOtpRequestedAt = new Date(now);
  await u.save();

  const html = `
    <div style="font-family:Arial,sans-serif">
      <h2>Khôi phục mật khẩu - ${process.env.APP_NAME || 'App'}</h2>
      <p>Mã xác thực (OTP) của bạn là:</p>
      <div style="font-size:22px;font-weight:bold;letter-spacing:4px">${otp}</div>
      <p>Mã sẽ hết hạn sau 10 phút.</p>
      <p>Nếu không phải bạn yêu cầu, vui lòng bỏ qua email này.</p>
    </div>
  `;
  await sendMail({
    to: u.email,
    subject: `[${process.env.APP_NAME || 'App'}] Mã OTP khôi phục mật khẩu`,
    html
  });

  return res.json({ ok: true });
}

// POST /api/auth/verify-otp
export async function verifyOtp(req, res) {
  const { email, otp } = req.body || {};
  if (!email || !otp) return res.status(400).json({ message: 'invalid_payload' });

  const u = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!u || !u.resetOtp || !u.resetOtpExpires) {
    return res.status(400).json({ message: 'otp_invalid' });
  }
  if (u.resetOtpTries >= 5) return res.status(429).json({ message: 'too_many_attempts' });
  if (Date.now() > u.resetOtpExpires.getTime()) return res.status(400).json({ message: 'otp_expired' });

  if (String(otp).trim() !== u.resetOtp) {
    u.resetOtpTries += 1;
    await u.save();
    return res.status(400).json({ message: 'otp_wrong' });
  }

  // Có thể đặt cờ verified nếu muốn
  return res.json({ ok: true });
}

// POST /api/auth/reset
export async function resetPassword(req, res) {
  const { email, otp, newPassword } = req.body || {};
  if (!email || !otp || !newPassword) return res.status(400).json({ message: 'invalid_payload' });
  if (String(newPassword).length < 6) return res.status(400).json({ message: 'password_too_short' });

  const u = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!u || !u.resetOtp || !u.resetOtpExpires) {
    return res.status(400).json({ message: 'otp_invalid' });
  }
  if (u.resetOtpTries >= 5) return res.status(429).json({ message: 'too_many_attempts' });
  if (Date.now() > u.resetOtpExpires.getTime()) return res.status(400).json({ message: 'otp_expired' });
  if (String(otp).trim() !== u.resetOtp) {
    u.resetOtpTries += 1;
    await u.save();
    return res.status(400).json({ message: 'otp_wrong' });
  }

  // Đổi mật khẩu
  const salt = await bcrypt.genSalt(10);
  u.password = await bcrypt.hash(String(newPassword), salt);

  // Xoá OTP data
  u.resetOtp = null;
  u.resetOtpExpires = null;
  u.resetOtpTries = 0;
  await u.save();

  return res.json({ ok: true });
}
