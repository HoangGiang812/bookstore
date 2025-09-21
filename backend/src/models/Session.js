import mongoose from 'mongoose';
const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  refreshTokenHash: String,
  ip: String, ua: String,
  createdAt: Date, expiresAt: Date
}, { collection: 'sessions' });
export const Session = mongoose.model('Session', SessionSchema);
