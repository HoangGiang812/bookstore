import mongoose from 'mongoose';

const AddressSchema = new mongoose.Schema({
  fullName: String,
  phone: String,
  province: String,
  district: String,
  ward: String,
  line1: String,
  isDefault: { type: Boolean, default: false }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  resetOtp: { type: String, default: null },
  resetOtpExpires: { type: Date, default: null },
  resetOtpRequestedAt: { type: Date, default: null },
  resetOtpTries: { type: Number, default: 0 },
  email: { type: String, unique: true },
  passwordHash: String,
  name: String,
  phone: String,
  avatarUrl: String,
  role: { type: String, default: 'user' },
  roles: { type: [String], default: ['user'] },
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  addresses: { type: [AddressSchema], default: [] },
  wishlist: { type: [mongoose.Schema.Types.ObjectId], ref: 'Book', default: [] },
  status: { type: String, default: 'active' }
}, { timestamps: true, collection: 'users' });

export const User = mongoose.model('User', UserSchema);
