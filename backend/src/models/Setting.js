import mongoose from 'mongoose';
const SettingSchema = new mongoose.Schema({
  _id: String,
  value: mongoose.Schema.Types.Mixed
}, { collection: 'settings' });
export const Setting = mongoose.model('Setting', SettingSchema);
