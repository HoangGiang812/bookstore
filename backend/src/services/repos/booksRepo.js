// backend/src/services/repos/booksRepo.js
import mongoose from 'mongoose';
import Book from '../../models/Book.js';

/* ===== Helpers ===== */
// Ép kiểu số an toàn, cho phép chuỗi kiểu "120.000đ" -> 120000
const num = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const safeYear = (b) => {
  const y =
    b.publishYear ??
    b.publishedYear ??
    (b.publishedAt ? new Date(b.publishedAt).getFullYear() : null) ??
    (b.createdAt ? new Date(b.createdAt).getFullYear() : null);
  return y != null ? Number(y) : null;
};

/* ===== Chuẩn hoá dữ liệu gửi ra FE =====
   - Luôn trả price, originalPrice là số
   - Suy luận originalPrice từ discountPercent nếu thiếu
   - Trả thêm discountPercent để FE dùng/đối chiếu
*/
const mapBook = (b) => {
  const price = num(b.price);
  const rawOriginal = b.originalPrice != null ? num(b.originalPrice) : 0;
  const rawDiscountPct = b.discountPercent != null ? num(b.discountPercent) : 0;

  // Nếu thiếu originalPrice mà có % giảm => suy luận từ price
  let originalPrice = rawOriginal;
  if (!originalPrice && rawDiscountPct > 0 && price > 0) {
    originalPrice = Math.round(price / (1 - rawDiscountPct / 100));
  }
  // Nếu vẫn thiếu, coi như không giảm (để FE không gạch)
  if (!originalPrice) originalPrice = price;

  // Tính % giảm cuối cùng (ưu tiên thực tế originalPrice > price)
  const discountPercent =
    originalPrice > price && originalPrice > 0
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  return {
    id: b._id?.toString() ?? b.id,
    title: b.title,
    author: b.author ?? b.authorName ?? null,
    image: b.image ?? b.coverUrl ?? null,

    price,
    originalPrice,
    discountPercent,

    rating: b.rating != null ? num(b.rating) : null,
    soldCount: b.soldCount != null ? num(b.soldCount) : null,
    publishYear: safeYear(b),
    // bạn có thể trả thêm các trường khác nếu FE cần:
    description: b.description ?? '',
    coverUrl: b.coverUrl ?? b.image ?? null,
    slug: b.slug ?? null,
    stock: b.stock ?? 0,
    status: b.status ?? 'available',
  };
};

export async function listBooks({ group, limit = 50, start = 0 }) {
  // lấy dư để đủ cho sliding window ở FE
  const take = Math.min(500, start + limit + 50);

  // nhớ lấy cả discountPercent để có dữ liệu suy luận
  const fields =
    'title author authorName image coverUrl price originalPrice discountPercent rating soldCount publishYear publishedYear publishedAt createdAt updatedAt description slug stock status';

  let rows = [];

  if (group === 'bestsellers') {
    // bán chạy: sort theo soldCount, rồi thời gian
    rows = await Book.find({}, fields)
      .sort({ soldCount: -1, createdAt: -1 })
      .limit(take)
      .lean();

  } else if (group === 'new') {
    // sách mới: ưu tiên publishYear gần đây; fallback createdAt
    const year = new Date().getFullYear();
    const byPubYear = await Book.find(
      { publishYear: { $gte: year - 1 } },
      fields
    )
      .sort({ publishYear: -1, createdAt: -1 })
      .limit(take)
      .lean();

    rows =
      byPubYear.length > 0
        ? byPubYear
        : await Book.find({}, fields)
            .sort({ createdAt: -1 })
            .limit(take)
            .lean();

  } else if (group === 'deals') {
    // khuyến mãi: ưu tiên originalPrice > price (so sánh số an toàn)
    let byPrice = await Book.find(
      {
        $expr: {
          $gt: [
            { $toDouble: { $ifNull: ['$originalPrice', 0] } },
            { $toDouble: { $ifNull: ['$price', 0] } },
          ],
        },
      },
      fields
    )
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(take)
      .lean();

    // fallback: có discountPercent > 0
    if (byPrice.length === 0) {
      byPrice = await Book.find(
        { discountPercent: { $gt: 0 } },
        fields
      )
        .sort({ discountPercent: -1, updatedAt: -1 })
        .limit(take)
        .lean();
    }

    // fallback cuối: mới nhất
    if (byPrice.length === 0) {
      byPrice = await Book.find({}, fields)
        .sort({ createdAt: -1 })
        .limit(take)
        .lean();
    }

    rows = byPrice;

  } else {
    // mặc định
    rows = await Book.find({}, fields).limit(take).lean();
  }

  // cắt cửa sổ và map chuẩn hoá
  return rows.slice(start, start + limit).map(mapBook);
}

/** Lấy chi tiết theo id (ObjectId) hoặc slug */
export async function getBookByIdOrSlug(idOrSlug) {
  const fields =
    'title author authorName image coverUrl price originalPrice discountPercent rating soldCount publishYear publishedYear publishedAt createdAt updatedAt description slug stock status';

  let doc = null;

  if (mongoose.isValidObjectId(idOrSlug)) {
    doc = await Book.findById(idOrSlug, fields).lean();
  }
  if (!doc) {
    doc = await Book.findOne({ slug: idOrSlug }, fields).lean();
  }

  return doc ? mapBook(doc) : null;
}
