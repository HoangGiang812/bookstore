// backend/src/controllers/orderController.js
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { RMA } from '../models/RMA.js';
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
  return { subtotal, taxAmt, shippingFee: ship, grand: subtotal + taxAmt + ship };
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
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(
    d.getMinutes()
  )}${pad(d.getSeconds())}`;
  const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${stamp}-${rnd}`;
}
function pushHistory(o, type, by = 'system', note = '') {
  o.history = Array.isArray(o.history) ? o.history : [];
  const ts = new Date();
  o.history.unshift({ ts, at: ts, type, by, note });
}
function calcProtectionUntil(deliveredAt) {
  const days = Number(process.env.BUYER_PROTECTION_DAYS || 3);
  if (!deliveredAt) return null;
  const d = new Date(deliveredAt);
  d.setDate(d.getDate() + days);
  return d;
}

/** Chuẩn hoá JSON trả về theo shape FE */
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
  const grandTotal = toN(o.total?.grand ?? subtotal + shippingFee + tax - discount);

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
        state: h.type === 'create' ? 'pending' : h.type || '',
        by: { id: null, name: h.by || 'system' },
        at: h.ts || h.at || o.createdAt || new Date(),
        note: h.note || '',
      }))
    : o.statusHistory || [];

  const raw = String(o.status || 'pending').toLowerCase();
  const normalized = raw === 'canceled' ? 'cancelled' : raw;

  return {
    _id: o._id,
    code: o.code,
    userId: o.userId,
    status: normalized,
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
    cancelRequest: o.cancelRequest || undefined,
    cancelledAt: o.cancelledAt || undefined,
    deliveredAt: o.deliveredAt || undefined,
    completedAt: o.completedAt || undefined,
    protectionUntil: calcProtectionUntil(o.deliveredAt),
  };
}

