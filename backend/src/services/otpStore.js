// Lưu OTP tạm thời trong bộ nhớ (in-memory) với TTL (giây).
// Prod có thể đổi sang Redis để scale nhiều instance.

const buckets = new Map(); // key: `${userId}:${scope}` -> { code, expAt }

function keyOf(userId, scope) {
  return `${String(userId)}:${String(scope || 'default')}`;
}

/**
 * Lưu OTP cho user + scope (vd: 'pin', 'reset-password'), hết hạn sau ttlSec.
 */
export function setOtp(userId, scope, code, ttlSec = 300) {
  const expAt = Date.now() + Math.max(1, ttlSec) * 1000;
  buckets.set(keyOf(userId, scope), { code: String(code), expAt });
}

/**
 * Lấy OTP hiện tại (nếu còn hạn). Hết hạn thì trả null và tự xoá.
 */
export function getOtp(userId, scope) {
  const k = keyOf(userId, scope);
  const row = buckets.get(k);
  if (!row) return null;
  if (Date.now() > row.expAt) { buckets.delete(k); return null; }
  return row.code;
}

/** Xoá OTP (khi dùng xong hoặc huỷ). */
export function clearOtp(userId, scope) {
  buckets.delete(keyOf(userId, scope));
}

// Dọn rác định kỳ (OTP hết hạn)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets.entries()) {
    if (!v || now > v.expAt) buckets.delete(k);
  }
}, 60 * 1000);
