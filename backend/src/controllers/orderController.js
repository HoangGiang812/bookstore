// src/controllers/orderController.js
import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Setting } from '../models/Setting.js';
import { Book } from '../models/Book.js';
import { applyCoupon, markCouponUsed } from '../utils/coupon.js';
import { sendMail, orderConfirmationTemplate } from '../utils/email.js';
import { parsePaging } from '../utils/pagination.js';
import { calcShippingFeeByVNAddress } from '../utils/shippingVN.js';

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

/** Chuẩn hoá JSON trả về theo shape bạn mong muốn */
function toApiOrder(o) {
  if (!o) return o;
  const toN = (x) => (Number.isFinite(Number(x)) ? Math.round(Number(x)) : 0);

  const items = (o.items || []).map((it) => ({
    orderItemId: it._id || new mongoose.Types.ObjectId(),
    variantId: it.variantId || null,
    bookId: it.bookId,
    title: it.title,
    format: it.format ?? null,
    sku: it.sku ?? null,
    unitPrice: toN(it.price),
    qty: toN(it.qty),
    subtotal: toN(it.price) * toN(it.qty),
  }));

  const subtotal = toN(o.subtotal ?? o.total?.sub);
  const shippingFee = toN(o.shippingFee);
  const tax = toN(o.tax);
  const discount = toN(o.discount);
  const grandTotal = toN(o.total?.grand ?? (subtotal + shippingFee + tax - discount));

  const sa = o.shippingAddress || {};
  const shippingAddress = {
    label: sa.label ?? null,
    receiver: sa.name || sa.receiver || '',
    phone: sa.phone || '',
    province: sa.province || sa.city || '',
    district: sa.district || '',
    ward: sa.ward || '',
    detail: sa.address || sa.detail || sa.line1 || '',
    isDefault: !!sa.isDefault,
  };

  const shipping = o.shipping || {
    method: 'STANDARD',
    carrier: null,
    trackingNo: null,
    status: o.status || 'pending',
    estimatedDays: null,
  };

  const pay = o.payment || {};
  const payment = {
    method: (pay.method || 'cod').toUpperCase(),
    status: pay.status || 'unpaid',
    capturedAt: pay.capturedAt || null,
    refundTotal: toN(pay.refundTotal),
  };

  const statusHistory = Array.isArray(o.history)
    ? o.history.map((h) => ({
        state: h.type === 'create' ? 'pending' : (h.type || ''),
        by: { id: null, name: h.by || 'system' },
        at: h.ts || o.createdAt || new Date(),
        note: h.note || '',
      }))
    : (o.statusHistory || []);

  return {
    _id: o._id,
    code: o.code,
    userId: o.userId,
    status: o.status || 'pending',
    items,
    pricing: {
      subtotal,
      discount,
      shippingFee,
      tax,
      grandTotal,
      currency: 'VND',
    },
    shippingAddress,
    shipping,
    payment,
    attachments: o.attachments || [],
    statusHistory,
    couponCode: o.couponCode ?? null,
    notesInternal: o.notesInternal || [],
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

/** Kiểm tra DB có hỗ trợ transactions (replica set / mongos) hay không */
async function supportsTransactions() {
  try {
    const admin = mongoose.connection.db.admin();
    // Standalone sẽ throw ở lệnh này
    const s = await admin.command({ replSetGetStatus: 1 });
    return s?.ok === 1;
  } catch {
    return false;
  }
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
      if (existed) return res.status(200).json(toApiOrder(existed));
    }

    // Config phí ship & thuế (base)
    let [shippingFee, taxRate] = await Promise.all([getShippingFee(), getTaxRate()]);

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

      const price = toInt(it.price ?? b.price);
      const title = it.title ?? b.title;
      const categoryId = it.categoryId ?? (Array.isArray(b.categories) ? b.categories[0] : b.categoryId);
      const qty = Math.max(1, toInt(it.qty ?? it.quantity));

      norm.push({
        bookId: it.bookId,
        qty,
        price,
        title,
        categoryId,
      });
    }

    // Tính lại phí ship theo khu vực VN dựa trên địa chỉ + subtotal tạm tính
    try {
      const tmpSubtotal = norm.reduce((s, it) => s + toInt(it.price) * toInt(it.qty), 0);
      shippingFee = calcShippingFeeByVNAddress(shippingAddress, {
        subtotal: tmpSubtotal,
        freeShipThreshold: 300000, // chỉnh ngưỡng freeship tại đây nếu muốn
      });
    } catch {
      // nếu lỗi, giữ shippingFee gốc từ Setting
    }

    // Tính tiền (trước giảm giá) với shippingFee đã điều chỉnh
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

    /** --- Khối thao tác trừ kho + tạo đơn: có/không transaction --- */
    const canTxn = await supportsTransactions();

    const doDeductAndCreate = async (opts = {}) => {
      // opts: { session }
      for (const it of norm) {
        const key = String(it.bookId);
        const hasStock = Number.isFinite(byId.get(key)?.stock);

        if (hasStock) {
          // Có quản lý tồn kho: trừ kho có điều kiện
          const bookDoc = await Book.findOneAndUpdate(
            { _id: it.bookId, stock: { $gte: it.qty } },
            { $inc: { stock: -it.qty } },
            { new: true, ...(opts.session ? { session: opts.session } : {}) }
          );
          if (!bookDoc) throw new Error(`OUT_OF_STOCK:${it.bookId}`);
        } else {
          // Không quản lý tồn kho: chỉ xác nhận tồn tại
          const existsQ = Book.exists({ _id: it.bookId });
          const exists = opts.session ? await existsQ.session(opts.session) : await existsQ;
          if (!exists) throw new Error(`BOOK_NOT_FOUND:${it.bookId}`);
        }
      }

      // Tạo đơn
      await Order.create(
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
        { ...(opts.session ? { session: opts.session } : {}) }
      );

      // Ghi nhận coupon đã dùng (nếu có)
      if (coupon) {
        const just = await Order.findOne({ userId: req.user?._id }).sort({ createdAt: -1 }).lean();
        if (just?._id) {
          await markCouponUsed(coupon._id, req.user?._id, just._id);
        }
      }
    };

    if (canTxn) {
      await session.withTransaction(async () => {
        await doDeductAndCreate({ session });
      });
    } else {
      // Fallback standalone: chạy không transaction
      await doDeductAndCreate();
    }

    // Lấy đơn mới để trả về (ngoài transaction)
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
    } catch {}

    return res.status(201).json(toApiOrder(saved));
  } catch (e) {
    if (String(e.message || '').startsWith('OUT_OF_STOCK:')) {
      return res.status(409).json({ message: 'Out of stock', bookId: e.message.split(':')[1] });
    }
    if (String(e.message || '').startsWith('BOOK_NOT_FOUND:')) {
      return res.status(404).json({ message: 'Book not found', bookId: e.message.split(':')[1] });
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

    return res.json({ items: items.map(toApiOrder), total, limit, skip });
  } catch (e) {
    console.error('myOrders error:', e);
    return res.status(500).json({ message: 'list_orders_failed' });
  }
}

export async function getMyOrder(req, res) {
  try {
    const o = await Order.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!o) return res.status(404).json({ message: 'Not found' });
    return res.json(toApiOrder(o));
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
    return res.json({ message: 'Đã hủy đơn', order: toApiOrder(o.toObject()) });
  } catch (e) {
    console.error('cancelMyOrder error:', e);
    return res.status(500).json({ message: 'cancel_failed' });
  }
}
