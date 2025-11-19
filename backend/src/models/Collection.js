import mongoose from 'mongoose';
import slugify from 'slugify';
const { Schema } = mongoose;

const CollectionSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Tên bộ sưu tập là bắt buộc'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    // Slug sẽ được tự động tạo từ 'name'
  },
  description: {
    type: String,
    trim: true
  },
  // Đây là danh sách các ID của sách, tham chiếu đến Model 'Book'
  books: [{
    type: Schema.Types.ObjectId,
    ref: 'Book'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true, collection: 'collections' });

// Hook: Tự động tạo 'slug' từ 'name' trước khi lưu
CollectionSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true, locale: 'vi' });
  }
  next();
});

export const Collection = mongoose.model('Collection', CollectionSchema);