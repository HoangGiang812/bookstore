import { Order } from '../../models/Order.js';
import { Book } from '../../models/Book.js';
import { Transaction } from '../../models/Transaction.js';

function pushHistory(o, type, by = 'admin', note = '', extra = {}) {
  o.history = Array.isArray(o.history) ? o.history : [];
  const ts = new Date();
  o.history.unshift({ ts, at: ts, type, by, note, ...extra });
}

/** ========== Ghi chú nội bộ đơn hàng ========== */
export const addOrderNote = async (req, res) => {
  const { id } = req.params;
  const { text } = req.body || {};
  const note = {
    ts: new Date(),
    by: req.user?.name || req.user?.email || 'admin',
    text: String(text || '').trim(),
  };

  const order = await Order.findByIdAndUpdate(
    id,
    { $push: { notes: { $each: [note], $position: 0 } } },
    { new: true }
  ).lean();

  if (!order) return res.status(404).json({ message: 'order_not_found' });
  return res.json(order);
};

/** ========== Duyệt huỷ đơn do khách yêu cầu ========== */
export const approveCancel = async (req, res) => {
  const { id } = req.params;
  const { note = '' } = req.body || {};
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: 'order_not_found' });

  const isRequested =
    o.status === 'cancel_requested' ||
    (o.cancelRequest && o.cancelRequest.requested);

  if (!isRequested) {
    return res.status(400).json({ message: 'order_not_in_cancel_request_state' });
  }

  // Đổi trạng thái -> cancelled
  o.status = 'cancelled';
  o.cancelledAt = new Date();

  // Ghi cờ phê duyệt vào subdoc cancellation
  o.cancellation = {
    ...(o.cancellation || {}),
    approved: true,
    approvedBy: req.user?._id,
    approvedAt: new Date(),
  };

  // Clear cờ yêu cầu huỷ
  o.cancelRequest = { requested: false };

  pushHistory(
    o,
    'cancel_approved',
    req.user?.name || req.user?.email || 'admin',
    note || 'Admin approved cancel'
  );

  // Hoàn kho (đơn đã trừ kho khi tạo)
  try {
    for (const it of (o.items || [])) {
      if (it?.bookId && Number.isFinite(Number(it.qty))) {
        await Book.findByIdAndUpdate(
          it.bookId,
          { $inc: { stock: Number(it.qty) } },
          { strict: false }
        );
      }
    }
  } catch { /* ignore */ }

  await o.save();
  return res.json(o.toObject());
};

/** ========== Từ chối huỷ đơn do khách yêu cầu ========== */
export const rejectCancel = async (req, res) => {
  const { id } = req.params;
  const { reason = '' } = req.body || {};
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: 'order_not_found' });

  const isRequested =
    o.status === 'cancel_requested' ||
    (o.cancelRequest && o.cancelRequest.requested);

  if (!isRequested) {
    return res.status(400).json({ message: 'order_not_in_cancel_request_state' });
  }

  // Trả về trạng thái trước: đã thanh toán → processing, ngược lại → pending
  const paid = String(o.payment?.status || '').toLowerCase() === 'paid' || !!o.payment?.capturedAt;
  o.status = paid ? 'processing' : 'pending';

  // Ghi dấu vào cancellation (rejected)
  o.cancellation = {
    ...(o.cancellation || {}),
    rejectedAt: new Date(),
    rejectedBy: req.user?._id,
  };

  // Clear yêu cầu huỷ
  o.cancelRequest = { requested: false, reason: '' };

  pushHistory(
    o,
    'cancel_rejected',
    req.user?.name || req.user?.email || 'admin',
    reason || 'Admin rejected cancel'
  );

  await o.save();
  return res.json(o.toObject());
};

/** ========== Hoàn tiền (refund) ghi nhận trong hệ thống ========== */
export const refundOrder = async (req, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body || {};
  const amt = Math.round(Number(amount || 0));

  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ message: 'invalid_amount' });
  }

  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: 'order_not_found' });

  const totalGrand =
    Number(o.total?.grand) ||
    Math.round(Number(o.subtotal || 0) + Number(o.shippingFee || 0) + Number(o.tax || 0) - Number(o.discount || 0)) ||
    0;

  const refunded = Number(o.payment?.refundTotal || 0);
  const remain = Math.max(0, totalGrand - refunded);

  if (amt > remain) {
    return res.status(400).json({ message: 'refund_exceeds_remaining', remain });
  }

  // cập nhật payment
  o.payment = {
    ...(o.payment || {}),
    refundTotal: refunded + amt,
    status:
      refunded + amt >= totalGrand
        ? 'refunded'
        : (o.payment?.status || 'paid'),
  };

  pushHistory(
    o,
    'refund',
    req.user?.name || req.user?.email || 'admin',
    reason || `Refund ${amt} VND`,
    { amount: amt }
  );

  await o.save();

  // Ghi nhận transaction
  await Transaction.create({
    orderId: o._id,
    userId: o.userId,
    type: 'refund',
    amount: amt,
    status: 'succeeded',
    reason: reason || '',
  });

  // Hoàn kho nếu đơn đã huỷ/hoàn (tuỳ chính sách)
  if (['cancelled', 'returned', 'refunded'].includes(o.status)) {
    try {
      for (const it of (o.items || [])) {
        if (it?.bookId && Number.isFinite(Number(it.qty))) {
          await Book.findByIdAndUpdate(
            it.bookId,
            { $inc: { stock: Number(it.qty) } },
            { strict: false }
          );
        }
      }
    } catch { /* ignore */ }
  }

  return res.json(o.toObject());
};

