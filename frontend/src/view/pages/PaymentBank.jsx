// src/view/pages/PaymentBank.jsx
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { bankInfo as getBankInfo } from '../../services/payments';
import { getOrder as getMyOrder } from '../../services/orders';
import { useAuth } from '../../store/useAuth';

const toVND = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
    .format(Number(n || 0));

export default function PaymentBank() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const orderId = params.get('orderId') || '';
  const codeFromQS = params.get('code') || '';
  const navigate = useNavigate();

  const [info, setInfo] = useState(null);   // dữ liệu từ /api/payments/bank/info
  const [order, setOrder] = useState(null); // phòng khi cần fallback hiển thị mã đơn
  const [err, setErr]   = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!user) {
          navigate('/login?next=' + encodeURIComponent(location.pathname + location.search));
          return;
        }
        if (!orderId) { setErr('Thiếu orderId'); return; }

        const data = await getBankInfo(orderId);
        if (alive) setInfo(data);

        // Lấy thêm chi tiết đơn để hiển thị mã đơn / tổng… (không bắt buộc)
        try {
          const o = await getMyOrder(orderId);
          if (alive) setOrder(o);
        } catch { /* optional */ }
      } catch (e) {
        if (alive) setErr(e?.message || 'Không tải được thông tin chuyển khoản');
      }
    })();
    return () => { alive = false; };
  }, [orderId, user]);

  const code    = useMemo(() => info?.code || order?.code || codeFromQS, [info, order, codeFromQS]);
  const amount  = useMemo(() => Number(info?.amount || 0), [info]);
  const content = useMemo(() => info?.content || (code ? `PAY ${code}` : ''), [info, code]);

  // Nếu backend không trả sẵn qrUrl, tạo tạm từ dữ liệu có được
  const qrUrl = useMemo(() => {
    if (info?.qrUrl) return info.qrUrl;
    if (info?.bank?.code && info?.bank?.accountNo) {
      const qs = new URLSearchParams();
      if (amount > 0) qs.set('amount', String(amount));
      if (content) qs.set('addInfo', content);
      if (info?.bank?.accountName) qs.set('accountName', info.bank.accountName);
      return `https://img.vietqr.io/image/${info.bank.code}-${info.bank.accountNo}-qr_only.png?${qs.toString()}`;
    }
    // fallback QR thuần (không kèm số tiền)
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(content)}`;
  }, [info, amount, content]);

  const copy = (t) => navigator.clipboard?.writeText(String(t || ''));
  if (err) {
    return (
      <div className="container px-4 py-12">
        <div className="max-w-xl mx-auto card p-8 text-center">
          <div className="text-lg font-semibold text-rose-600 mb-2">Không thể tải thông tin</div>
          <div className="text-gray-600 mb-6">{err}</div>
          <Link to="/account/orders" className="btn">Đơn hàng của tôi</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Chuyển khoản ngân hàng</h1>

        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-start gap-5">
            {/* QR */}
            <div className="shrink-0">
              <div className="w-[240px] h-[240px] rounded-xl border overflow-hidden bg-white flex items-center justify-center">
                {qrUrl ? (
                  <img alt="VietQR" src={qrUrl} className="w-full h-full object-contain" />
                ) : (
                  <div>Đang tạo QR…</div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-2 text-center">
                Quét QR để chuyển khoản nhanh
              </div>
            </div>

            {/* Thông tin chuyển khoản */}
            <div className="flex-1 space-y-2">
              {!info ? (
                <div className="text-gray-600">Đang tải thông tin…</div>
              ) : (
                <>
                  <div><b>Mã đơn hàng:</b> {code}</div>
                  <div><b>Ngân hàng:</b> {info.bank?.code || info.bankName || '-'}</div>
                  <div><b>Chủ tài khoản:</b> {info.bank?.accountName || info.accountName || '-'}</div>
                  <div>
                    <b>Số tài khoản:</b>{' '}
                    <span className="font-mono">{info.bank?.accountNo || info.accountNumber || '-'}</span>
                    <button className="text-xs ml-2 underline" onClick={() => copy(info.bank?.accountNo || info.accountNumber)}>Copy</button>
                  </div>

                  <div className="mt-2 p-3 rounded bg-amber-50 text-amber-800">
                    <b>Nội dung chuyển khoản:</b>{' '}
                    <span className="font-mono">{content}</span>
                    <button className="text-xs ml-2 underline" onClick={() => copy(content)}>Copy</button>
                  </div>

                  {amount > 0 && (
                    <div><b>Số tiền:</b> {toVND(amount)}</div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <Link to="/account/orders" className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200">
              Tôi đã chuyển khoản
            </Link>
            <Link to="/categories" className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200">
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          Lưu ý: Vui lòng chuyển khoản đúng <b>nội dung</b> để hệ thống đối soát nhanh.
        </div>
      </div>
    </div>
  );
}
