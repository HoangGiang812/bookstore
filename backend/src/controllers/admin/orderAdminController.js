// backend/src/controllers/admin/orderAdminController.js
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

  // Đổi trạng thái
  o.status = 'cancelled';
  o.cancelledAt = new Date();
  // Ghi cờ phê duyệt vào subdoc cancellation (đúng schema)
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

  // Hoàn kho (tuỳ chính sách, ở đây hoàn kho vì đã trừ khi tạo)
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

  // Trả về trạng thái trước: nếu đã thanh toán hoặc đang xử lý → processing, ngược lại → pending
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
    order: o._id,
    type: 'refund',
    amount: amt,
    status: 'succeeded',
    reason: reason || '',
    at: new Date(),
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
