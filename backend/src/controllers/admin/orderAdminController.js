// backend/src/controllers/admin/orderAdminController.js
import mongoose from 'mongoose';
import { Order } from '../../models/Order.js';
import { Book } from '../../models/Book.js';
import { Transaction } from '../../models/Transaction.js';

function pushHistory(o, type, by = 'admin', note = '', extra = {}) {
  o.history = Array.isArray(o.history) ? o.history : [];
  o.history.unshift({ ts: new Date(), type, by, note, ...extra });
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

  // Chỉ cho phép duyệt khi đơn đang ở trạng thái 'cancel_requested' hoặc khách đã tạo yêu cầu huỷ
  const isRequested =
    o.status === 'cancel_requested' ||
    (o.cancelRequest && o.cancelRequest.requested);

  if (!isRequested) {
    return res.status(400).json({ message: 'order_not_in_cancel_request_state' });
  }

  // Đổi trạng thái
  o.status = 'cancelled';
  o.cancelledAt = new Date();
  o.cancelRequest = { ...(o.cancelRequest || {}), approvedAt: new Date(), approvedBy: req.user?._id };

  pushHistory(
    o,
    'cancel_approved',
    req.user?.name || req.user?.email || 'admin',
    note || 'Admin approved cancel'
  );

  // Hoàn kho: chỉ hoàn kho nếu trước đó đã trừ kho (tức là mọi đơn đều trừ ngay khi tạo).
  // Nếu đơn đã giao/đang vận chuyển, tuỳ chính sách bạn có thể KHÔNG hoàn kho ở đây.
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
  } catch (_) { /* ignore */ }

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

  // Trả đơn về trạng thái trước (ưu tiên processing nếu có thanh toán, else giữ nguyên)
  // Bạn có thể quyết định chính xác theo business của bạn.
  // Ở đây: nếu trước đó đơn đang shipping/shipped/completed thì không reject (tuỳ chọn).
  if (o.processingAt || (o.payment && String(o.payment.status).toLowerCase() === 'paid')) {
    o.status = 'processing';
  } else {
    // fallback
    o.status = 'pending';
  }

  o.cancelRequest = {
    requested: false,
    rejectedAt: new Date(),
    rejectedBy: req.user?._id,
    reason: reason || 'Rejected by admin',
  };

  pushHistory(
    o,
    'cancel_rejected',
    req.user?.name || req.user?.email || 'admin',
    reason || 'Admin rejected cancel'
  );

  await o.save();
  return res.json(o.toObject());
};

/** ========== Hoàn tiền (refund) ========== */
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
        : (o.payment?.status || 'paid'), // giữ 'paid' nếu là hoàn 1 phần
  };

  // Nếu hoàn toàn và đơn đã/đang huỷ, có thể đánh dấu trạng thái đơn (tuỳ business)
  if (o.payment.status === 'refunded' && ['cancelled', 'cancel_requested'].includes(o.status)) {
    o.status = 'cancelled';
  }

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

  // Hoàn kho (tuỳ chính sách). Thông thường hoàn kho khi:
  // - huỷ đơn đã trừ kho (chưa giao), hoặc
  // - hoàn hàng (RMA).
  // Ở đây: nếu đơn đã ở trạng thái cancelled hoặc returned thì hoàn kho.
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
    } catch (_) { /* ignore */ }
  }

  return res.json(o.toObject());
};
