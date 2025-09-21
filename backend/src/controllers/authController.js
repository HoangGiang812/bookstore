import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Session } from "../models/Session.js";
import { sendMail, otpTemplate, resetLinkTemplate } from "../utils/email.js";
import { signAccess, signRefresh } from "../utils/jwt.js";

const RESET_EXPIRES_MS = Number(process.env.PASSWORD_RESET_TTL_MS || 1000 * 60 * 30); // 30 phút
const normEmail = (e) => String(e || "").toLowerCase().trim();
const genOTP = () => String(Math.floor(100000 + Math.random() * 900000));

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  emailVerified: !!u.emailVerified,
});

// ================= AUTH CƠ BẢN =================
export async function register(req, res) {
  const { name, email, password, phone } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ message: "Thiếu email hoặc mật khẩu" });

  const exists = await User.findOne({ email: normEmail(email) });
  if (exists) return res.status(409).json({ message: "Email đã tồn tại" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name?.trim(),
    email: normEmail(email),
    phone,
    passwordHash,
  });

  const accessToken = signAccess(user._id.toString());
  const refreshToken = signRefresh(user._id.toString(), crypto.randomUUID());
  const refreshHash = await bcrypt.hash(refreshToken, 8);

  await Session.findOneAndUpdate(
    { userId: user._id },
    { $set: { refreshTokenHash: refreshHash } },
    { upsert: true }
  );

  res.status(201).json({ user: publicUser(user), accessToken, refreshToken });
}

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ message: "Thiếu email hoặc mật khẩu" });

  const user = await User.findOne({ email: normEmail(email) }).select(
    "+passwordHash"
  );
  if (!user) return res.status(400).json({ message: "Email hoặc mật khẩu sai" });
  if (user.isActive === false)
    return res.status(403).json({ message: "Tài khoản bị khóa" });

  const ok = await bcrypt.compare(password, user.passwordHash || "");
  if (!ok) return res.status(400).json({ message: "Email hoặc mật khẩu sai" });

  const accessToken = signAccess(user._id.toString());
  const refreshToken = signRefresh(user._id.toString(), crypto.randomUUID());
  const refreshHash = await bcrypt.hash(refreshToken, 8);

  await Session.findOneAndUpdate(
    { userId: user._id },
    { $set: { refreshTokenHash: refreshHash } },
    { upsert: true }
  );

  res.json({ user: publicUser(user), accessToken, refreshToken });
}

// ================= QUÊN MẬT KHẨU =================
export async function requestPasswordReset(req, res) {
  const { email, method } = req.body || {};
  if (!email) return res.status(400).json({ message: "Thiếu email" });

  const user = await User.findOne({ email: normEmail(email) });
  if (!user)
    return res.json({
      message: "Nếu email tồn tại, hệ thống đã gửi hướng dẫn đặt lại mật khẩu.",
    });

  if (method === "otp") {
    const otp = genOTP();
    user.resetOtp = otp;
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút
    user.resetOtpTries = 0;
    await user.save();

    await sendMail({
      to: user.email,
      subject: "Mã OTP đặt lại mật khẩu",
      html: otpTemplate(otp),
    });

    return res.json({
      message: "Nếu email tồn tại, hệ thống đã gửi OTP.",
    });
  }

  // Flow link
  const token = crypto.randomUUID();
  user.resetOtp = token;
  user.resetOtpExpires = new Date(Date.now() + RESET_EXPIRES_MS);
  await user.save();

  const appOrigin = process.env.APP_ORIGIN;
  const apiOrigin = process.env.API_ORIGIN;
  const link = appOrigin
    ? `${appOrigin}/reset-password?token=${token}`
    : `${apiOrigin || ""}/api/auth/reset?token=${token}`;

  await sendMail({
    to: user.email,
    subject: "Đặt lại mật khẩu",
    html: resetLinkTemplate(link),
  });

  res.json({
    message: "Nếu email tồn tại, hệ thống đã gửi hướng dẫn đặt lại mật khẩu.",
  });
}

export async function resetPassword(req, res) {
  const { email, otp, token, newPassword } = req.body || {};
  if (!newPassword)
    return res.status(400).json({ message: "Thiếu mật khẩu mới" });

  const user = await User.findOne({ email: normEmail(email) });
  if (!user) return res.status(404).json({ message: "User không tồn tại" });

  // ===== OTP =====
  if (otp) {
    if (!user.resetOtp || Date.now() > user.resetOtpExpires)
      return res.status(400).json({ message: "OTP hết hạn" });
    if (otp !== user.resetOtp)
      return res.status(400).json({ message: "OTP sai" });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetOtp = null;
    user.resetOtpExpires = null;
    user.resetOtpTries = 0;
    await user.save();

    return res.json({ message: "Đổi mật khẩu thành công (OTP)" });
  }

  // ===== TOKEN (link) =====
  if (token) {
    if (!user.resetOtp || user.resetOtp !== token)
      return res.status(400).json({ message: "Token không hợp lệ" });
    if (Date.now() > user.resetOtpExpires)
      return res.status(400).json({ message: "Token hết hạn" });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetOtp = null;
    user.resetOtpExpires = null;
    await user.save();

    return res.json({ message: "Đổi mật khẩu thành công (link)" });
  }

  res.status(400).json({ message: "Thiếu OTP hoặc token" });
}

// ================= REFRESH + LOGOUT =================
export async function refresh(req, res) {
  const { refreshToken } = req.body || {};
  if (!refreshToken)
    return res.status(400).json({ message: "Missing refreshToken" });

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  const sess = await Session.findOne({ userId: payload.sub });
  if (!sess) return res.status(401).json({ message: "Session not found" });

  const ok = await bcrypt.compare(refreshToken, sess.refreshTokenHash || "");
  if (!ok) return res.status(401).json({ message: "Token mismatch" });

  const newAccess = signAccess(payload.sub);
  const newRefresh = signRefresh(payload.sub, crypto.randomUUID());

  sess.refreshTokenHash = await bcrypt.hash(newRefresh, 8);
  await sess.save();

  res.json({ accessToken: newAccess, refreshToken: newRefresh });
}

export async function logout(req, res) {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ message: "Missing refreshToken" });

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
  if (payload.sub !== String(req.user._id))
    return res.status(403).json({ message: "Forbidden" });

  await Session.deleteOne({ userId: payload.sub });
  res.json({ message: "Đã đăng xuất" });
}
