import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { Setting } from '../models/Setting.js'; // Đảm bảo Model này đã sửa dùng 'key'
import { Book } from '../models/Book.js';
import { applyCoupon, markCouponUsed } from '../utils/coupon.js';
import { sendMail, orderConfirmationTemplate } from '../utils/email.js';
import { parsePaging } from '../utils/pagination.js';
import { calcShippingFeeByVNAddress } from '../utils/shippingVN.js';
import { RMA } from '../models/RMA.js';

// --- HELPERS ---
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

// --- SỬA LỖI TẠI ĐÂY ---
async function getShippingFee() {
  try {
    // Chỉ tìm theo key, KHÔNG dùng findById nữa
    const ship = await Setting.findOne({ key: 'shipping' }).lean();
    // Fallback giá trị mặc định 20k nếu chưa cấu hình
    return toInt(ship?.value?.flat ?? ship?.value?.baseFee ?? 20000);
  } catch (e) {
    return 20000;
  }
}

async function getTaxRate() {
  try {
    // Chỉ tìm theo key
    const tax = await Setting.findOne({ key: 'tax' }).lean();
    return Number(tax?.value?.rate ?? 0);
  } catch (e) {
    return 0;
  }
}
// -----------------------

function buildOrderCode() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${stamp}-${rnd}`;
}

function toApiOrder(o) {
  if (!o) return o;
  return {
    ...o,
    status: o.status || 'pending',
    items: (o.items || []).map(it => ({
       ...it,
       orderItemId: it._id,
       subtotal: toInt(it.price) * toInt(it.qty)
    })),
    pricing: {
       subtotal: o.subtotal,
       shippingFee: o.shippingFee,
       tax: o.tax,
       discount: o.discount,
       grandTotal: o.total?.grand || 0
    },
    shipping: o.shipping || { method: 'STANDARD', status: 'pending' },
    statusHistory: o.history || []
  };
}

// --- CONTROLLER: TẠO ĐƠN HÀNG ---
export async function createOrder(req, res) {
  const session = await mongoose.startSession();
  try {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: 'Vui lòng đăng nhập lại.' });
    }

    const { items, shippingAddress, payment, couponCode } = req.body || {};
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Giỏ hàng trống' });
    }

    const shippingFeeVal = await getShippingFee();
    const taxRateVal = await getTaxRate();

    const norm = [];
    const ids = items.map(i => i.bookId);
    const books = await Book.find({ _id: { $in: ids } }).lean();
    const byId = new Map(books.map(b => [String(b._id), b]));

    for (const it of items) {
      const b = byId.get(String(it.bookId));
      if (!b) throw new Error(`Sản phẩm ID ${it.bookId} không tồn tại`);
      if ((b.stock || 0) < it.qty) throw new Error(`"${b.title}" chỉ còn ${b.stock} cuốn.`);

      norm.push({ 
          bookId: it.bookId, 
          qty: it.qty, 
          price: toInt(it.price || b.price), 
          title: b.title, 
          image: b.coverUrl || b.image, 
          categoryId: b.categoryIds?.[0]
      });
    }

    let finalShip = shippingFeeVal;
    try { finalShip = calcShippingFeeByVNAddress(shippingAddress, { subtotal: 0 }); } catch {}

    const totals = computeTotals(norm, finalShip, taxRateVal);
    let discount = 0;
    let couponDoc = null;

    if (couponCode) {
        const cpRes = await applyCoupon({ 
            code: couponCode, userId: req.user._id, items: norm, subtotal: totals.subtotal 
        });
        if (cpRes.valid) {
            discount = toInt(cpRes.discount);
            couponDoc = cpRes.coupon;
        }
    }

    const grandTotal = Math.max(0, totals.grand - discount);

    const executeOrderCreation = async (opts = {}) => {
        for (const it of norm) {
            await Book.updateOne(
                { _id: it.bookId },
                { $inc: { stock: -it.qty, soldCount: it.qty } },
                opts
            );
        }

        const [newOrder] = await Order.create([{
            code: buildOrderCode(),
            userId: req.user._id,
            status: 'pending',
            items: norm,
            subtotal: totals.subtotal,
            shippingFee: totals.shippingFee,
            tax: totals.taxAmt,
            discount: discount,
            total: { sub: totals.subtotal, grand: grandTotal },
            pricing: {
               subtotal: totals.subtotal,
               shipping: totals.shippingFee,
               tax: totals.taxAmt,
               discount: discount,
               grandTotal: grandTotal
            },
            shippingAddress,
            payment: payment || { method: 'cod', status: 'unpaid' },
            couponCode: couponCode || null,
            shipping: { method: 'STANDARD', status: 'pending', logs: [] },
            history: [{ ts: new Date(), type: 'create', by: req.user.email, note: 'Khách tạo đơn' }],
            placedAt: new Date()
        }], opts);

        if (couponDoc) {
            await markCouponUsed(couponDoc._id, req.user._id, newOrder._id);
        }
        return newOrder;
    };

    let savedOrder;
    try {
        await session.withTransaction(async () => {
            savedOrder = await executeOrderCreation({ session });
        });
    } catch (err) {
        if (err.message.includes('Transaction') || err.message.includes('sessions')) {
             console.warn("⚠️ Transaction not supported, fallback to normal save");
             savedOrder = await executeOrderCreation();
        } else {
             throw err;
        }
    }

    // --- PHẦN GỬI MAIL AN TOÀN (KHÔNG CRASH) ---
    if (req.user.email) {
        // .catch() ở đây sẽ bắt lỗi gửi mail riêng, không ảnh hưởng luồng chính
        sendMail({
            to: req.user.email,
            subject: `Đặt hàng thành công #${savedOrder.code}`,
            html: orderConfirmationTemplate(savedOrder),
        }).catch(emailErr => {
            console.error("⚠️ [MAIL ERROR] Không gửi được mail:", emailErr.message);
        });
    }

    // Trả về kết quả thành công
    return res.status(201).json(toApiOrder(savedOrder.toObject()));

  } catch (e) {
    // Catch lỗi chính của quá trình tạo đơn
    console.error('Create Order Error:', e);
    return res.status(500).json({ message: e.message || 'Lỗi tạo đơn hàng' });
  } finally {
    // Luôn đóng session DB
    session.endSession();
  }
}