/** Kiểm tra DB có hỗ trợ transactions hay không */
async function supportsTransactions() {
  try {
    const admin = mongoose.connection.db.admin();
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

    const idemKey = req.get('Idempotency-Key');
    if (idemKey) {
      const existed = await Order.findOne({ userId: req.user?._id, idempotencyKey: idemKey }).lean();
      if (existed) return res.status(200).json(toApiOrder(existed));
    }

    let [shippingFee, taxRate] = await Promise.all([getShippingFee(), getTaxRate()]);

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

      norm.push({ bookId: it.bookId, qty, price, title, categoryId });
    }

    for (const it of norm) {
      const book = byId.get(String(it.bookId));
      if (!book) {
        throw new Error(`Sản phẩm với ID ${it.bookId} không tồn tại.`);
      }
      
      if (book.stock < it.qty) {
        throw new Error(`Sản phẩm "${book.title}" chỉ còn ${book.stock} cuốn. Bạn đang đặt ${it.qty} cuốn.`);
      }
    }

    try {
      const tmpSubtotal = norm.reduce((s, it) => s + toInt(it.price) * toInt(it.qty), 0);
      shippingFee = calcShippingFeeByVNAddress(shippingAddress, {
        subtotal: tmpSubtotal,
        freeShipThreshold: 300000,
      });
    } catch {}

    const totals = computeTotals(norm, shippingFee, taxRate);

    let discount = 0;
    let coupon = null;
    if (couponCode) {
      const resCp = await applyCoupon({
        code: couponCode,
        userId: req.user?._id,
        items: norm,
        subtotal: totals.subtotal,
      });
      if (!resCp?.valid) return res.status(400).json({ message: 'Coupon invalid', reason: resCp?.reason || 'invalid' });
      discount = toInt(resCp.discount);
      coupon = resCp.coupon || null;
    }

    const grand = Math.max(0, totals.grand - discount);
    const canTxn = await supportsTransactions();

    const doDeductAndCreate = async (opts = {}) => {
      for (const it of norm) {
        const key = String(it.bookId);
        const hasStock = Number.isFinite(byId.get(key)?.stock);
        if (hasStock) {
          const bookDoc = await Book.findOneAndUpdate(
            { _id: it.bookId, stock: { $gte: it.qty } },
            { $inc: { stock: -it.qty } },
            { new: true, ...(opts.session ? { session: opts.session } : {}) }
          );
          if (!bookDoc) throw new Error(`OUT_OF_STOCK:${it.bookId}`);
        } else {
          const existsQ = Book.exists({ _id: it.bookId });
          const exists = opts.session ? await existsQ.session(opts.session) : await existsQ;
          if (!exists) throw new Error(`BOOK_NOT_FOUND:${it.bookId}`);
        }
      }

      await Order.create(
        [
          {
            code: buildOrderCode(),
            idempotencyKey: idemKey || undefined,

            userId: req.user?._id || null,
            status: 'pending',

            items: norm,

            subtotal: totals.subtotal,
            shippingFee: totals.shippingFee,
            tax: totals.taxAmt,
            discount,
            total: { sub: totals.subtotal, grand },

            shippingAddress: shippingAddress || null,
            payment: payment || { method: 'cod', status: 'unpaid' },
            couponCode: couponCode || null,

            history: [
              { ts: new Date(), type: 'create', by: req.user?.email || req.user?.name || 'user', note: 'Order created' },
            ],
            placedAt: new Date(),
          },
        ],
        { ...(opts.session ? { session: opts.session } : {}) }
      );

      if (coupon) {
        const just = await Order.findOne({ userId: req.user?._id }).sort({ createdAt: -1 }).lean();
        if (just?._id) await markCouponUsed(coupon._id, req.user?._id, just._id);
      }
    };

    if (canTxn) await session.withTransaction(async () => { await doDeductAndCreate({ session }); });
    else await doDeductAndCreate();

    const saved = await Order.findOne({ userId: req.user?._id }).sort({ createdAt: -1 }).lean();

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
    if (String(e.message || '').includes('stock') || String(e.message || '').includes('cuốn')) {
      return res.status(400).json({ message: e.message });
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
    const userId = req.user._id;

    const filter = { userId: new mongoose.Types.ObjectId(userId) };
    if (req.query.status) {
      // ... (giữ nguyên logic filter status cũ của bạn)
      const q = String(req.query.status).toLowerCase();
      const map = {
        shipped: 'shipping', delivered: 'delivered', cancelled: 'cancelled',
        canceled: 'cancelled', pending: 'pending', processing: 'processing',
        completed: 'completed', 'cancel_requested': 'cancel_requested',
        refunded: 'refunded'
      };
      filter.status = map[q] || q;
    }

    // ✅ SỬ DỤNG AGGREGATE ĐỂ LẤY RMA STATUS
    const aggregationPipeline = [
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // --- JOIN VỚI BẢNG RMA ---
      {
        $lookup: {
          from: 'rmas', // Tên collection trong DB
          localField: '_id',
          foreignField: 'orderId',
          as: 'rmaHistory'
        }
      },
      // --- LẤY TRẠNG THÁI MỚI NHẤT ---
      {
        $addFields: {
          latestRMA: { $last: '$rmaHistory' }
        }
      },
      {
        $addFields: {
          rmaStatus: '$latestRMA.status' // ✅ TRƯỜNG QUAN TRỌNG NHẤT
        }
      },
      { $project: { rmaHistory: 0, latestRMA: 0 } } // Dọn dẹp
    ];

    const [items, totalResult] = await Promise.all([
      Order.aggregate(aggregationPipeline),
      Order.countDocuments({ userId: new mongoose.Types.ObjectId(userId) })
    ]);

    // Map lại dữ liệu để frontend dùng được (giữ nguyên toApiOrder nhưng thêm rmaStatus)
    const mappedItems = items.map(item => {
      const apiOrder = toApiOrder(item);
      // Gán thủ công rmaStatus vào kết quả trả về
      apiOrder.rmaStatus = item.rmaStatus; 
      return apiOrder;
    });

    return res.json({ items: mappedItems, total: totalResult, limit, skip });

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

/**
 * KHÁCH HUỶ ĐƠN:
 * - Nếu đơn còn pending và CHƯA thanh toán -> huỷ ngay (status=cancelled).
 * - Ngược lại -> tạo "yêu cầu huỷ" (status=cancel_requested) để admin duyệt.
 */
export async function cancelMyOrder(req, res) {
  try {
    const { reason = '' } = req.body || {};
    const o = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!o) return res.status(404).json({ message: 'Not found' });

    const paid =
      String(o.payment?.status || '').toLowerCase() === 'paid' ||
      !!o.payment?.capturedAt;

    if (o.status === 'pending' && !paid) {
      // Huỷ ngay
      o.status = 'cancelled';
      o.cancelledAt = new Date();
      pushHistory(o, 'cancel', req.user?.email || req.user?.name || 'user', reason ? `User canceled: ${reason}` : 'User canceled');
      await o.save();
      return res.json({ ok: 1, message: 'Đã huỷ đơn', order: toApiOrder(o.toObject()) });
    }

    // Tạo yêu cầu huỷ để admin duyệt
    o.status = 'cancel_requested';
    o.cancelRequest = {
      requested: true,
      reason: reason || '',
      requestedAt: new Date(),
      byUser: req.user?._id || undefined
    };
    pushHistory(o, 'cancel_requested', req.user?.email || req.user?.name || 'user', reason || 'User requested cancel');
    await o.save();

    return res.json({ ok: 1, message: 'Đã gửi yêu cầu huỷ. Vui lòng chờ admin xét duyệt.', order: toApiOrder(o.toObject()) });
  } catch (e) {
    console.error('cancelMyOrder error:', e);
    return res.status(500).json({ message: 'cancel_failed' });
  }
}

/** (Tuỳ chọn) KH rút yêu cầu huỷ khi đang cancel_requested */
export async function withdrawCancelMyOrder(req, res) {
  try {
    const o = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!o) return res.status(404).json({ message: 'Not found' });
    if (o.status !== 'cancel_requested' || !o.cancelRequest?.requested) {
      return res.status(400).json({ message: 'not_in_cancel_requested' });
    }
    const paid = String(o.payment?.status || '').toLowerCase() === 'paid' || !!o.payment?.capturedAt;
    o.status = paid ? 'processing' : 'pending';
    o.cancelRequest = { requested: false };
    pushHistory(o, 'cancel_request_withdrawn', req.user?.email || 'user', 'User withdrew cancel request');
    await o.save();
    return res.json({ ok: 1, order: toApiOrder(o.toObject()) });
  } catch (e) {
    console.error('withdrawCancelMyOrder error:', e);
    return res.status(500).json({ message: 'withdraw_cancel_failed' });
  }
}

