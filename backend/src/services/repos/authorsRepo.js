// services/repos/authorsRepo.js
import mongoose from 'mongoose';
import Author from '../../models/Author.js';
import { slugify } from '../../utils/slug.js';

// Bật proxy ảnh qua env nếu bạn đã có router /api/images/proxy
const USE_IMAGE_PROXY = process.env.USE_IMAGE_PROXY === '1';

// --- tiện ích: tạo URL proxy ảnh (chỉ cho http/https), giữ nguyên data URL ---
function proxifyAvatar(url) {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return url; // data:... hoặc đường dẫn local => giữ nguyên
  return USE_IMAGE_PROXY
    ? `/api/images/proxy?u=${encodeURIComponent(url)}`
    : url;
}

// Gom key ảnh về một đầu mối
function pickRawAvatar(a) {
  return a.avatarUrl ?? a.avatar ?? a.photoUrl ?? null;
}

// Chuẩn hoá output cho FE
const mapAuthor = (a) => {
  const rawAvatar = pickRawAvatar(a);
  return {
    id: a._id?.toString() ?? a.id,
    name: a.name ?? a.fullName ?? a.displayName ?? 'Unknown',
    avatar: proxifyAvatar(rawAvatar),
    avatarUrl: rawAvatar,
    slug: a.slug ?? slugify(a.name ?? a.fullName ?? a.displayName ?? ''),
    bio: a.bio ?? '',
    website: a.website ?? '',
    socials: a.socials ?? {},
    bookCount: a.bookCount ?? 0,
  };
};

// -------- helper: sinh slug duy nhất ----------
async function makeUniqueAuthorSlug(nameOrSlug) {
  const base = slugify(nameOrSlug || '');
  if (!base) return '';
  let slug = base;
  let i = 1;
  while (await Author.exists({ slug })) {
    i += 1;
    slug = `${base}-${i}`;
  }
  return slug;
}

