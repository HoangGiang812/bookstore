// src/controllers/addressController.js
import mongoose from 'mongoose';
import { Address } from '../models/Address.js';

/** ====== Fallback in-memory khi chưa có DB ======
 *  Nếu MONGODB_URI thiếu hoặc kết nối Mongoose chưa sẵn, ta lưu tạm ở RAM.
 */
const useMem = () => !mongoose.connection?.readyState || mongoose.connection.readyState === 0;
const mem = {
  // Map<userId, Address[]>
  data: new Map(),
  list(uid) { return this.data.get(String(uid)) || []; },
  save(uid, list) { this.data.set(String(uid), list); },
  newId() { return String(Date.now()) + Math.random().toString(16).slice(2); }
};

// Chuẩn hoá tỉnh/thành (để dễ xử lý phí ship)
function normalizeProvince(s = '') {
  const t = String(s).trim().toLowerCase();
  if (!t) return '';
  if (['tp.hcm','tp hcm','hcm','ho chi minh','hồ chí minh'].includes(t)) return 'Hồ Chí Minh';
  if (['hn','ha noi','hà nội'].includes(t)) return 'Hà Nội';
  return s;
}

/** GET /api/me/addresses */
export async function listMyAddresses(req, res) {
  try {
    const uid = req.user?._id;
    if (!uid) return res.status(401).json({ message: 'unauthorized' });

    if (useMem()) {
      const items = mem.list(uid);
      return res.json({ items });
    }

    const items = await Address.find({ userId: uid }).sort({ isDefault: -1, updatedAt: -1 }).lean();
    return res.json({ items });
  } catch (e) {
    console.error('listMyAddresses', e);
    return res.status(500).json({ message: 'list_failed' });
  }
}

/** POST /api/me/addresses */
export async function createMyAddress(req, res) {
  try {
    const uid = req.user?._id;
    if (!uid) return res.status(401).json({ message: 'unauthorized' });

    const payload = req.body || {};
    payload.userId = uid;
    payload.province = normalizeProvince(payload.province);

    if (useMem()) {
      const list = mem.list(uid);
      const id = mem.newId();
      const doc = {
        _id: id, id,
        userId: String(uid),
        label: payload.label || 'Nhà riêng',
        receiver: payload.receiver || '',
        phone: payload.phone || '',
        province: payload.province || '',
        district: payload.district || '',
        ward: payload.ward || '',
        detail: payload.detail || '',
        isDefault: !!payload.isDefault || list.length === 0,
        createdAt: new Date(), updatedAt: new Date()
      };
      // nếu set default -> bỏ default địa chỉ khác
      if (doc.isDefault) list.forEach(a => a.isDefault = false);
      const next = [doc, ...list];
      mem.save(uid, next);
      return res.status(201).json({ _id: id });
    }

    // Mongo path
    const hasAny = await Address.exists({ userId: uid });
    const isDefault = payload.isDefault || !hasAny;

    if (isDefault) {
      await Address.updateMany({ userId: uid, isDefault: true }, { $set: { isDefault: false } });
    }

    const created = await Address.create({
      userId: uid,
      label: payload.label || 'Nhà riêng',
      receiver: payload.receiver,
      phone: payload.phone,
      province: payload.province,
      district: payload.district || '',
      ward: payload.ward || '',
      detail: payload.detail,
      isDefault
    });

    return res.status(201).json({ _id: created._id });
  } catch (e) {
    console.error('createMyAddress', e);
    return res.status(500).json({ message: 'create_failed' });
  }
}

