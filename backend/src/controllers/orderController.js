// src/controllers/orderController.js
import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Setting } from '../models/Setting.js';
import { Book } from '../models/Book.js';
import { applyCoupon, markCouponUsed } from '../utils/coupon.js';
import { sendMail, orderConfirmationTemplate } from '../utils/email.js';
import { parsePaging } from '../utils/pagination.js';

/** ---------- Helpers ---------- */
function toInt(n) {
  const v = Number(n || 0);
  return Number.isFinite(v) ? Math.round(v) : 0;
}

function computeTotals(items, shippingFee, taxRate) {
  const subtotal = items.reduce((s, it) => s + toInt(it.price) * toInt(it.qty), 0);
  const taxAmt = taxRate ? Math.floor(subtotal * Number(taxRate)) : 0;
  const ship = toInt(shippingFee);
  return {
    subtotal,
    taxAmt,
    shippingFee: ship,
    grand: subtotal + taxAmt + ship,
  };
}

async function getShippingFee() {
  const ship =
    (await Setting.findOne({ key: 'shipping' }).lean()) ||
    (await Setting.findById('shipping').lean());
  return toInt(ship?.value?.flat ?? ship?.value?.baseFee ?? 20000);
}

async function getTaxRate() {
  const tax =
    (await Setting.findOne({ key: 'tax' }).lean()) ||
    (await Setting.findById('tax').lean());
  return Number(tax?.value?.rate ?? 0);
}

