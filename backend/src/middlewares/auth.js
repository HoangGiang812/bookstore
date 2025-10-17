// File: backend/src/middlewares/auth.js
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

/**
 * Đính kèm req.user nếu header Authorization: Bearer <token> hợp lệ
 * - Chấp nhận payload có { sub } hoặc { id }
 * - Bỏ qua lặng lẽ nếu token không hợp lệ/không có
 */
export async function attachUserFromToken(req, _res, next) {
  try {
    const auth = req.headers?.authorization || '';
    if (!auth.startsWith('Bearer ')) return next();

    const token = auth.slice(7).trim();
    if (!token) return next();

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      // Token sai/hết hạn → coi như guest
      return next();
    }

    const sub = payload?.sub || payload?.id;
    if (!sub) return next();

    // Lấy user (ẩn passwordHash)
    const u = await User.findById(sub).select('-passwordHash').lean();
    if (!u) return next();

    // Nếu có trạng thái blocked thì coi như không đăng nhập
    if (u.status && String(u.status).toLowerCase() === 'blocked') {
      return next();
    }

    // Chuẩn hoá roles: luôn là mảng
    const roles = Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []);
    req.user = { ...u, roles };
  } catch {
    // không lộ chi tiết lỗi auth
  }
  next();
}

/**
 * Bắt buộc đăng nhập
 */
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  next();
}

/**
 * Yêu cầu có 1 trong các vai trò cho phép.
 * Hỗ trợ cả 2 cách gọi:
 *  - requireRoles('admin','staff')
 *  - requireRoles(['admin','staff'])
 */
export function requireRoles(...allow) {
  // Nếu truyền 1 tham số là mảng -> dùng mảng đó; ngược lại lấy toàn bộ đối số
  const list = Array.isArray(allow[0]) && allow.length === 1 ? allow[0] : allow;
  const allowL = list.map((r) => String(r).toLowerCase());

  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const have = [
      ...(Array.isArray(req.user.roles) ? req.user.roles : []),
      ...(req.user.role ? [req.user.role] : []),
    ]
      .filter(Boolean)
      .map((r) => String(r).toLowerCase());

    const ok = have.some((r) => allowL.includes(r));
    if (!ok) return res.status(403).json({ message: 'Forbidden' });

    next();
  };
}
