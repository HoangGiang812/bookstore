import mongoose from "mongoose";
import slugify from "slugify";

const { Schema } = mongoose;

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    path: { type: [Schema.Types.ObjectId], default: [] }, // tổ tiên từ root -> parent
    active: { type: Boolean, default: true, index: true },
    sort: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

// slug tự sinh từ name nếu chưa có / làm sạch slug
CategorySchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  } else if (this.slug) {
    this.slug = slugify(this.slug, { lower: true, strict: true });
  }
  next();
});

// tính lại path khi đổi parentId
CategorySchema.pre("save", async function (next) {
  if (this.isModified("parentId")) {
    if (this.parentId) {
      const parent = await this.constructor.findById(this.parentId).select("_id path");
      if (!parent) return next(new Error("parentId không tồn tại"));
      this.path = [...parent.path, parent._id];
    } else {
      this.path = [];
    }
  }
  next();
});

// tránh vòng lặp: parentId không được là chính nó/ậu duệ của nó
CategorySchema.pre("save", async function (next) {
  if (!this.parentId) return next();
  if (this._id && (this.parentId.equals(this._id) || this.path.includes(this._id))) {
    return next(new Error("parentId không hợp lệ (tạo vòng lặp)"));
  }
  next();
});

export const Category = mongoose.model("Category", CategorySchema);