/** Cập nhật địa chỉ giao (khi pending/processing, chưa shipping) */
export async function updateMyShippingAddress(req, res) {
  try {
    const o = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!o) return res.status(404).json({ message: 'Not found' });
    if (!['pending','processing'].includes(String(o.status))) {
      return res.status(400).json({ message: 'cannot_edit_address_now' });
    }
    const a = req.body || {};
    o.shippingAddress = {
      label: a.label || o.shippingAddress?.label || 'Mặc định',
      receiver: a.receiver || o.shippingAddress?.receiver || '',
      phone: a.phone || o.shippingAddress?.phone || '',
      province: a.province || o.shippingAddress?.province || '',
      district: a.district || o.shippingAddress?.district || '',
      ward: a.ward || o.shippingAddress?.ward || '',
      detail: a.detail || o.shippingAddress?.detail || '',
      isDefault: !!(a.isDefault ?? o.shippingAddress?.isDefault),
    };
    pushHistory(o, 'address_updated', req.user?.email || 'user', 'User updated shipping address');
    await o.save();
    return res.json({ ok: 1, order: toApiOrder(o.toObject()) });
  } catch (e) {
    console.error('updateMyShippingAddress error:', e);
    return res.status(500).json({ message: 'update_address_failed' });
  }
}

/** (tuỳ chọn) KH tự xác nhận đã thanh toán (manual) */
export async function captureMyPayment(req, res) {
  try {
    const o = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!o) return res.status(404).json({ message: 'Not found' });

    if (o.payment?.status !== 'paid') {
      o.payment = { ...(o.payment || {}), status: 'paid', capturedAt: new Date() };
      o.paidAt = new Date();
      pushHistory(o, 'paid', req.user?.email || req.user?.name || 'user', 'Payment captured');
      if (o.status === 'pending') {
        o.status = 'processing';
        o.processingAt = new Date();
        pushHistory(o, 'process', 'system', 'Order processing');
      }
      await o.save();
    }

    return res.json({ ok: 1, order: toApiOrder(o.toObject()) });
  } catch (e) {
    console.error('captureMyPayment error:', e);
    return res.status(500).json({ message: 'capture_payment_failed' });
  }
}

