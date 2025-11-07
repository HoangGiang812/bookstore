// backend/src/models/Banner.js
import mongoose from 'mongoose';

const BannerSchema = new mongoose.Schema(
  {
    position: { type: String, default: 'home-hero' }, // vị trí xuất hiện (hero, sidebar,...)
    title: { type: String},
    subtitle: { type: String },
    ctaText: { type: String, default: 'Xem ngay' },
    link: { type: String, default: '/' }, // /books?sort=newest, /#section, hoặc url ngoài
    imageUrl: { type: String },           // có thể dùng ảnh thay vì nền màu
    bgClass: { type: String, default: 'from-emerald-600 to-teal-600' }, // tailwind gradient
    active: { type: Boolean, default: true },
    sort: { type: Number, default: 0 },
  },
  {
    collection: 'banners',
    timestamps: true,
  }
);

export const Banner = mongoose.model('Banner', BannerSchema);