function buildOrderCode() {
  // Ví dụ: ORD-YYYYMMDD-hhmmss-xxx
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${stamp}-${rnd}`;
}

/** ---------- Controllers ---------- */
export async function createOrder(req, res) {
  const session = await mongoose.startSession();
  try {
    const { items, shippingAddress, payment, couponCode } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items' });
    }

    // Idempotency-Key (tùy chọn): nếu client gửi, không tạo trùng đơn
    const idemKey = req.get('Idempotency-Key');
    if (idemKey) {
      const existed = await Order.findOne({ userId: req.user?._id, idempotencyKey: idemKey }).lean();
      if (existed) return res.status(200).json(existed);
    }

    // Config phí ship & thuế
    const [shippingFee, taxRate] = await Promise.all([getShippingFee(), getTaxRate()]);

    // Chuẩn hóa item + lấy snapshot từ Book nếu thiếu
    const norm = [];
    const ids = [];
    for (const it of items) {
      if (!it?.bookId) return res.status(400).json({ message: 'Missing bookId' });
      ids.push(it.bookId);
    }

    const books = await Book.find({ _id: { $in: ids } }).lean();
    const byId = new Map(books.map((b) => [String(b._id), b]));

    for (const it of items) {
      const b = byId.get(String(it.bookId));
      if (!b) return res.status(400).json({ message: 'Book not found', bookId: it.bookId });

      // snapshot
      const price = toInt(it.price ?? b.price);
      const title = it.title ?? b.title;
      const categoryId = it.categoryId ?? (Array.isArray(b.categories) ? b.categories[0] : b.categoryId);
      const qty = Math.max(1, toInt(it.qty));

      norm.push({
        bookId: it.bookId,
        qty,
        price,
        title,
        categoryId,
      });
    }

    // Tính tiền (trước giảm giá)
    const totals = computeTotals(norm, shippingFee, taxRate);

    // Coupon
    let discount = 0;
    let coupon = null;
    if (couponCode) {
      const resCp = await applyCoupon({
        code: couponCode,
        userId: req.user?._id,
        items: norm,
        subtotal: totals.subtotal,
      });
      if (!resCp?.valid) {
        return res.status(400).json({ message: 'Coupon invalid', reason: resCp?.reason || 'invalid' });
      }
      discount = toInt(resCp.discount);
      coupon = resCp.coupon || null;
    }

    // Không để grand âm
    const grand = Math.max(0, totals.grand - discount);

    // Giao dịch: trừ kho an toàn nếu có field stock
    await session.withTransaction(async () => {
      for (const it of norm) {
        // Nếu Book có stock dạng Number – thực hiện trừ kho có điều kiện
        const bookDoc = await Book.findOneAndUpdate(
          { _id: it.bookId, ...(Number.isFinite(byId.get(String(it.bookId))?.stock) ? { stock: { $gte: it.qty } } : {}) },
          Number.isFinite(byId.get(String(it.bookId))?.stock)
            ? { $inc: { stock: -it.qty } }
            : {}, // nếu không có stock, bỏ qua
          { new: true, session }
        );

        if (!bookDoc) {
          // Hết hàng hoặc không tìm thấy
          throw new Error(`OUT_OF_STOCK:${it.bookId}`);
        }
      }

      // Tạo đơn
      const order = await Order.create(
        [
          {
            code: buildOrderCode(),
            idempotencyKey: idemKey || undefined,

            userId: req.user?._id || null,
            status: 'pending',

            items: norm,

            // Tài chính
            subtotal: totals.subtotal,
            shippingFee: totals.shippingFee,
            tax: totals.taxAmt,
            discount,
            total: { sub: totals.subtotal, grand },

            // Thông tin khác
            shippingAddress: shippingAddress || null,
            payment: payment || { method: 'cod', status: 'unpaid' },
            couponCode: couponCode || null,

            // Lịch sử
            history: [
              { ts: new Date(), type: 'create', by: req.user?.email || req.user?.name || 'user', note: 'Order created' },
            ],

            // Mốc thời gian
            placedAt: new Date(),
          },
        ],
        { session }
      );

      // Ghi nhận coupon đã dùng (nếu có)
      if (coupon) {
        await markCouponUsed(coupon._id, req.user?._id, order[0]._id);
      }
    });

    // Lấy đơn mới để trả về (ngoài session)
    const saved = await Order.findOne({ userId: req.user?._id })
      .sort({ createdAt: -1 })
      .lean();

    // Gửi mail xác nhận (best-effort)
    try {
      if (req.user?.email) {
        await sendMail({
          to: req.user.email,
          subject: `Xác nhận đơn hàng #${saved?.code}`,
          html: orderConfirmationTemplate(saved),
        });
      }
    } catch (_) {}

    return res.status(201).json(saved);
  } catch (e) {
    if (String(e.message || '').startsWith('OUT_OF_STOCK:')) {
      return res.status(409).json({ message: 'Out of stock', bookId: e.message.split(':')[1] });
    }
    console.error('createOrder error:', e);
    return res.status(500).json({ message: 'create_order_failed' });
  } finally {
    session.endSession();
  }
}

export async function myOrders(req, res) {
  try {
    const { limit, skip } = parsePaging(req);
    const filter = { userId: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const [items, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);

    return res.json({ items, total, limit, skip });
  } catch (e) {
    console.error('myOrders error:', e);
    return res.status(500).json({ message: 'list_orders_failed' });
  }
}

export async function getMyOrder(req, res) {
  try {
    const o = await Order.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!o) return res.status(404).json({ message: 'Not found' });
    return res.json(o);
  } catch (e) {
    console.error('getMyOrder error:', e);
    return res.status(500).json({ message: 'get_order_failed' });
  }
}

export async function cancelMyOrder(req, res) {
  try {
    const o = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!o) return res.status(404).json({ message: 'Not found' });
    if (o.status !== 'pending') return res.status(400).json({ message: 'Chỉ hủy khi trạng thái pending' });

    o.status = 'canceled';
    o.history = Array.isArray(o.history) ? o.history : [];
    o.history.unshift({
      ts: new Date(),
      type: 'cancel',
      by: req.user?.email || req.user?.name || 'user',
      note: 'User canceled order',
    });
    o.cancelledAt = new Date();

    await o.save();
    return res.json({ message: 'Đã hủy đơn', order: o });
  } catch (e) {
    console.error('cancelMyOrder error:', e);
    return res.status(500).json({ message: 'cancel_failed' });
  }
}
