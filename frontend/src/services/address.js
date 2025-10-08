// src/services/address.js
import api from './api';
import { load, save } from './storage';

const keyFor = (uid) => `addresses_${uid || 'guest'}`;

function lsList(uid) {
  return load(keyFor(uid), []);
}
function lsSave(uid, list) {
  // luôn đảm bảo có 1 địa chỉ mặc định
  const arr = Array.isArray(list) ? list.slice() : [];
  if (arr.length && !arr.some(x => x?.isDefault)) arr[0].isDefault = true;
  save(keyFor(uid), arr);
  try { window.dispatchEvent(new Event('addresses:changed')); } catch {}
  return arr;
}

// ========== API preferred, fallback local ==========
export async function listAddresses(uid) {
  try {
    const data = await api.get('/api/me/addresses');
    // BE trả mảng object; chuẩn hoá id
    const arr = (Array.isArray(data) ? data : []).map(a => ({ id: a._id || a.id, ...a }));
    lsSave(uid, arr);
    return arr;
  } catch {
    return lsList(uid);
  }
}

export async function addAddress(uid, addr) {
  try {
    const res = await api.post('/api/me/addresses', addr); // { _id }
    // đồng bộ lại list
    const list = await listAddresses(uid);
    return list;
  } catch {
    // local fallback
    const now = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : String(Date.now());
    const cur = lsList(uid);
    const item = { id: now, _id: now, ...addr };
    const next = addr?.isDefault ? cur.map(x => ({ ...x, isDefault: false })) : cur.slice();
    next.unshift(item);
    return lsSave(uid, next);
  }
}

export async function removeAddress(uid, id) {
  try {
    await api.delete(`/api/me/addresses/${id}`);
    return listAddresses(uid);
  } catch {
    const next = lsList(uid).filter(x => String(x.id) !== String(id) && String(x._id) !== String(id));
    return lsSave(uid, next);
  }
}

export async function setDefaultAddress(uid, id) {
  try {
    await api.patch(`/api/me/addresses/${id}/default`, { isDefault: true });
    return listAddresses(uid);
  } catch {
    const next = lsList(uid).map(x => ({ ...x, isDefault: String(x.id) === String(id) || String(x._id) === String(id) }));
    return lsSave(uid, next);
  }
}
