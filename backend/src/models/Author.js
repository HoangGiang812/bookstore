// models/Author.js
import mongoose from 'mongoose';
import { slugify } from '../utils/slug.js';

const AuthorSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    fullName: { type: String, trim: true },
    displayName: { type: String, trim: true },

    // các alias cũ để tương thích; bạn có thể bỏ nếu không dùng
    avatar: { type: String, default: null },
    photoUrl: { type: String, default: null },

    avatarUrl: { type: String, default: null },
    slug: { type: String, trim: true, index: true, unique: true, sparse: true },
    bio: { type: String, default: '' },
    website: { type: String, default: '' },
    socials: { type: Object, default: {} },

    // quan trọng: số lượng sách của tác giả
    bookCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);



// Tự sinh slug nếu thiếu
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
