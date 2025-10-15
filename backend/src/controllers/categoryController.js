// backend/src/controllers/categoryController.js
import mongoose from "mongoose";
import { Category } from "../models/Category.js";
import { Book } from "../models/Book.js";

const isObjectId = (v) => mongoose.isValidObjectId(String(v || ""));

function buildTree(items) {
  const byId = new Map(items.map((c) => [String(c._id), { ...c, children: [] }]));
  const roots = [];
  for (const c of byId.values()) {
    if (c.parentId) {
      const p = byId.get(String(c.parentId));
      if (p) p.children.push(c);
      else roots.push(c);
    } else {
      roots.push(c);
    }
  }
  const sortRec = (arr) => {
    arr.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name));
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

async function findByIdOrSlug(idOrSlug) {
  if (isObjectId(idOrSlug)) {
    const byId = await Category.findById(idOrSlug);
    if (byId) return byId;
  }
  return Category.findOne({ slug: idOrSlug });
}

/* =================== LIST (hỗ trợ ?tree=1) =================== */
export async function listCategories(req, res) {
  const { q, active, parentId, tree } = req.query;
  const wantTree = tree === '1' || tree === 'true' || tree === 1 || tree === true;

  const filter = {};
  if (q) filter.name = new RegExp(String(q), "i");
  if (active !== undefined) filter.active = active === "true" || active === "1";
  if (parentId === "root") filter.parentId = null;
  else if (parentId) filter.parentId = parentId;

  const items = await Category.find(filter).sort({ sort: 1, name: 1 }).lean();
  const total = await Category.countDocuments(filter);

  if (wantTree) {
    const roots = buildTree(items);
    return res.json({ items: roots, total });
  }
  return res.json({ items, total });
}

/* ============== LIST TREE (trả về mảng thuần) ============== */
export async function listCategoriesTree(req, res) {
  const { q, active, parentId } = req.query;

  const filter = {};
  if (q) filter.name = new RegExp(String(q), "i");
  if (active !== undefined) filter.active = active === "true" || active === "1";
  if (parentId === "root") filter.parentId = null;
  else if (parentId) filter.parentId = parentId;

  const items = await Category.find(filter).sort({ sort: 1, name: 1 }).lean();
  const roots = buildTree(items);
  return res.json(roots);
}

/* ======================= GET ONE ======================= */
export async function getCategory(req, res) {
  const { idOrSlug } = req.params;
  const cat = await findByIdOrSlug(idOrSlug).catch(() => null);
  if (!cat) return res.status(404).json({ message: "Không tìm thấy danh mục" });
  return res.json(cat);
}

/* ======================= CREATE ======================= */
export async function createCategory(req, res) {
  const { name, slug, parentId = null, active = true, sort = 0 } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ message: "Thiếu tên danh mục" });

  if (parentId) {
    const parent = await Category.findById(parentId).lean();
    if (!parent) return res.status(400).json({ message: "parentId không tồn tại" });
  }

  const dup = await Category.findOne({
    $or: [
      ...(slug ? [{ slug }] : []),
      { name: name.trim() },
    ],
  }).lean();
  if (dup) return res.status(409).json({ message: "Danh mục đã tồn tại (trùng tên hoặc slug)" });

  const cat = new Category({ name: name.trim(), slug, parentId: parentId || null, active, sort });
  await cat.save(); // Model sẽ tự tính slug/path & chống vòng lặp
  return res.status(201).json(cat);
}

/* ======================= UPDATE ======================= */
export async function updateCategory(req, res) {
  const { idOrSlug } = req.params;
  const cat = await findByIdOrSlug(idOrSlug).catch(() => null);
  if (!cat) return res.status(404).json({ message: "Không tìm thấy danh mục" });

  const { name, slug, parentId, active, sort } = req.body || {};

  if (name !== undefined) cat.name = String(name).trim();
  if (slug !== undefined) cat.slug = slug;

  if (parentId !== undefined) {
    const nextParent = parentId || null;

    if (nextParent && String(nextParent) === String(cat._id)) {
      return res.status(400).json({ message: "parentId không hợp lệ (không thể là chính nó)" });
    }

    if (nextParent) {
      const parent = await Category.findById(nextParent).lean();
      if (!parent) return res.status(400).json({ message: "parentId không tồn tại" });
      const isAncestor =
        Array.isArray(parent.path) &&
        parent.path.map(String).includes(String(cat._id));
      if (isAncestor) {
        return res.status(400).json({ message: "parentId không hợp lệ (tạo vòng lặp)" });
      }
    }
    cat.parentId = nextParent;
  }

  if (active !== undefined) cat.active = !!active;
  if (sort !== undefined) cat.sort = Number(sort) || 0;

  if (slug || name) {
    const dup = await Category.findOne({
      _id: { $ne: cat._id },
      $or: [
        ...(slug ? [{ slug }] : []),
        ...(name ? [{ name: String(name).trim() }] : []),
      ],
    }).lean();
    if (dup) return res.status(409).json({ message: "Danh mục đã tồn tại (trùng tên hoặc slug)" });
  }

  await cat.save();
  return res.json(cat);
}

/* ======================= DELETE ======================= */
export async function removeCategory(req, res) {
  const { idOrSlug } = req.params;
  const existing = await findByIdOrSlug(idOrSlug).catch(() => null);
  if (!existing) return res.status(404).json({ message: "Không tìm thấy danh mục" });

  const hasChildren = await Category.exists({ parentId: existing._id });
  if (hasChildren) {
    return res.status(400).json({ message: "Danh mục có danh mục con, hãy di chuyển hoặc xoá con trước" });
  }
  // Chặn xoá nếu đang gán cho sách
  const usedByBook = await Book.exists({ categoryIds: existing._id });
  if (usedByBook) {
    return res.status(400).json({ message: "Danh mục đang được gán cho sách. Vui lòng di chuyển/cập nhật sách trước khi xoá." });
  }

  await Category.deleteOne({ _id: existing._id });
  return res.json({ message: "Đã xoá" });
}

/* ======================= REORDER ======================= */
export async function reorderCategories(req, res) {
  const { orders } = req.body || {};
  if (!Array.isArray(orders)) return res.status(400).json({ message: "Thiếu orders[]" });
  const ops = orders.map(({ id, sort }) => ({
    updateOne: { filter: { _id: id }, update: { $set: { sort: Number(sort) || 0 } } },
  }));
  if (!ops.length) return res.json({ updated: 0 });
  const result = await Category.bulkWrite(ops, { ordered: false });
  const updated =
    result?.modifiedCount ??
    result?.result?.nModified ??
    0;
  return res.json({ updated });
}
