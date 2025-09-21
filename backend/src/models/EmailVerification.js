// src/models/EmailVerification.js
import mongoose from 'mongoose';

const EmailVerificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  token: { type: String, index: true, unique: true },
  expiresAt: Date,
  usedAt: Date
}, { timestamps: true, collection: 'email_verifications' });

export const EmailVerification = mongoose.model('EmailVerification', EmailVerificationSchema);
