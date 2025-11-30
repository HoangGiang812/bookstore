import mongoose from 'mongoose';
import slugify from 'slugify';
const { Schema } = mongoose;

const CollectionSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true },
  description: { type: String },
  banner: { type: String },
  isActive: { type: Boolean, default: true },
  books: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
}, { timestamps: true, collection: 'collections' });

// Hook: Tự động tạo 'slug' từ 'name' trước khi lưu
CollectionSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true, locale: 'vi' });
  }
  next();
});

export const Collection = mongoose.model('Collection', CollectionSchema);