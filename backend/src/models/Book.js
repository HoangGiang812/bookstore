import mongoose from 'mongoose';
import slugify from 'slugify';

const { Schema } = mongoose;

const BookSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    // Slug: đường dẫn đẹp (ví dụ: dac-nhan-tam)
    slug: { type: String, trim: true, index: true, unique: true }, 
    
    author: String,
    authorName: String, // Lưu cache tên tác giả để đỡ phải join bảng
    authorIds: [{ type: Schema.Types.ObjectId, ref: 'Author', index: true }],
    
    image: String,
    coverUrl: String,
    code: { type: String, default: null },

    price: { type: Number, default: 0, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    listPrice: { type: Number, default: null, min: 0 },

    stock: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['available', 'out-of-stock'], default: 'available' },

    // --- Thông tin chi tiết (MỚI) ---
    publisher: { type: String },       // Nhà xuất bản
    publicationYear: { type: Number }, // Năm xuất bản
    pages: { type: Number },           // Số trang
    format: { type: String },          // Bìa mềm / Bìa cứng
    size: { type: String },            // Kích thước (13x20cm)
    weight: { type: Number },          // Trọng lượng (gram)
    description: { type: String, default: '' },

    // --- Rating ---
    ratingAvg: { type: Number, default: 0 },
    ratingCnt: { type: Number, default: 0 },
    rating: Number, // field cũ
    soldCount: { type: Number, default: 0 },

    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category', index: true }],
    publisherId: { type: Schema.Types.ObjectId, ref: 'Publisher', default: null },
    
    tags: [String],
    isbn: String,
    
    isActive: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    isFlashSale: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    collection: 'books',
  }
);

// Giá sau giảm
BookSchema.virtual('salePrice').get(function () {
  const base = Number(this.price || 0);
  const off = Math.max(0, Math.min(100, Number(this.discountPercent || 0)));
  return Math.round(base * (1 - off / 100));
});

// HOOK QUAN TRỌNG: Tự động tạo Slug và cập nhật trạng thái Stock
BookSchema.pre('save', function (next) {
  // 1. Nếu tên thay đổi hoặc chưa có slug -> tạo slug mới
  if (this.isModified('title') || !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true, locale: 'vi' });
  }

  // 2. Cập nhật trạng thái còn hàng/hết hàng dựa theo stock
  if (this.isModified('stock')) {
    this.status = Number(this.stock) > 0 ? 'available' : 'out-of-stock';
  }
  next();
});

// Indexes
BookSchema.index({ soldCount: -1 });
BookSchema.index({ createdAt: -1 });

const Book = mongoose.models.Book || mongoose.model('Book', BookSchema);
export { Book };
export default Book;