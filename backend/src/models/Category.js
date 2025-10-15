import mongoose from "mongoose";
import slugify from "slugify";

const { Schema } = mongoose;

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    // Mảng tổ tiên từ root → parent trực tiếp (KHÔNG gồm _id của chính node)
    path: { type: [Schema.Types.ObjectId], default: [] },
    active: { type: Boolean, default: true, index: true },
    sort: { type: Number, default: 0, index: true },
  },
  { timestamps: true, collection: "categories" }
);

/* ========= 1) Chuẩn hoá slug ========= */
CategorySchema.pre("validate", function (next) {
  // dùng locale 'vi' nếu bạn có dấu tiếng Việt
  const opts = { lower: true, strict: true, locale: "vi" };
  if (!this.slug && this.name) this.slug = slugify(this.name, opts);
  if (this.slug) this.slug = slugify(this.slug, opts);
  next();
});

/* ========= 2) Tính path & chặn vòng lặp (pre-save) =========
   - Lưu prevParent/prevPath vào $locals để post-save dùng
   - Tính path mới theo parentId
   - Chặn vòng lặp (parent là chính nó hoặc hậu duệ của nó)
*/
CategorySchema.pre("save", async function (next) {
  this.$locals = this.$locals || {};

  // Lấy thông tin cũ để so sánh sau khi lưu
  if (!this.isNew) {
    const prev = await this.constructor
      .findById(this._id)
      .select("parentId path")
      .lean();
    this.$locals.prevParentId = prev ? prev.parentId : null;
    this.$locals.prevPath = prev ? prev.path || [] : [];
  } else {
    this.$locals.prevParentId = null;
    this.$locals.prevPath = [];
  }

  // Nếu không đổi parentId thì thôi (tránh query thừa)
  if (!this.isModified("parentId")) return next();

  // parentId null → node root
  if (!this.parentId) {
    this.path = [];
    return next();
  }

  // Tự chặn vòng lặp cơ bản: cha = chính nó
  if (this._id && this.parentId?.equals?.(this._id)) {
    return next(new Error("parentId không hợp lệ (tạo vòng lặp)"));
  }

  // Lấy parent để xây path mới
  const parent = await this.constructor
    .findById(this.parentId)
    .select("_id path")
    .lean();
  if (!parent) return next(new Error("parentId không tồn tại"));

  // Nếu parent là hậu duệ của chính nó → vòng lặp
  if (
    this._id &&
    Array.isArray(parent.path) &&
    parent.path.map(String).includes(String(this._id))
  ) {
    return next(new Error("parentId không hợp lệ (tạo vòng lặp)"));
  }

  // Path mới = path của parent + parent._id
  this.path = [...(parent.path || []), parent._id];

  next();
});

/* ========= 3) Sau khi lưu: nếu đổi cha → cập nhật path cho hậu duệ =========
   Thuật toán: với mọi hậu duệ d có path chứa this._id:
   - path hiện tại của d: [...oldPrefix (= prevPath), this._id, ...tailToParent]
   - path mới của d:     [...newPrefix (= this.path), this._id, ...tailToParent]
*/
CategorySchema.post("save", async function (doc, next) {
  try {
    const prevParentId = this.$locals?.prevParentId ?? null;
    const prevPath = this.$locals?.prevPath || [];
    const changedParent =
      String(prevParentId || "") !== String(doc.parentId || "");
    const changedPath =
      JSON.stringify(prevPath) !== JSON.stringify(doc.path || []);
    if (!(changedParent || changedPath)) return next();

    const Cat = this.constructor;
    const descendants = await Cat.find({ path: doc._id })
      .select("_id path")
      .lean();

    if (!descendants.length) return next();

    const oldPrefix = prevPath.map(String); // trước đây
    const newPrefix = (doc.path || []).map(String); // bây giờ
    const pivot = String(doc._id);

    const ops = [];

    for (const d of descendants) {
      const p = (d.path || []).map(String);
      const idx = p.indexOf(pivot);
      if (idx === -1) continue; // an toàn, nhưng theo query chuẩn thì luôn >=0

      // Kiểm tra phần prefix trước pivot có đúng oldPrefix không (trường hợp dữ liệu cũ lệch)
      const currentPrefix = p.slice(0, idx);
      // Tính path mới: newPrefix + [pivot] + tail sau pivot
      const tail = p.slice(idx + 1);
      const newPathForDesc = [...newPrefix, pivot, ...tail];

      // Chỉ update khi có thay đổi thực sự
      if (JSON.stringify(newPathForDesc) !== JSON.stringify(p)) {
        ops.push({
          updateOne: {
            filter: { _id: d._id },
            update: { $set: { path: newPathForDesc } },
          },
        });
      }
    }

    if (ops.length) {
      await Cat.bulkWrite(ops, { ordered: false });
    }
  } catch (e) {
    // không chặn request; có thể log ra logger của bạn
    // console.error("Update descendants path failed:", e);
  }
  next();
});

/* ========= 4) Index ========= */
CategorySchema.index({ parentId: 1, sort: 1 });
CategorySchema.index({ path: 1 });

export const Category = mongoose.model("Category", CategorySchema);
