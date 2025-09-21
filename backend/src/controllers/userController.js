import { User } from '../models/User.js';

export async function me(req, res) {
  const u = await User.findById(req.user._id).lean();
  if (!u) return res.status(404).json({ message: 'Not found' });
  delete u.passwordHash;
  res.json(u);
}

export async function updateMe(req, res) {
  const { name, phone, avatarUrl } = req.body;
  const u = await User.findByIdAndUpdate(req.user._id, { $set: { name, phone, avatarUrl } }, { new: true }).lean();
  delete u.passwordHash;
  res.json(u);
}

export async function listAddresses(req, res) {
  const u = await User.findById(req.user._id).lean();
  res.json(u.addresses || []);
}
export async function addAddress(req, res) {
  const addr = req.body;
  if (addr.isDefault) {
    await User.updateOne({ _id: req.user._id }, { $set: { 'addresses.$[].isDefault': false } });
  }
  await User.updateOne({ _id: req.user._id }, { $push: { addresses: addr } });
  res.json({ ok: true });
}
export async function updateAddress(req, res) {
  const idx = Number(req.params.index);
  const u = await User.findById(req.user._id);
  if (!u || !u.addresses || !u.addresses[idx]) return res.status(404).json({ message: 'Address not found' });
  if (req.body.isDefault) u.addresses.forEach(a => a.isDefault = false);
  u.addresses[idx] = { ...u.addresses[idx].toObject(), ...req.body };
  await u.save();
  res.json({ ok: true });
}
export async function deleteAddress(req, res) {
  const idx = Number(req.params.index);
  const u = await User.findById(req.user._id);
  if (!u || !u.addresses || !u.addresses[idx]) return res.status(404).json({ message: 'Address not found' });
  u.addresses.splice(idx, 1);
  await u.save();
  res.json({ ok: true });
}
