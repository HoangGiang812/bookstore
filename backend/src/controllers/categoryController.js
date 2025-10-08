import { Category } from "../models/Category.js";

/* =================== LIST (có hỗ trợ ?tree=1) =================== */
export async function listCategories(req, res) {
  const { q, active, parentId, tree } = req.query;

  const filter = {};
  if (q) filter.name = new RegExp(String(q), "i");
  if (active !== undefined) filter.active = active === "true" || active === "1";
  if (parentId === "root") filter.parentId = null;
  else if (parentId) filter.parentId = parentId;

  const items = await Category.find(filter).sort({ sort: 1, name: 1 }).lean();
  const total = await Category.countDocuments(filter);

  if (tree) {
    // trả về dạng cây (bọc trong { items, total })
    const byId = new Map(items.map((c) => [String(c._id), { ...c, children: [] }]));
    const roots = [];
    for (const c of byId.values()) {
      if (c.parentId) {
        const p = byId.get(String(c.parentId));
        if (p) p.children.push(c);
        else roots.push(c); // parent đã bị filter → coi như root tạm
      } else {
        roots.push(c);
      }
    }
    return res.json({ items: roots, total });
  }

  return res.json({ items, total });
}

/* ============== LIST TREE (trả về mảng thuần) ============== */
/* Endpoint riêng để FE đang gọi /api/categories/tree dùng trực tiếp */
export async function listCategoriesTree(req, res) {
  const { q, active, parentId } = req.query;

  const filter = {};
  if (q) filter.name = new RegExp(String(q), "i");
  if (active !== undefined) filter.active = active === "true" || active === "1";
  if (parentId === "root") filter.parentId = null;
  else if (parentId) filter.parentId = parentId;

  const items = await Category.find(filter).sort({ sort: 1, name: 1 }).lean();

  // build tree và trả về MẢNG THUẦN
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

  return res.json(roots);
}

/* ======================= GET ONE ======================= */
export async function getCategory(req, res) {
  const { idOrSlug } = req.params;
  const cat = await Category.findOne({
    $or: [{ _id: idOrSlug }, { slug: idOrSlug }],
  }).catch(() => null);
  if (!cat) return res.status(404).json({ message: "Không tìm thấy danh mục" });
  return res.json(cat);
}

/* ======================= CREATE ======================= */
export async function createCategory(req, res) {
  const { name, slug, parentId = null, active = true, sort = 0 } = req.body || {};
  if (!name) return res.status(400).json({ message: "Thiếu tên danh mục" });

  const exists = await Category.findOne({ $or: [{ name }, { slug }] });
  if (exists) return res.status(409).json({ message: "Danh mục đã tồn tại" });

  const cat = new Category({ name, slug, parentId, active, sort });
  await cat.save();
  return res.status(201).json(cat);
}

/* ======================= UPDATE ======================= */
export async function updateCategory(req, res) {
  const { idOrSlug } = req.params;
  const cat = await Category.findOne({
    $or: [{ _id: idOrSlug }, { slug: idOrSlug }],
  }).catch(() => null);
  if (!cat) return res.status(404).json({ message: "Không tìm thấy danh mục" });

  const { name, slug, parentId, active, sort } = req.body || {};
  if (name !== undefined) cat.name = name;
  if (slug !== undefined) cat.slug = slug;
  if (parentId !== undefined) cat.parentId = parentId || null; // null = root
  if (active !== undefined) cat.active = !!active;
  if (sort !== undefined) cat.sort = Number(sort) || 0;

  await cat.save();
  return res.json(cat);
}

/* ======================= DELETE ======================= */
export async function removeCategory(req, res) {
  const { idOrSlug } = req.params;
  const existing = await Category.findOne({
    $or: [{ _id: idOrSlug }, { slug: idOrSlug }],
  }).catch(() => null);
  if (!existing) return res.status(404).json({ message: "Không tìm thấy danh mục" });

  const hasChildren = await Category.exists({ parentId: existing._id });
  if (hasChildren) {
    return res.status(400).json({ message: "Danh mục có danh mục con, hãy di chuyển hoặc xóa con trước" });
  }

  await Category.deleteOne({ _id: existing._id });
  return res.json({ message: "Đã xóa" });
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
  return res.json({ updated: result.result?.nModified ?? result.modifiedCount ?? 0 });
}
