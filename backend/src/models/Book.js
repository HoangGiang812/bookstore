// backend/src/models/Book.js
import mongoose from 'mongoose';

const BookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    author: String,
    authorName: String,
    image: String,
    coverUrl: String,

    price: { type: Number, default: 0, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },

    stock: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['available', 'out-of-stock'], default: 'available' },

    rating: Number,
    soldCount: Number,
    publishYear: Number,

    authorIds: [mongoose.Schema.Types.ObjectId],
    categoryIds: [mongoose.Schema.Types.ObjectId],
    publisherId: { type: mongoose.Schema.Types.ObjectId, default: null },
    tags: [String],
    slug: String,
    isbn: String,
    isActive: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    isFlashSale: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret) => {
        ret.id = String(ret._id);
        delete ret._id;
      }
    },
    toObject: { virtuals: true },
  }
);

// Virtual salePrice
BookSchema.virtual('salePrice').get(function () {
  const base = Number(this.price || 0);
  const off = Math.max(0, Math.min(100, Number(this.discountPercent || 0)));
  return Math.round(base * (1 - off / 100));
});

BookSchema.pre('save', function (next) {
  if (!this.isModified('status')) {
    this.status = Number(this.stock) > 0 ? 'available' : 'out-of-stock';
  }
  next();
});

BookSchema.index({ soldCount: -1 });
BookSchema.index({ publishYear: -1 });

const Book = mongoose.models.Book || mongoose.model('Book', BookSchema);
export { Book };
export default Book;
