import mongoose from 'mongoose';

const PasswordResetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  token: { type: String, index: true, unique: true },
  expiresAt: Date,
  usedAt: Date
}, { timestamps: true, collection: 'password_resets' });

PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordReset = mongoose.model('PasswordReset', PasswordResetSchema);
