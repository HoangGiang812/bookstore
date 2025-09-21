// src/controllers/orderController.js
import { Order } from '../models/Order.js';
import { Setting } from '../models/Setting.js';
import { Book } from '../models/Book.js';
import { applyCoupon, markCouponUsed } from '../utils/coupon.js';
import { sendMail, orderConfirmationTemplate } from '../utils/email.js';
import { parsePaging } from '../utils/pagination.js';

function computeTotals(items, shippingFee, taxRate) {
  const subtotal = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);
  const taxAmt = taxRate ? Math.floor(subtotal * Number(taxRate)) : 0;
  return { subtotal, taxAmt, shippingFee: Number(shippingFee) || 0, grand: subtotal + taxAmt + (Number(shippingFee) || 0) };
}

async function getShippingFee() {
  // Ưu tiên { key: 'shipping' } -> fallback id 'shipping'
  const ship = (await Setting.findOne({ key: 'shipping' }).lean()) || (await Setting.findById('shipping').lean());
  // chấp nhận nhiều schema: { value: { flat } } hoặc { value: { baseFee } }
  return Number(ship?.value?.flat ?? ship?.value?.baseFee ?? 20000);
}
async function getTaxRate() {
  const tax = (await Setting.findOne({ key: 'tax' }).lean()) || (await Setting.findById('tax').lean());
  return Number(tax?.value?.rate ?? 0);
}

export async function createOrder(req, res) {
  try {
    const { items, shippingAddress, payment, couponCode } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items' });
    }

    // Lấy config
    const [shippingFee, taxRate] = await Promise.all([getShippingFee(), getTaxRate()]);

    // Chuẩn hóa item: đảm bảo đủ price/title/categoryId
    const norm = [];
    for (const it of items) {
      if (!it?.bookId) return res.status(400).json({ message: 'Missing bookId' });

      let price = Number(it.price);
      let title = it.title;
      let categoryId = it.categoryId;

      if (!price || !title) {
        const b = await Book.findById(it.bookId).lean();
        if (!b) return res.status(400).json({ message: 'Book not found' });
        price = Number(b.price) || 0;
        title = b.title;
        categoryId = categoryId || (Array.isArray(b.categories) ? b.categories[0] : undefined);
      }

      norm.push({
        bookId: it.bookId,
        qty: Number(it.qty) || 1,
        price,
        title,
        categoryId,
      });
    }

    // Tính tiền
    const totals = computeTotals(norm, shippingFee, taxRate);

    // Áp mã giảm giá (nếu có)
    let discount = 0;
    let coupon = null;
    if (couponCode) {
      const resCp = await applyCoupon({
        code: couponCode,
        userId: req.user?._id,
        items: norm,
        subtotal: totals.subtotal,
      });
      if (!resCp.valid) {
        return res.status(400).json({ message: 'Coupon invalid', reason: resCp.reason });
      }
      discount = Number(resCp.discount) || 0;
      coupon = resCp.coupon || null;
    }

    // Không để grand âm
    const grand = Math.max(0, totals.grand - discount);

    // Suy luận trạng thái thanh toán ban đầu
    const paymentStatus = payment?.status || 'unpaid';

    // Tạo đơn
    const order = await Order.create({
      code: `OD${Date.now()}`,            // đơn giản, đủ uniqueness theo ms
      userId: req.user?._id || null,
      status: 'pending',
      paymentStatus,
      refundAmount: 0,
      items: norm,

      // các trường tài chính (chấp nhận nhiều schema FE/BE)
      subtotal: totals.subtotal,
      shippingFee: totals.shippingFee,
      tax: totals.taxAmt,
      discount,
      total: { sub: totals.subtotal, grand },

      shippingAddress,
      payment,
      couponCode: couponCode || null,

      // các trường FE/Admin đang dùng
      notes: [],
      attachments: [],
      history: [
        { ts: new Date(), type: 'create', by: req.user?.email || req.user?.name || 'user' },
      ],
    });

    if (coupon) {
      // ghi nhận lượt dùng
      try {
        await markCouponUsed(coupon._id, req.user?._id, order._id);
      } catch (_) {}
    }

    // Gửi mail xác nhận (nếu có email)
    try {
      if (req.user?.email) {
        await sendMail({
          to: req.user.email,
          subject: `Xác nhận đơn hàng #${order.code}`,
          html: orderConfirmationTemplate(order),
        });
      }
    } catch (_) {}

    return res.status(201).json(order);
  } catch (e) {
    console.error('createOrder error:', e);
    return res.status(500).json({ message: 'create_order_failed' });
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

    return res.json({ items, total });
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
    o.history.unshift({ ts: new Date(), type: 'cancel', by: req.user?.email || req.user?.name || 'user' });

    await o.save();
    return res.json({ message: 'Đã hủy đơn', order: o });
  } catch (e) {
    console.error('cancelMyOrder error:', e);
    return res.status(500).json({ message: 'cancel_failed' });
  }
}
