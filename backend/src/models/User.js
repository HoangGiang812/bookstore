// backend/src/models/User.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

/* ĐỊA CHỈ: cho phép _id để FE thao tác theo id; có cả field mới (receiver, detail, label)
   và field cũ (fullName, line1) để tương thích ngược. */
const AddressSchema = new Schema({
  // NEW
  label:      { type: String, default: 'Nhà riêng' },
  receiver:   { type: String },                 // FE dùng
  detail:     { type: String },                 // FE dùng (địa chỉ chi tiết)

  // Legacy (để đọc dữ liệu cũ)
  fullName:   { type: String },                 // map -> receiver nếu thiếu
  line1:      { type: String },                 // map -> detail nếu thiếu

  phone:      { type: String },
  province:   { type: String },
  district:   { type: String },
  ward:       { type: String },
  isDefault:  { type: Boolean, default: false },
}, { _id: true }); // <-- cho phép _id tự sinh

const UserSchema = new Schema({
  email:         { type: String, unique: true },
  passwordHash:  String,
  name:          String,
  phone:         String,
  avatarUrl:     String,
  role:          { type: String, default: 'user' },
  roles:         { type: [String], default: ['user'] },
  isActive:      { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  status:        { type: String, default: 'active' },

  // NEW: Hồ sơ bổ sung để lưu từ FE (giữ format FE đang gửi)
  dob: {
    d: { type: String, default: '' },
    m: { type: String, default: '' },
    y: { type: String, default: '' },
  },
  gender: { type: String, enum: ['Nam','Nữ','Khác'], default: 'Nam' },
  nation: { type: String, default: 'Việt Nam' },

  // Địa chỉ
  addresses:     { type: [AddressSchema], default: [] },

  // Wishlist (giữ nguyên)
  wishlist:      { type: [Schema.Types.ObjectId], ref: 'Book', default: [] },

  // OTP reset mật khẩu (đang có)
  resetOtp:           { type: String, default: null },
  resetOtpExpires:    { type: Date, default: null },
  resetOtpRequestedAt:{ type: Date, default: null },
  resetOtpTries:      { type: Number, default: 0 },

  // NEW: Hỗ trợ thiết lập PIN qua email OTP
  pinHash:       { type: String, default: null },   // lưu hash PIN (BCrypt)
  pinOtp:        { type: String, default: null },
  pinOtpExpires: { type: Date, default: null },

  // (tuỳ chọn) log yêu cầu xoá tài khoản
  lastDeleteRequest: {
    reason:    { type: String, default: null },
    createdAt: { type: Date, default: null },
    status:    { type: String, default: null }, // pending/processed/rejected
  },
}, { timestamps: true, collection: 'users' });

/* --------- TIỆN ÍCH CHUẨN HOÁ ĐỊA CHỈ KHI TRẢ VỀ FE ---------
   FE mong đợi: { id, label, receiver, phone, province, district, ward, detail, isDefault }
   Nếu dữ liệu cũ chỉ có fullName/line1 thì tự map sang receiver/detail. */
AddressSchema.methods.toClient = function toClient() {
  return {
    id:        String(this._id),
    label:     this.label || 'Nhà riêng',
    receiver:  this.receiver || this.fullName || '',
    phone:     this.phone || '',
    province:  this.province || '',
    district:  this.district || '',
    ward:      this.ward || '',
    detail:    this.detail || this.line1 || '',
    isDefault: !!this.isDefault,
  };
};

export const User = mongoose.model('User', UserSchema);
