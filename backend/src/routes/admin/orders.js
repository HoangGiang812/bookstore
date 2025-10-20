import express from 'express';
import Order from '../../models/Order.js';
import { requireAdmin } from '../../middlewares/auth.js';
import { refundPayment } from '../../services/payments.js'; // stub bên dưới

const router = express.Router();

// Duyệt huỷ
router.post('/:id/cancel/approve', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const o = await Order.findById(id);
    if (!o) return res.status(404).json({ message: 'Không tìm thấy đơn' });

    if (o.payment?.captured) {
      // thực hiện refund qua cổng thanh toán
      const r = await refundPayment(o.payment.txnId, o.total);
      o.cancellation = {
        approved: true,
        approvedBy: req.user._id,
        at: new Date(),
        refund: { ok: !!r?.ok, amount: o.total, txnId: r?.id || '' }
      };
    } else {
      o.cancellation = { approved: true, approvedBy: req.user._id, at: new Date() };
    }
    o.pushStatus('cancelled', req.user._id, 'Admin approved cancellation');
    o.cancelRequest = { requested: false };
    await o.save();
    res.json({ ok: true, status: o.status });
  } catch (e) { next(e); }
});

// Từ chối huỷ
router.post('/:id/cancel/reject', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note = '' } = req.body || {};
    const o = await Order.findById(id);
    if (!o) return res.status(404).json({ message: 'Không tìm thấy đơn' });

    // trả về trạng thái trước khi yêu cầu (nếu bạn có lưu from trong statusHistory, lấy bản ghi gần nhất không phải cancel_requested)
    const prev = [...o.statusHistory].reverse().find(h => h.to === 'cancel_requested')?.from || 'processing';
    o.pushStatus(prev, req.user._id, `Admin rejected cancel: ${note}`);
    o.cancelRequest = { requested: false };
    await o.save();
    res.json({ ok: true, status: o.status });
  } catch (e) { next(e); }
});

export default router;
