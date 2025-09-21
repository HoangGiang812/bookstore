import { Newsletter } from '../models/Newsletter.js';

export async function subscribe(req, res) {
  const { email } = req.body;
  const doc = await Newsletter.findOneAndUpdate({ email }, { $set: { isActive: true } }, { new: true, upsert: true });
  res.json(doc);
}
export async function unsubscribe(req, res) {
  const { email } = req.body;
  await Newsletter.updateOne({ email }, { $set: { isActive: false } });
  res.json({ ok: true });
}
