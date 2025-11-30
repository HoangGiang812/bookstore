import mongoose from 'mongoose';
const { Schema } = mongoose;

const SettingSchema = new Schema({
  key: { type: String, required: true, unique: true }, // Dùng 'key' để định danh (vd: homepage_layout)
  value: { type: Schema.Types.Mixed, required: true }, // Lưu JSON cấu hình bất kỳ
}, { timestamps: true, collection: 'settings' });

export const Setting = mongoose.model('Setting', SettingSchema);