/** PUT /api/me/addresses/:id */
export async function updateMyAddress(req, res) {
  try {
    const uid = req.user?._id;
    if (!uid) return res.status(401).json({ message: 'unauthorized' });
    const id = req.params.id;

    const input = req.body || {};
    input.province = normalizeProvince(input.province);

    if (useMem()) {
      const list = mem.list(uid);
      const idx = list.findIndex(a => String(a._id) === String(id) || String(a.id) === String(id));
      if (idx < 0) return res.status(404).json({ message: 'not_found' });
      const prev = list[idx];

      // cập nhật
      const nextItem = { ...prev, ...input, updatedAt: new Date() };
      // đảm bảo chỉ một default
      if (nextItem.isDefault) list.forEach(a => a.isDefault = (String(a._id) === String(nextItem._id)));
      list[idx] = nextItem;
      mem.save(uid, list);
      return res.json({ ok: 1 });
    }

    const doc = await Address.findOne({ _id: id, userId: uid });
    if (!doc) return res.status(404).json({ message: 'not_found' });

    const willDefault = !!input.isDefault;
    if (willDefault) {
      await Address.updateMany({ userId: uid, isDefault: true }, { $set: { isDefault: false } });
    }

    doc.label = input.label ?? doc.label;
    doc.receiver = input.receiver ?? doc.receiver;
    doc.phone = input.phone ?? doc.phone;
    doc.province = input.province ?? doc.province;
    doc.district = input.district ?? doc.district;
    doc.ward = input.ward ?? doc.ward;
    doc.detail = input.detail ?? doc.detail;
    if (typeof input.isDefault === 'boolean') doc.isDefault = input.isDefault;

    await doc.save();
    return res.json({ ok: 1 });
  } catch (e) {
    console.error('updateMyAddress', e);
    return res.status(500).json({ message: 'update_failed' });
  }
}

/** DELETE /api/me/addresses/:id */
export async function deleteMyAddress(req, res) {
  try {
    const uid = req.user?._id;
    if (!uid) return res.status(401).json({ message: 'unauthorized' });
    const id = req.params.id;

    if (useMem()) {
      const list = mem.list(uid);
      const tgt = list.find(a => String(a._id) === String(id) || String(a.id) === String(id));
      if (!tgt) return res.status(404).json({ message: 'not_found' });
      const next = list.filter(a => (String(a._id) !== String(id) && String(a.id) !== String(id)));
      // nếu xoá default -> set default cho phần tử đầu nếu còn
      if (tgt.isDefault && next.length) next[0].isDefault = true;
      mem.save(uid, next);
      return res.json({ ok: 1 });
    }

    const doc = await Address.findOne({ _id: id, userId: uid });
    if (!doc) return res.status(404).json({ message: 'not_found' });

    const wasDefault = !!doc.isDefault;
    await doc.deleteOne();

    if (wasDefault) {
      // gán default cho 1 item bất kỳ còn lại
      const another = await Address.findOne({ userId: uid }).sort({ updatedAt: -1 });
      if (another) {
        another.isDefault = true;
        await another.save();
      }
    }

    return res.json({ ok: 1 });
  } catch (e) {
    console.error('deleteMyAddress', e);
    return res.status(500).json({ message: 'delete_failed' });
  }
}

/** PATCH /api/me/addresses/:id/default  { isDefault: true } */
export async function setDefaultMyAddress(req, res) {
  try {
    const uid = req.user?._id;
    if (!uid) return res.status(401).json({ message: 'unauthorized' });
    const id = req.params.id;

    if (useMem()) {
      const list = mem.list(uid);
      const idx = list.findIndex(a => String(a._id) === String(id) || String(a.id) === String(id));
      if (idx < 0) return res.status(404).json({ message: 'not_found' });
      list.forEach((a, i) => { a.isDefault = (i === idx); });
      mem.save(uid, list);
      return res.json({ ok: 1 });
    }

    const exists = await Address.findOne({ _id: id, userId: uid });
    if (!exists) return res.status(404).json({ message: 'not_found' });

    await Address.updateMany({ userId: uid, isDefault: true }, { $set: { isDefault: false } });
    await Address.updateOne({ _id: id, userId: uid }, { $set: { isDefault: true } });

    return res.json({ ok: 1 });
  } catch (e) {
    console.error('setDefaultMyAddress', e);
    return res.status(500).json({ message: 'set_default_failed' });
  }
}
