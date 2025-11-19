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

  const [info, setInfo] = useState(null);
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState('');

  // Cấu hình ngân hàng tĩnh (NẾU API KHÔNG TRẢ VỀ)
  // Bạn hãy điền thông tin thật của bạn vào đây để dự phòng
  const FALLBACK_BANK = {
    bankId: 'MB',           // Mã ngân hàng (MB, VCB, TPB, v.v.)
    accountNo: '000008122003', // Số tài khoản
    accountName: 'NGUYEN HOANG GIANG', // Tên chủ tài khoản (viết hoa không dấu)
    template: 'compact2'    // Mẫu QR: compact, compact2, qr_only, print
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!user) {
          navigate('/login?next=' + encodeURIComponent(location.pathname + location.search));
          return;
        }
        if (!orderId) { setErr('Thiếu orderId'); return; }

        // 1. Lấy thông tin đơn hàng trước để chắc chắn có số tiền
        const o = await getMyOrder(orderId);
        if (alive) setOrder(o);

        // 2. Lấy thông tin ngân hàng từ API (nếu có)
        try {
          const data = await getBankInfo(orderId);
          if (alive && data) setInfo(data);
        } catch {
          console.warn("Không lấy được bank info từ API, dùng fallback.");
        }
      } catch (e) {
        if (alive) setErr(e?.message || 'Không tải được thông tin đơn hàng');
      }
    })();
    return () => { alive = false; };
  }, [orderId, user]);

  // Tính toán các giá trị hiển thị
  const code    = info?.code || order?.code || codeFromQS;
  // Lấy số tiền: Ưu tiên từ API bank, nếu không thì lấy từ Order
  const amount  = Number(info?.amount || order?.pricing?.grandTotal || order?.total?.grand || 0);
  const content = info?.content || (code ? `PAY ${code}` : '');
  
  // Lấy thông tin tài khoản: Ưu tiên API, nếu không thì dùng FALLBACK
  const bankId = info?.bank?.code || FALLBACK_BANK.bankId;
  const accountNo = info?.bank?.accountNo || FALLBACK_BANK.accountNo;
  const accountName = info?.bank?.accountName || FALLBACK_BANK.accountName;

  // ✅ TẠO LINK QR VIETQR CHUẨN
  const qrUrl = useMemo(() => {
    if (!bankId || !accountNo) return null;
    
    const baseUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${FALLBACK_BANK.template}.png`;
    const qs = new URLSearchParams();
    
    if (amount > 0) qs.set('amount', String(amount));
    if (content) qs.set('addInfo', content);
    if (accountName) qs.set('accountName', accountName);
    
    return `${baseUrl}?${qs.toString()}`;
  }, [bankId, accountNo, accountName, amount, content]);

  const copy = (t) => {
    navigator.clipboard?.writeText(String(t || ''));
    alert("Đã copy: " + t);
  };

  if (err) {
    return (
      <div className="container px-4 py-12">
        <div className="max-w-xl mx-auto card p-8 text-center">
          <div className="text-lg font-semibold text-rose-600 mb-2">Lỗi</div>
          <div className="text-gray-600 mb-6">{err}</div>
          <Link to="/account/orders" className="btn">Quay lại đơn hàng</Link>
        </div>
      </div>
    );
  }

  if (!order) return <div className="p-10 text-center">Đang tải thông tin thanh toán...</div>;

  return (
    <div className="container px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-center">Chuyển khoản ngân hàng</h1>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            
            {/* Cột QR Code */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="w-[280px] h-[320px] rounded-xl border-2 border-blue-100 overflow-hidden bg-white p-2 shadow-inner">
                {qrUrl ? (
                  <img 
                    alt="VietQR" 
                    src={qrUrl} 
                    className="w-full h-full object-contain" 
                    onError={(e) => e.target.src = 'https://placehold.co/240x240?text=QR+Error'}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">Đang tạo QR...</div>
                )}
              </div>
              <div className="text-sm text-gray-500 mt-3 text-center font-medium">
                Quét mã bằng App Ngân hàng<br/>hoặc Momo / ZaloPay
              </div>
            </div>

            {/* Cột Thông tin */}
            <div className="flex-1 space-y-4 w-full">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-800 mb-1">⚠️ Lưu ý quan trọng:</p>
                <p className="text-xs text-blue-700">
                  Hệ thống sẽ tự động duyệt đơn sau khi nhận được tiền (thường mất 1-5 phút). 
                  Vui lòng giữ nguyên nội dung chuyển khoản.
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-dashed pb-2">
                  <span className="text-gray-500">Ngân hàng:</span>
                  <span className="font-bold">{bankId}</span>
                </div>
                <div className="flex justify-between border-b border-dashed pb-2">
                  <span className="text-gray-500">Chủ tài khoản:</span>
                  <span className="font-bold uppercase">{accountName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-dashed pb-2">
                  <span className="text-gray-500">Số tài khoản:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-lg text-blue-700">{accountNo}</span>
                    <button className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200" onClick={() => copy(accountNo)}>Copy</button>
                  </div>
                </div>
                <div className="flex justify-between items-center border-b border-dashed pb-2">
                   <span className="text-gray-500">Số tiền:</span>
                   <div className="flex items-center gap-2">
                     <span className="font-bold text-lg text-red-600">{toVND(amount)}</span>
                     <button className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200" onClick={() => copy(amount)}>Copy</button>
                   </div>
                </div>
                
                <div className="pt-2">
                  <span className="text-gray-500 block mb-1">Nội dung chuyển khoản:</span>
                  <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <span className="font-bold font-mono text-yellow-800 flex-1">{content}</span>
                    <button className="text-xs bg-white border border-yellow-300 px-3 py-1 rounded hover:bg-yellow-100 text-yellow-800" onClick={() => copy(content)}>Copy</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Nút hành động */}
          <div className="flex justify-center gap-4 mt-8 pt-6 border-t">
            <Link to="/account/orders" className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-sm">
              Tôi đã chuyển khoản xong
            </Link>
            <Link to="/" className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium text-gray-700">
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}