/** KH xác nhận đã nhận hàng → completed */
export async function confirmReceived(req, res) {
  try {
    const o = await Order.findOne({ _id: req.params.id, userId: req.user._id });
    if (!o) return res.status(404).json({ message: 'Not found' });
    if (o.status !== 'delivered') {
      return res.status(400).json({ message: 'Order is not in delivered status' });
    }
    if (o.cancelRequest?.requested) {
      return res.status(400).json({ message: 'Order has pending cancellation' });
    }
    const now = new Date();
    if (!o.deliveredAt) o.deliveredAt = now;
    o.status = 'completed';
    o.completedAt = now;
    pushHistory(o, 'completed', req.user?.email || req.user?.name || 'user', 'Buyer confirmed received');
    await o.save();
    return res.json({ ok: 1, order: toApiOrder(o.toObject()) });
  } catch (e) {
    console.error('confirmReceived error:', e);
    return res.status(500).json({ message: 'confirm_failed' });
  }
}

/** Timeline theo dõi đơn */
export async function trackingMyOrder(req, res) {
  try {
    const o = await Order.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!o) return res.status(404).json({ message: 'Not found' });

    const events = [];
    const add = (code, label, at, note='') => events.push({ code, label, at, note });

    add('created', 'Đã tạo đơn', o.createdAt);
    if (o.paidAt || o.payment?.status === 'paid') add('paid', 'Đã thanh toán', o.paidAt || o.payment?.capturedAt);
    if (o.processingAt || ['processing','shipping','delivered','completed','cancel_requested'].includes(o.status)) add('processing', 'Đang xử lý', o.processingAt);
    if (o.shippedAt || o.status === 'shipping') add('shipping', 'Đang vận chuyển', o.shippedAt);
    if (o.deliveredAt || ['delivered','completed'].includes(o.status)) add('delivered', 'Đã giao', o.deliveredAt);
    if (o.completedAt || o.status === 'completed') add('completed', 'Hoàn tất', o.completedAt || o.updatedAt);

    if (o.status === 'cancel_requested') add('cancel_requested', 'Yêu cầu huỷ (chờ duyệt)', o.cancelRequest?.requestedAt);
    if (o.cancelledAt || o.status === 'cancelled' || o.status === 'canceled') add('cancelled', 'Đã huỷ', o.cancelledAt);

    if (Array.isArray(o.history)) {
      const map = {
        create:'created',
        paid:'paid',
        process:'processing',
        ship:'shipping',
        deliver:'delivered',
        completed:'completed',
        cancel:'cancelled',
        cancel_requested:'cancel_requested'
      };
      o.history.forEach(h=>{
        const code = map[h.type] || h.type;
        const at = h.ts || h.at;
        if (!events.some(e=>e.code===code && e.at)) add(code, h.type, at, h.note);
      });
    }

    events.sort((a,b)=> new Date(a.at||0) - new Date(b.at||0));
    return res.json({ events });
  } catch (e) {
    console.error('trackingMyOrder error:', e);
    return res.status(500).json({ message: 'tracking_failed' });
  }
}