// --- CÁC API KHÁC GIỮ NGUYÊN ---
export async function myOrders(req, res) {
    try {
        const { limit, skip } = parsePaging(req);
        const filter = { userId: req.user._id };
        
        // Populate thêm rmaRequestId để lấy chi tiết RMA (nếu có ref)
        // HOẶC: Cách đơn giản hơn là lookup thủ công nếu cấu trúc DB cho phép
        // Nhưng ở đây tôi giả định bạn đã lưu các trạng thái cơ bản vào Order.
        // Để hiển thị ảnh UNC, chúng ta cần tìm RMA tương ứng.

        const items = await Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
        
        // [MỚI] Lấy thông tin RMA chi tiết cho từng đơn (để lấy ảnh UNC)
        const orderIds = items.map(o => o._id);
        const rmas = await RMA.find({ orderId: { $in: orderIds } }).lean();
        const rmaMap = new Map(rmas.map(r => [String(r.orderId), r]));

        const result = items.map(o => {
            const rma = rmaMap.get(String(o._id));
            return {
                ...toApiOrder(o),
                rmaDetails: rma ? { // Gắn thêm info RMA vào order
                    status: rma.status,
                    refundProof: rma.refundProof, // Ảnh UNC
                    adminNote: rma.adminNote
                } : null
            };
        });

        const total = await Order.countDocuments(filter);
        res.json({ items: result, total, limit, skip });
    } catch (e) { res.status(500).json({ message: e.message }); }
}

export async function getMyOrder(req, res) {
    try {
        const o = await Order.findOne({ _id: req.params.id, userId: req.user._id }).lean();
        if (!o) return res.status(404).json({ message: 'Not found' });
        res.json(toApiOrder(o));
    } catch (e) { res.status(500).json({ message: e.message }); }
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
    
    if (!o) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    // 1. Chỉ cho phép hủy khi chưa GIAO HÀNG (shipping/delivered)
    if (['shipping', 'delivered', 'completed', 'cancelled', 'returned'].includes(o.status)) {
         return res.status(400).json({ message: 'Không thể hủy đơn hàng khi đang giao hoặc đã hoàn tất.' });
    }

    const paid = String(o.payment?.status || '').toLowerCase() === 'paid' || !!o.payment?.capturedAt;

    // 2. Nếu đơn mới tạo (pending) hoặc đã xác nhận (confirmed) NHƯNG chưa thanh toán -> Hủy luôn
    if (['pending', 'confirmed'].includes(o.status) && !paid) {
      o.status = 'cancelled';
      o.cancelledAt = new Date();
      
      // Hoàn lại kho ngay lập tức
       try {
        for (const it of (o.items || [])) {
            await Book.findByIdAndUpdate(it.bookId, { $inc: { stock: it.qty, soldCount: -it.qty } });
        }
      } catch {}

      o.history.unshift({ at: new Date(), type: 'cancel', by: 'user', note: reason ? `Khách hủy: ${reason}` : 'Khách hủy đơn' });
      await o.save();
      return res.json({ ok: 1, message: 'Đã huỷ đơn thành công', order: o.toObject() });
    }

    // 3. Nếu đã thanh toán hoặc đã đóng gói (processing) -> Gửi yêu cầu để Admin duyệt
    o.status = 'cancel_requested';
    o.cancelRequest = {
      requested: true,
      reason: reason || '',
      requestedAt: new Date(),
      byUser: req.user?._id
    };
    o.history.unshift({ at: new Date(), type: 'cancel_requested', by: 'user', note: reason || 'Khách yêu cầu hủy' });
    await o.save();

    return res.json({ ok: 1, message: 'Đã gửi yêu cầu huỷ. Vui lòng chờ admin xét duyệt.', order: o.toObject() });
  } catch (e) {
    console.error('cancelMyOrder error:', e);
    return res.status(500).json({ message: 'Lỗi server khi hủy đơn: ' + e.message });
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

    // Chỉ cho phép hoàn thành nếu đơn đang ở trạng thái 'delivered' (đã giao)
    if (o.status !== 'delivered') {
      return res.status(400).json({ message: 'Đơn hàng chưa được giao thành công bởi Shipper' });
    }

    o.status = 'completed';
    o.completedAt = new Date();
    
    // Ghi lịch sử
    o.history.unshift({ 
        at: new Date(), 
        type: 'completed', 
        by: req.user?.name || 'user', 
        note: 'Khách xác nhận đã nhận hàng' 
    });

    await o.save();
    return res.json(toApiOrder(o.toObject()));
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
