// Một nơi duy nhất quản lý localStorage cho FE
const NS = 'bookstore_data_v1';

// an toàn JSON.parse
function safeGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

// an toàn JSON.stringify
function safeSet(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ---- API công khai ----
export function load(key, fallback = null) {
  // Ưu tiên đọc trong namespace
  const ns = safeGet(NS, {});
  if (key in ns) return ns[key] ?? fallback;

  // Hỗ trợ legacy để không mất dữ liệu cũ
  if (key === 'tokens') {
    // 1) tokens riêng
    const t = safeGet('tokens', null);
    if (t?.accessToken) return t;
    // 2) trong auth
    const auth = safeGet('auth', null);
    if (auth?.accessToken) return { accessToken: auth.accessToken, refreshToken: auth.refreshToken };
    // 3) trong auth_tokens
    const t2 = safeGet('auth_tokens', null);
    if (t2?.accessToken) return t2;
  }
  if (key === 'current_user') {
    const auth = safeGet('auth', null);
    if (auth?.user) return auth.user;
  }

  return fallback;
}

export function save(key, value) {
  // Ghi vào namespace
  const ns = safeGet(NS, {});
  if (value === null || value === undefined) delete ns[key];
  else ns[key] = value;
  safeSet(NS, ns);

  // Mirror cho tương thích chéo (tuỳ chọn)
  if (key === 'tokens') {
    // 1) key mới
    value ? safeSet('tokens', value) : safeSet('tokens', null);
    // 2) auth (định dạng cũ)
    if (value) {
      const auth = safeGet('auth', {}) || {};
      auth.accessToken = value.accessToken;
      auth.refreshToken = value.refreshToken;
      safeSet('auth', auth);
    } else {
      safeSet('auth', null);
    }
    // 3) auth_tokens
    value ? safeSet('auth_tokens', value) : safeSet('auth_tokens', null);
  }
  if (key === 'current_user') {
    // cũng mirror vào auth.user
    const auth = safeGet('auth', {}) || {};
    if (value) auth.user = value; else delete auth.user;
    // nếu auth rỗng thì xoá hẳn, ngược lại lưu lại
    if (!value && !auth.accessToken && !auth.refreshToken && !auth.user) safeSet('auth', null);
    else safeSet('auth', auth);
  }
}

// Xoá toàn bộ thông tin đăng nhập
export function clearAllAuth() {
  save('tokens', null);
  save('current_user', null);
  // xoá thêm phòng hờ
  safeSet('auth', null);
  safeSet('auth_tokens', null);
  // dọn trong NS
  const ns = safeGet(NS, {});
  delete ns.tokens;
  delete ns.current_user;
  safeSet(NS, Object.keys(ns).length ? ns : null);
}

// Hỗ trợ debug nhanh trong Console
export function debugStorage() {
  return {
    [NS]: safeGet(NS, null),
    tokens: safeGet('tokens', null),
    auth: safeGet('auth', null),
    auth_tokens: safeGet('auth_tokens', null),
  };
}