/** ========== QUY TRÌNH ADMIN: chỉ tới "ĐÃ GIAO" (delivered) ========== */

/** 1) Chuyển sang "Đang xử lý" */
export const markProcessing = async (req, res) => {
  const { id } = req.params;
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: 'order_not_found' });

  // Cho phép từ pending hoặc cancel_requested (sau khi đã xử lý yêu cầu huỷ)
  if (!['pending', 'cancel_requested'].includes(String(o.status))) {
    return res.status(400).json({ message: 'invalid_state' });
  }

  o.status = 'processing';
  o.processingAt = new Date();
  pushHistory(o, 'process', req.user?.name || 'admin', 'Admin set processing');
  await o.save();
  return res.json(o.toObject());
};

/** 2) Chuyển sang "Đang vận chuyển" */
export const markShipping = async (req, res) => {
  const { id } = req.params;
  const { carrier = null, trackingNo = null } = req.body || {};
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: 'order_not_found' });

  if (String(o.status) !== 'processing') {
    return res.status(400).json({ message: 'invalid_state' });
  }

  o.status = 'shipping';
  o.shippedAt = new Date();

  // Nếu có field shipping thì lưu thêm thông tin
  o.shipping = {
    ...(o.shipping || {}),
    status: 'shipping',
    carrier: carrier ?? o.shipping?.carrier ?? null,
    trackingNo: trackingNo ?? o.shipping?.trackingNo ?? null,
  };

  pushHistory(o, 'ship', req.user?.name || 'admin', 'Admin set shipping');
  await o.save();
  return res.json(o.toObject());
};

/** 3) Chuyển sang "ĐÃ GIAO" (điểm dừng của admin) */
export const markDelivered = async (req, res) => {
  const { id } = req.params;
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: 'order_not_found' });

  if (String(o.status) !== 'shipping') {
    return res.status(400).json({ message: 'invalid_state' });
  }

  o.status = 'delivered';
  o.deliveredAt = new Date();

  if (o.shipping) {
    o.shipping = { ...(o.shipping || {}), status: 'delivered' };
  }

  pushHistory(o, 'deliver', req.user?.name || 'admin', 'Admin marked delivered');
  await o.save();
  return res.json(o.toObject());
};

/**
 * Lưu ý: Trạng thái "completed" sẽ do KH bấm nút "Đã nhận hàng"
 * ở endpoint user: POST /api/orders/mine/:id/confirm
 */

/** ========== Xoá đơn (chỉ khi đã HUỶ hoặc HOÀN THÀNH) ========== */
export const deleteOrder = async (req, res) => {
  const { id } = req.params;
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: 'order_not_found' });

  const st = String(o.status || '').toLowerCase();
  if (!['cancelled', 'completed'].includes(st)) {
    return res.status(400).json({ message: 'cannot_delete_not_final', status: st });
  }

  await Order.deleteOne({ _id: id });
  // (tuỳ chọn) dọn transaction/ghi chú
  // await Transaction.deleteMany({ order: id });

  return res.json({ ok: 1 });
};

/** ========== CẬP NHẬT TRẠNG THÁI THANH TOÁN (paid ⇄ unpaid) ========== */
export const setPaymentStatus = async (req, res) => {
  const { id } = req.params;
  const wanted = String(req.body?.status || '').toLowerCase();

  if (!['paid', 'unpaid'].includes(wanted)) {
    return res.status(400).json({ message: 'invalid_payment_status' });
  }

  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ message: 'order_not_found' });

  if (String(o.payment?.status).toLowerCase() === 'refunded') {
    return res.status(400).json({ message: 'payment_refunded_locked' });
  }

  // Lấy trạng thái cũ
  const oldStatus = String(o.payment?.status || 'unpaid').toLowerCase();

  // Cập nhật Order
  o.payment = {
    ...(o.payment || {}),
    status: wanted,
  };

  if (wanted === 'paid') {
    o.payment.capturedAt = o.payment.capturedAt || new Date();
  } else {
    if (o.payment.capturedAt) delete o.payment.capturedAt;
  }

  pushHistory(
    o,
    'payment_status',
    req.user?.name || req.user?.email || 'admin',
    `Admin set ${wanted}`
  );

  await o.save();

  // ✅ LOGIC MỚI: TẠO TRANSACTION
  try {
    if (wanted === 'paid' && oldStatus !== 'paid') {
      // Chỉ tạo transaction khi chuyển sang 'paid'
      const totalGrand = Number(o.total?.grand) || 0;

      await Transaction.create({
        orderId: o._id,
        userId: o.userId,
        type: 'charge', // Ghi nhận là một khoản thu
        amount: totalGrand,
        method: o.payment?.method || 'cod',
        status: 'succeeded',
        reason: 'Admin marked as paid',
        at: new Date(),
      });
    }
    // (Chúng ta không tạo transaction khi 'unpaid' hoặc 'refund')
    // (Refund đã được xử lý trong hàm 'refundOrder')
  } catch (txError) {
    console.error("Lỗi khi tạo transaction thanh toán:", txError);
    // Không cần báo lỗi cho user, vì việc chính (cập nhật order) đã thành công
  }

  return res.json(o.toObject());
};