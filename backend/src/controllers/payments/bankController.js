// backend/src/controllers/payments/bankController.js
import { Order } from '../../models/Order.js';

// Hỗ trợ cả 2 tên biến để bạn linh hoạt .env
const BANK_CODE    = process.env.BANK_CODE || process.env.BANK_BIN || 'MB'; // MB, VCB, TCB, MBB, BIDV...
const ACCOUNT_NO   = process.env.BANK_ACCOUNT_NO || process.env.BANK_ACCOUNT_NUMBER || '000008122003';
const ACCOUNT_NAME = process.env.BANK_ACCOUNT_NAME || 'BOOKSTORE';
const VIETQR_URL   = process.env.VIETQR_PROVIDER_URL || 'https://img.vietqr.io/image';

const toInt = (n) => (Number.isFinite(Number(n)) ? Math.round(Number(n)) : 0);
function grandTotal(o) {
  const items = Array.isArray(o.items) ? o.items : [];
  const subtotal = items.reduce((s, it) => s + toInt(it.price) * toInt(it.qty), 0);
  return Math.max(0, subtotal + toInt(o.shippingFee) + toInt(o.tax) - toInt(o.discount));
}

/**
 * GET /api/payments/bank/info?orderId=...
 * Trả về: amount, nội dung CK (PAY <mã đơn>), và link ảnh QR VietQR.
 * YÊU CẦU đăng nhập (requireAuth) và chỉ trả đơn của chính user.
 */
export async function bankInfo(req, res) {
  try {
    const { orderId } = req.query || {};
    if (!orderId) return res.status(400).json({ message: 'missing_orderId' });

    // chỉ lấy đơn của user hiện tại
    const o = await Order.findOne({ _id: orderId, userId: req.user._id }).lean();
    if (!o) return res.status(404).json({ message: 'order_not_found' });

    if (!ACCOUNT_NO || !ACCOUNT_NAME) {
      return res.status(500).json({ message: 'bank_not_configured' });
    }

    const amount  = grandTotal(o);
    const content = `PAY ${o.code || o._id}`.trim();

    // Ảnh QR public qua img.vietqr.io (không cần API key)
    // Mẫu: https://img.vietqr.io/image/<BANK>-<ACCOUNT_NO>-qr_only.png?amount=<>&addInfo=<>&accountName=<>
    const qrUrl = `${VIETQR_URL}/${BANK_CODE}-${ACCOUNT_NO}-qr_only.png`
      + `?amount=${amount}`
      + `&addInfo=${encodeURIComponent(content)}`
      + `&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

    return res.json({
      orderId: String(o._id),
      code: o.code,
      amount,
      bank: { code: BANK_CODE, accountNo: ACCOUNT_NO, accountName: ACCOUNT_NAME },
      content,
      qrUrl,
      note: 'Vui lòng chuyển khoản kèm đúng nội dung để hệ thống đối soát nhanh.'
    });
  } catch (e) {
    console.error('bankInfo error', e);
    return res.status(500).json({ message: 'bank_info_failed' });
  }
}


export async function markPaidManual(req, res) {
  try {
    const { id } = req.params;
    const o = await Order.findById(id);
    if (!o) return res.status(404).json({ message: 'order_not_found' });

    if (String(o.payment?.status).toLowerCase() !== 'paid') {
      o.payment = {
        ...(o.payment || {}),
        method: 'bank',
        provider: 'bank',
        status: 'paid',
        capturedAt: new Date()
      };
      if (o.status === 'pending') {
        o.status = 'processing';
        o.processingAt = new Date();
      }
      o.history = Array.isArray(o.history) ? o.history : [];
      o.history.unshift({
        ts: new Date(),
        type: 'paid',
        by: req.user?.email || req.user?.name || 'admin',
        note: 'Manual bank transfer confirmed'
      });
      await o.save();
    }

    return res.json(o.toObject());
  } catch (e) {
    console.error('markPaidManual error', e);
    return res.status(500).json({ message: 'mark_paid_failed' });
  }
}
