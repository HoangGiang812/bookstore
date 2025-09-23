import mongoose from 'mongoose';
import { slugify } from '../utils/slug.js';// tạo mới file utils (ở dưới) hoặc dùng hàm sẵn có của bạn

const AuthorSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    fullName: { type: String, trim: true },
    displayName: { type: String, trim: true },
    avatar: { type: String, default: null },
    photoUrl: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    slug: { type: String, trim: true, index: true, unique: true, sparse: true },
    bookCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AuthorSchema.pre('save', function (next) {
  if (!this.slug && (this.name || this.fullName || this.displayName)) {
    const base = this.name || this.fullName || this.displayName;
    this.slug = slugify(base);
  }
  next();
});

const Author = mongoose.models.Author || mongoose.model('Author', AuthorSchema);
export { Author };
export default Author;
