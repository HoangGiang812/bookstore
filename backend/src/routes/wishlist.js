import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

const r = Router();
r.get('/', requireAuth, async (req, res) => {
  const u = await User.findById(req.user._id).select('wishlist').lean();
  res.json(u.wishlist || []);
});
r.post('/:bookId', requireAuth, async (req, res) => {
  const id = new mongoose.Types.ObjectId(req.params.bookId);
  await User.updateOne({ _id: req.user._id }, { $addToSet: { wishlist: id } });
  res.json({ ok: true });
});
r.delete('/:bookId', requireAuth, async (req, res) => {
  const id = new mongoose.Types.ObjectId(req.params.bookId);
  await User.updateOne({ _id: req.user._id }, { $pull: { wishlist: id } });
  res.json({ ok: true });
});
export default r;
