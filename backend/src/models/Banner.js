import mongoose from 'mongoose';
const BannerSchema = new mongoose.Schema({
  position: String,
  imageUrl: String,
  link: String,
  active: Boolean,
  sort: Number
}, { collection: 'banners' });
export const Banner = mongoose.model('Banner', BannerSchema);