// ----- tìm trùng theo slug gốc hoặc tên (case-insensitive) -----
async function findExistingAuthorByNameOrSlug(name) {
  if (!name) return null;
  const baseSlug = slugify(name);
  return Author.findOne({
    $or: [
      { slug: baseSlug },
      { name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
    ],
  });
}

/** ===== Helpers dùng chung cho Books routes ===== */
export async function getOrCreateAuthorByName(name) {
  const raw = String(name || '').trim();
  if (!raw) return null;
  const existed = await Author.findOne({
    name: { $regex: `^${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
  });
  if (existed) return existed;
  return Author.create({ name: raw, bookCount: 0, slug: slugify(raw) });
}

export async function incAuthorBookCountByName(name, delta = 1) {
  const a = await getOrCreateAuthorByName(name);
  if (!a) return null;
  const res = await Author.findByIdAndUpdate(a._id, { $inc: { bookCount: delta } }, { new: true });
  if (res.bookCount < 0) {
    res.bookCount = 0;
    await res.save();
  }
  return res;
}

export async function decAuthorBookCountByName(name, delta = 1) {
  return incAuthorBookCountByName(name, -Math.abs(delta));
}
/** ===== End helpers ===== */

export async function listAuthors({ limit = 50, start = 0, q = '', sort }) {
  const take = Math.min(500, Number(limit) + 50); // Lấy dư một chút
  const skip = Number(start) || 0;

  // Điều kiện lọc
  const matchStage = q
    ? {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { fullName: { $regex: q, $options: 'i' } },
          { displayName: { $regex: q, $options: 'i' } },
        ],
      }
    : {};

  // Pipeline Aggregation để đếm sách
  const pipeline = [
    { $match: matchStage },
    
    // 1. Lookup sang bảng Books để đếm số lượng
    {
      $lookup: {
        from: 'books', // Tên collection trong DB (thường là 'books')
        let: { authorId: '$_id', authorName: '$name' },
        pipeline: [
          { 
            $match: { 
              $expr: { 
                $or: [
                  // Match theo ID (nếu book lưu authorIds là ObjectId)
                  { $in: ['$$authorId', { $ifNull: ['$authorIds', []] }] }, 
                  // Match theo tên (fallback cho dữ liệu cũ)
                  { $eq: ['$author', '$$authorName'] } 
                ]
              } 
            } 
          },
          // Chỉ cần đếm, không cần lấy dữ liệu
          { $count: "count" }
        ],
        as: 'bookCountData'
      }
    },
    
    // 2. Gán giá trị đếm được vào field bookCount
    {
      $addFields: {
        bookCount: { $ifNull: [{ $arrayElemAt: ["$bookCountData.count", 0] }, 0] }
      }
    },
    
    // 3. Bỏ trường tạm đi cho nhẹ
    { $project: { bookCountData: 0 } }
  ];

  // Xử lý sắp xếp
  if (sort === 'random') {
      pipeline.push({ $sample: { size: Number(limit) } });
  } else {
      pipeline.push({ $sort: { name: 1 } });
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: take });
  }

  const rows = await Author.aggregate(pipeline);

  // Map lại kết quả qua hàm mapAuthor để chuẩn hóa avatar...
  return rows.slice(0, limit).map(mapAuthor);
}

export async function getAuthorById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await Author.findById(id);
  if (!doc) return null;
  return mapAuthor(doc.toObject());
}

export async function getAuthorBySlug(slug) {
  const doc = await Author.findOne({ slug });
  if (!doc) return null;
  return mapAuthor(doc.toObject());
}

// ---- CREATE (Upsert): nếu trùng thì cập nhật field gửi lên thay vì tạo mới ----
export async function createAuthor(payload = {}) {
  const { name, slug, avatarUrl, bio, website, socials } = payload;
  if (!name?.trim()) throw new Error('Name is required');

  // kiểm tra trùng theo name/slug
  const existed = await findExistingAuthorByNameOrSlug(name.trim());

  if (existed) {
    let changed = false;
    if (avatarUrl !== undefined && avatarUrl !== existed.avatarUrl) {
      existed.avatarUrl = avatarUrl || null; changed = true;
    }
    if (bio !== undefined && bio !== existed.bio) {
      existed.bio = bio || ''; changed = true;
    }
    if (website !== undefined && website !== existed.website) {
      existed.website = website || ''; changed = true;
    }
    if (socials !== undefined) {
      existed.socials = socials || {}; changed = true;
    }
    if (slug?.trim() && slug.trim() !== existed.slug) {
      existed.slug = await makeUniqueAuthorSlug(slug.trim()); changed = true;
    }
    if (changed) await existed.save();
    const out = mapAuthor(existed.toObject());
    out._existed = true; // cho FE biết là đã tồn tại
    return out;
  }

  // tạo mới
  const finalSlug = slug?.trim()
    ? await makeUniqueAuthorSlug(slug)
    : await makeUniqueAuthorSlug(name);

  const doc = await Author.create({
    name: String(name).trim(),
    slug: finalSlug,
    avatarUrl: avatarUrl || null,
    bio: bio || '',
    website: website || '',
    socials: socials || {},
  });

  return mapAuthor(doc.toObject());
}

export async function updateAuthor(idOrSlug, payload = {}) {
  const query = mongoose.Types.ObjectId.isValid(idOrSlug)
    ? { _id: new mongoose.Types.ObjectId(idOrSlug) }
    : { slug: String(idOrSlug) };

  const doc = await Author.findOne(query);
  if (!doc) throw new Error('Author not found');

  const prevName = doc.name;

  if (payload.name !== undefined) doc.name = String(payload.name || '').trim();
  if (payload.avatarUrl !== undefined) doc.avatarUrl = payload.avatarUrl || null;
  if (payload.bio !== undefined) doc.bio = payload.bio || '';
  if (payload.website !== undefined) doc.website = payload.website || '';
  if (payload.socials !== undefined) doc.socials = payload.socials || {};

  // nếu client không gửi slug mới nhưng đổi name → tự cập nhật slug (khi slug hiện tại là slug theo tên cũ)
  if (payload.slug !== undefined) {
    const requested = String(payload.slug || '').trim() || slugify(doc.name);
    if (requested !== doc.slug) {
      doc.slug = await makeUniqueAuthorSlug(requested);
    }
  } else if (payload.name !== undefined && slugify(prevName) === doc.slug) {
    doc.slug = await makeUniqueAuthorSlug(doc.name);
  }

  await doc.save();
  return mapAuthor(doc.toObject());
}

export async function deleteAuthor(idOrSlug) {
  const query = mongoose.Types.ObjectId.isValid(idOrSlug)
    ? { _id: new mongoose.Types.ObjectId(idOrSlug) }
    : { slug: String(idOrSlug) };

  const doc = await Author.findOne(query);
  if (!doc) throw new Error('Author not found');

  // BẢO VỆ: không cho xoá nếu còn sách
  if (Number(doc.bookCount || 0) > 0) {
    const err = new Error('Cannot delete author with existing books');
    err.code = 'AUTHOR_HAS_BOOKS';
    throw err;
  }
  await Author.deleteOne({ _id: doc._id });
  return { id: doc._id.toString(), slug: doc.slug };
}
