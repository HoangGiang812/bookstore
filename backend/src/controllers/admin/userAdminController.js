import { User } from '../../models/User.js';

export const lockUnlockUser = async (req, res) => {
  const { id } = req.params;
  const { active } = req.body; // true/false
  const u = await User.findByIdAndUpdate(id, { active }, { new: true }).lean();
  if (!u) return res.status(404).json({ message: 'user_not_found' });
  res.json(u);
};
