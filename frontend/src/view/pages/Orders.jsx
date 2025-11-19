import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  list as listOrders,
  cancel as cancelOrder,
  rma as requestRMA,
  confirmReceived,
} from '../../services/orders';
import { useAuth } from '../../store/useAuth';
import { useUI } from '../../store/useUI';
import { getImageUrl } from '../../services/api.js';
import ImageUploader from './admin/ImageUploader.jsx';
import { X, Truck, Package, RefreshCcw, AlertTriangle, CheckCircle, CreditCard, Smartphone } from 'lucide-react';

// --- HẰNG SỐ ---
const TABS = [
  { key: 'all',              label: 'Tất cả đơn' },
  { key: 'pending',          label: 'Chờ thanh toán' },
  { key: 'processing',       label: 'Đang xử lý' },
  { key: 'shipping',         label: 'Đang vận chuyển' },
  { key: 'delivered',        label: 'Đã giao' },
  { key: 'completed',        label: 'Hoàn tất' },
  { key: 'cancelled',        label: 'Đã huỷ' },
];

const REASONS = [
  { key: 'changed_mind',   label: 'Đặt nhầm / Đổi ý' },
  { key: 'found_better',   label: 'Tìm được giá tốt hơn' },
  { key: 'other',          label: 'Khác (ghi rõ)' },
];

const RMA_REASONS = [
  { key: 'defective',      label: 'Sản phẩm bị lỗi / hư hỏng' },
  { key: 'wrong_item',     label: 'Giao sai sản phẩm' },
  { key: 'fake_product',   label: 'Hàng giả / Hàng nhái' },
  { key: 'missing_parts',  label: 'Thiếu phụ kiện / quà tặng' },
  { key: 'other',          label: 'Khác (ghi rõ)' },
];

function TabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium -mb-px ${
        active 
          ? 'border-b-2 border-blue-600 text-blue-600' 
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

const money  = (n) => (Number(n || 0)).toLocaleString('vi-VN') + 'đ';
const dateVN = (d) => (d ? new Date(d).toLocaleString('vi-VN') : '-');

const normStatus = (s) => {
  const m = { shipped: 'shipping', delivered: 'delivered', canceled: 'cancelled' };
  return m[s] || s;
};

export default function Orders() {
  const { user } = useAuth();
  const { showToast } = useUI();
  const nav = useNavigate();

  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cancel dialog states
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [cancelIsPending, setCancelIsPending] = useState(false);
  const [reasonKey, setReasonKey] = useState('');
  const [reasonOther, setReasonOther] = useState('');
  
  // RMA dialog states
  const [rmaOpen, setRmaOpen] = useState(false); 
  const [rmaOrder, setRmaOrder] = useState(null); 
  const [rmaReasonKey, setRmaReasonKey] = useState('');
  const [rmaNote, setRmaNote] = useState(''); 
  const [rmaImages, setRmaImages] = useState([]); 
  const [rmaImageTab, setRmaImageTab] = useState('upload');
  const [urlInput, setUrlInput] = useState('');
  
  // Payment Modal State
  const [payOpen, setPayOpen] = useState(false);
  const [payOrder, setPayOrder] = useState(null);
  
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideOrder, setGuideOrder] = useState(null);
  
  const [submitting, setSubmitting] = useState(false);

  const reload = async () => {
    if (!user?._id && !user?.id) return;
    setLoading(true);
    try {
      const data = await listOrders({});
      setItems(Array.isArray(data) ? data : (data?.items || []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [user]);

  const view = useMemo(() => {
    const byTab = items.filter((o) => (tab === 'all' ? true : normStatus(o.status) === tab));
    const t = q.trim().toLowerCase();
    if (!t) return byTab;
    return byTab.filter((o) => {
      const code   = String(o.code || o._id || o.id || '').toLowerCase();
      return code.includes(t);
    });
  }, [items, tab, q]);

  const getOrderStatusDisplay = (o) => {
    const st = normStatus(o.status);
    const isCOD = o.payment?.method === 'cod';
    const isPaid = o.payment?.status === 'paid';

    if (st === 'refunded') return { label: 'Đã hoàn tiền', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (o.rmaStatus === 'approved') return { label: 'Đang đổi/trả (Chờ gửi hàng)', color: 'text-blue-600', bg: 'bg-blue-50', showGuide: true };
    if (o.rmaStatus === 'requested') return { label: 'Đã yêu cầu đổi/trả', color: 'text-blue-600', bg: 'bg-blue-50' };

    switch(st) {
      case 'pending': 
        return isCOD 
          ? { label: 'Chờ xác nhận (COD)', color: 'text-gray-600', bg: 'bg-gray-100' }
          : { label: 'Chờ thanh toán', color: 'text-red-600', bg: 'bg-red-50', showPayBtn: !isPaid };
      case 'processing': return { label: 'Đang xử lý', color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'shipping': return { label: 'Đang vận chuyển', color: 'text-purple-600', bg: 'bg-purple-50' };
      case 'delivered': return { label: 'Đã giao hàng', color: 'text-green-600', bg: 'bg-green-50' };
      case 'completed': return { label: 'Hoàn tất', color: 'text-green-700', bg: 'bg-green-100' };
      case 'cancelled': return { label: 'Đã huỷ', color: 'text-gray-500', bg: 'bg-gray-100' };
      default: return { label: st, color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  // --- CÁC HÀM XỬ LÝ ---
  
  const openCancelDialog = (orderId, isPending) => {
    setCancelOrderId(orderId);
    setCancelIsPending(!!isPending);
    setReasonKey('');
    setReasonOther('');
    setCancelOpen(true);
  };

  const submitCancel = async () => {
    if (!cancelOrderId) return;
    const picked = REASONS.find(r => r.key === reasonKey);
    const finalReason = reasonKey === 'other' ? reasonOther : picked?.label;
    setSubmitting(true);
    try {
      await cancelOrder(cancelOrderId, { reason: finalReason });
      setCancelOpen(false);
      reload();
      showToast({ type: 'success', title: 'Thành công', duration: 2000 });
    } catch (e) {
      showToast({ type: 'error', title: 'Lỗi', msg: e.message });
    } finally { setSubmitting(false); }
  };

  const onConfirmReceived = async (id) => {
    if(!window.confirm("Bạn xác nhận đã nhận được hàng?")) return;
    try { await confirmReceived(id); reload(); } catch (e) {}
  };

  // Logic RMA
  const openRMADialog = (order) => {
    setRmaOrder(order);
    setRmaReasonKey('');
    setRmaNote('');
    setRmaImages([]);
    setRmaImageTab('upload');
    setUrlInput('');
    setRmaOpen(true);
  };
  const closeRMADialog = () => {
    if (submitting) return;
    setRmaOpen(false);
    setRmaOrder(null);
  };
  const addImageUrl = () => {
    if (urlInput && urlInput.trim() !== '' && !rmaImages.includes(urlInput)) {
      setRmaImages(prev => [...prev, urlInput.trim()]);
    }
    setUrlInput('');
  };
  const handleImageUpload = (newImageUrl) => {
    if (newImageUrl && !rmaImages.includes(newImageUrl)) {
      setRmaImages(prev => [...prev, newImageUrl]);
      showToast({ type: 'success', title: 'Đã thêm ảnh', duration: 1500 });
    }
  };
  const removeImage = (index) => {
    setRmaImages(prev => prev.filter((_, i) => i !== index));
  };
  const submitRMA = async () => {
    if (!rmaOrder) return;
    if (!rmaReasonKey) { alert('Vui lòng chọn lý do trả hàng'); return; }
    const pickedReason = RMA_REASONS.find(r => r.key === rmaReasonKey)?.label || 'Khác';
    const itemsPayload = (rmaOrder.items || []).map(item => ({
      bookId: item.bookId,
      qty: item.qty || 1,
      reason: pickedReason
    }));
    const payload = { type: 'return', items: itemsPayload, customerNote: rmaNote, images: rmaImages };
    setSubmitting(true);
    try {
      await requestRMA(rmaOrder._id, payload);
      closeRMADialog();
      showToast({ type: 'success', title: 'Đã gửi yêu cầu đổi/trả' });
      await reload();
    } catch (e) {
      showToast({ type: 'error', title: 'Lỗi', msg: e.message });
    } finally { setSubmitting(false); }
  };

  // --- LOGIC THANH TOÁN MỚI ---
  const openPaymentDialog = (order) => {
    setPayOrder(order);
    setPayOpen(true);
  };
  
  const proceedToPay = (method) => {
    if (!payOrder) return;
    const oid = payOrder._id || payOrder.id;
    const code = payOrder.code;
    
    // Đóng modal
    setPayOpen(false);
    setPayOrder(null);
    
    // Chuyển hướng
    if (method === 'bank') {
      nav(`/payment-bank?orderId=${encodeURIComponent(oid)}&code=${encodeURIComponent(code)}`);
    } else if (method === 'vnpay' || method === 'momo') {
      alert('Tính năng thanh toán VNPAY/Momo đang bảo trì. Vui lòng chọn Chuyển khoản.');
    }
  };

  // --- LOGIC HƯỚNG DẪN RMA ---
  const openReturnGuideDialog = (order) => {
    setGuideOrder(order);
    setGuideOpen(true);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container px-4 py-6 grid lg:grid-cols-[280px,1fr] gap-6">
        {/* Sidebar (Giữ nguyên) */}
        <aside className="bg-white rounded-xl border shadow-sm h-fit">
          <div className="flex items-center gap-3 px-4 py-4 border-b">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-xl">👤</span>
            </div>
            <div>
              <div className="text-xs text-gray-500">Tài khoản của</div>
              <div className="font-semibold text-gray-900">
                {user?.name || user?.email || 'Bạn'}
              </div>
            </div>
          </div>
          <nav className="p-2 text-[15px]">
            <Link to="/account/info" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
              <span className="w-6 text-center">👤</span> Thông tin tài khoản
            </Link>
            <Link to="/account/reviews" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
              <span className="w-6 text-center">⭐</span> Đánh giá sản phẩm
            </Link>
            <Link to="/account/comments" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
              <span className="w-6 text-center">💬</span> Nhận xét của tôi
            </Link>
            <Link to="/account/addresses" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
              <span className="w-6 text-center">📍</span> Sổ địa chỉ
            </Link>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100 text-gray-900 font-medium">
              <span className="w-6 text-center">🧾</span> Quản lý đơn hàng
            </div>
          </nav>
        </aside>

        {/* Content */}
        <section className="bg-white rounded-xl border shadow-sm">
          <div className="px-5 pt-5 border-b pb-4">
            <h1 className="text-2xl font-semibold mb-4">Đơn hàng của tôi</h1>
            <div className="flex flex-wrap gap-6 font-medium text-gray-700 overflow-x-auto">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`relative py-2 whitespace-nowrap ${tab === t.key ? 'text-violet-700 font-bold' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  {t.label}
                  {tab === t.key && <span className="absolute left-0 right-0 -bottom-[17px] h-[2px] bg-violet-600 rounded-full" />}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="p-5 space-y-4">
            {items.length === 0 && <div className="text-center text-gray-500 py-8">Chưa có đơn hàng nào.</div>}
            
            {view.map((o) => {
              const display = getOrderStatusDisplay(o);
              const total = Number(o?.pricing?.grandTotal ?? o?.total?.grand ?? 0);
              const discount = Number(o?.pricing?.discount ?? o?.discount ?? 0);
              const isCompleted = normStatus(o.status) === 'completed';
              const isDelivered = normStatus(o.status) === 'delivered';

              return (
                <div key={o._id || o.id} className="rounded-lg border p-4 hover:shadow-sm transition bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-3 pb-3 border-b border-dashed">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">#{String(o.code || o._id).slice(-6)}</span>
                        <span className="text-gray-400">|</span>
                        <span className="text-sm text-gray-500">{dateVN(o.createdAt)}</span>
                      </div>
                      <div className={`mt-1 text-sm font-medium px-2 py-0.5 rounded w-fit ${display.bg} ${display.color}`}>
                        {display.label}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-violet-700">{money(total)}</div>
                      
                      {/* ✅ HIỂN THỊ GIẢM GIÁ (MỚI) */}
                      {discount > 0 && (
                         <div className="text-xs text-green-600 font-medium">
                           (Đã giảm: {money(discount)})
                         </div>
                      )}
                      
                      <div className="text-xs text-gray-500 uppercase mt-1">{o.payment?.method || 'COD'}</div>
                    </div>
                  </div>

                  {display.showGuide && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3 text-sm text-blue-800">
                      <Truck className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <strong>Yêu cầu đổi trả đã được duyệt!</strong>
                        <p className="mt-1">Vui lòng đóng gói sản phẩm cẩn thận. Shipper sẽ liên hệ bạn trong 1-2 ngày tới để thu hồi hàng hoàn.</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {(o.items || []).map((i, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="text-gray-500">x{i.quantity || i.qty}</span>
                          <span className="truncate max-w-[200px] sm:max-w-md" title={i.title}>{i.title}</span>
                        </div>
                        <span className="font-medium">{money((i.unitPrice || 0) * (i.qty || 1))}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t flex flex-wrap justify-end gap-2">
                    
                    {/* ✅ NÚT THANH TOÁN NGAY (MỚI) */}
                    {display.showPayBtn && (
                      <button 
                        onClick={() => openPaymentDialog(o)} // Mở Modal Chọn Thanh Toán
                        className="btn bg-violet-600 text-white hover:bg-violet-700 btn-sm"
                      >
                        Thanh toán ngay
                      </button>
                    )}

                    {(o.status === 'pending' || o.status === 'processing') && (
                      <button onClick={() => openCancelDialog(o._id, o.status === 'pending')} className="btn border hover:bg-gray-50 text-gray-600">Huỷ đơn</button>
                    )}
                    {isDelivered && (
                      <button onClick={() => onConfirmReceived(o._id)} className="btn bg-emerald-600 text-white hover:bg-emerald-700"><Package className="w-4 h-4 mr-1" /> Đã nhận hàng</button>
                    )}
                    {isCompleted && !o.rmaStatus && (
                      <button onClick={() => openRMADialog(o)} className="btn border border-red-200 text-red-600 hover:bg-red-50"><RefreshCcw className="w-4 h-4 mr-1" /> Đổi/Trả</button>
                    )}
                    {o.rmaStatus === 'requested' && (
                      <span className="px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded border border-blue-100 flex items-center gap-1">
                        <RefreshCcw className="w-4 h-4 animate-spin" /> Đang chờ duyệt...
                      </span>
                    )}
                    {o.rmaStatus === 'approved' && (
                      <button onClick={() => openReturnGuideDialog(o)} className="btn bg-blue-600 text-white hover:bg-blue-700 animate-pulse"><Package className="w-4 h-4 mr-1" /> Xem hướng dẫn trả hàng</button>
                    )}
                    {o.rmaStatus === 'processed' && (
                       <span className="text-green-600 text-sm font-medium flex items-center gap-1 px-3 py-2 bg-green-50 rounded border border-green-100"><CheckCircle size={16}/> Đổi trả hoàn tất</span>
                    )}

                    <Link to="/categories" className="btn border hover:bg-gray-50">Mua lại</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Modal Cancel */}
      {cancelOpen && (
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/40" onClick={() => !submitting && setCancelOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
              <div className="px-5 pt-5">
                <h2 className="text-lg font-semibold">{cancelIsPending ? 'Huỷ đơn hàng' : 'Gửi yêu cầu huỷ'}</h2>
                <p className="mt-1 text-sm text-gray-600">Vui lòng chọn lý do huỷ để chúng tôi phục vụ tốt hơn.</p>
              </div>
              <div className="px-5 py-4 space-y-2">
                {REASONS.map(r => (
                  <label key={r.key} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input type="radio" className="mt-1" name="cancel_reason" value={r.key} checked={reasonKey === r.key} onChange={() => setReasonKey(r.key)} />
                    <span className="text-sm text-gray-800">{r.label}</span>
                  </label>
                ))}
                {reasonKey === 'other' && (
                  <textarea className="mt-1 w-full input min-h-[96px]" placeholder="Nhập lý do khác…" value={reasonOther} onChange={(e) => setReasonOther(e.target.value)} />
                )}
              </div>
              <div className="px-5 pb-5 flex items-center justify-end gap-3">
                <button className="btn bg-gray-100 hover:bg-gray-200" onClick={() => setCancelOpen(false)} disabled={submitting}>Bỏ qua</button>
                <button className="btn bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60" onClick={submitCancel} disabled={submitting || (reasonKey === 'other' ? !reasonOther.trim() : !reasonKey)}>
                  {submitting ? 'Đang gửi…' : (cancelIsPending ? 'Xác nhận huỷ' : 'Gửi yêu cầu')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL RMA */}
      {rmaOpen && rmaOrder && (
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/40" onClick={closeRMADialog} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5 flex flex-col max-h-[90vh]">
              <div className="flex-shrink-0 px-5 pt-5">
                <h2 className="text-xl font-semibold text-red-600">Yêu cầu Đổi / Trả hàng</h2>
                <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded text-sm text-red-800 flex gap-2">
                  <AlertTriangle size={18} className="shrink-0" />
                  <p>Chính sách: Bạn đang yêu cầu trả hàng cho toàn bộ đơn hàng <b>#{String(rmaOrder.code || rmaOrder._id).slice(-6)}</b>.</p>
                </div>
              </div>

              <form id="rmaForm" onSubmit={(e) => { e.preventDefault(); submitRMA(); }} className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
                  <p className="text-xs font-bold text-gray-500 uppercase">Sản phẩm sẽ trả:</p>
                  {(rmaOrder.items || []).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.title}</span>
                      <span className="font-mono text-gray-600">x{item.qty}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold text-gray-800">
                    <span>Tổng hoàn tiền dự kiến:</span>
                    <span>{money(rmaOrder?.pricing?.grandTotal ?? rmaOrder?.total?.grand)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lý do trả hàng <span className="text-red-500">*</span></label>
                  <div className="space-y-2">
                    {RMA_REASONS.map(r => (
                      <label key={r.key} className="flex items-center gap-3 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="rma_reason_global"
                          className="accent-red-600"
                          checked={rmaReasonKey === r.key}
                          onChange={() => setRmaReasonKey(r.key)}
                        />
                        <span className="text-sm text-gray-800">{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Hình ảnh minh chứng</label>
                  <div className="flex border-b mb-2 mt-1">
                    <TabButton label="Tải lên (Local)" active={rmaImageTab === 'upload'} onClick={() => setRmaImageTab('upload')} />
                    <TabButton label="Dán link (URL)" active={rmaImageTab === 'url'} onClick={() => setRmaImageTab('url')} />
                  </div>
                  <div className="mt-4">
                    {rmaImageTab === 'upload' && (
                      <div className="compact-uploader mt-2">
                        <ImageUploader value={null} onChange={handleImageUpload} />
                        <p className="text-xs text-gray-400 mt-2 text-center italic">Hỗ trợ: JPG, PNG, GIF. Tối đa 5MB.</p>
                      </div>
                    )}
                    {rmaImageTab === 'url' && (
                      <div className="flex gap-2">
                        <input className="input w-full" placeholder="https://..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
                        <button type="button" onClick={addImageUrl} className="btn-primary flex-shrink-0">Thêm</button>
                      </div>
                    )}
                  </div>
                  {rmaImages.length > 0 && (
                    <div className="mt-4 grid grid-cols-4 gap-3">
                      {rmaImages.map((img, index) => (
                        <div key={index} className="relative group aspect-square border rounded-lg overflow-hidden bg-gray-100">
                          <img src={getImageUrl(img)} alt="evidence" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-black/50 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Ghi chú thêm</label>
                  <textarea className="mt-1 w-full input min-h-[70px]" placeholder="Mô tả chi tiết lỗi..." value={rmaNote} onChange={(e) => setRmaNote(e.target.value)} />
                </div>
              </form>

              <div className="flex-shrink-0 px-5 pb-5 flex items-center justify-end gap-3 border-t pt-4">
                <button className="btn bg-gray-100 hover:bg-gray-200" onClick={closeRMADialog} disabled={submitting}>Hủy bỏ</button>
                <button type="submit" form="rmaForm" className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-60" disabled={submitting || !rmaReasonKey}>
                  {submitting ? 'Đang gửi…' : 'Gửi yêu cầu đổi/trả'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL HƯỚNG DẪN TRẢ HÀNG */}
      {guideOpen && guideOrder && (
        <div className="fixed inset-0 z-[1100]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setGuideOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Truck size={20} /> Hướng dẫn Gửi hàng
                </h3>
                <button onClick={() => setGuideOpen(false)} className="hover:bg-blue-700 p-1 rounded"><X size={20}/></button>
              </div>
              <div className="p-6 space-y-4 text-gray-700">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm">
                  <p className="font-semibold text-blue-800 mb-1">✅ Yêu cầu của bạn đã được chấp nhận!</p>
                  <p>Vui lòng làm theo các bước sau để gửi hàng về cho chúng tôi.</p>
                </div>
                <ol className="list-decimal list-inside space-y-3 text-sm">
                  <li><strong>Đóng gói sản phẩm:</strong> Đóng gói kỹ sản phẩm (kèm phụ kiện/quà tặng nếu có).</li>
                  <li><strong>Ghi mã đơn hàng:</strong> Viết mã đơn <span className="font-mono font-bold bg-gray-100 px-1">#{String(guideOrder.code || guideOrder._id).slice(-6)}</span> lên bên ngoài kiện hàng.</li>
                  <li><strong>Gửi về địa chỉ kho:</strong>
                    <div className="mt-2 p-3 bg-gray-100 rounded text-sm font-mono border border-gray-200">
                      Kho BookStore (Phòng Trả hàng)<br/>123 Đường Nguyễn Văn Cừ, Quận 5, TP.HCM<br/>SĐT: 0901 234 567
                    </div>
                  </li>
                  <li><strong>Chờ xác nhận:</strong> Sau khi nhận được hàng, chúng tôi sẽ kiểm tra và hoàn tiền trong vòng 24h.</li>
                </ol>
              </div>
              <div className="bg-gray-50 px-6 py-4 text-right border-t">
                <button onClick={() => setGuideOpen(false)} className="btn bg-blue-600 text-white hover:bg-blue-700 w-full">Đã hiểu</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL CHỌN PHƯƠNG THỨC THANH TOÁN (MỚI) */}
      {payOpen && payOrder && (
        <div className="fixed inset-0 z-[1200]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPayOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                 <h3 className="text-lg font-bold">Chọn phương thức thanh toán</h3>
                 <button onClick={() => setPayOpen(false)}><X size={20}/></button>
              </div>
              <div className="p-6 space-y-3">
                 <button 
                   onClick={() => proceedToPay('bank')}
                   className="w-full p-4 border rounded-xl flex items-center gap-3 hover:bg-blue-50 hover:border-blue-200 transition"
                 >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <CreditCard size={20} />
                    </div>
                    <div className="text-left">
                       <div className="font-semibold text-gray-900">Chuyển khoản Ngân hàng</div>
                       <div className="text-xs text-gray-500">Quét mã QR, duyệt nhanh</div>
                    </div>
                 </button>

                 <button 
                   onClick={() => proceedToPay('momo')}
                   className="w-full p-4 border rounded-xl flex items-center gap-3 hover:bg-pink-50 hover:border-pink-200 transition"
                 >
                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
                      <Smartphone size={20} />
                    </div>
                    <div className="text-left">
                       <div className="font-semibold text-gray-900">Ví Momo / VNPAY</div>
                       <div className="text-xs text-gray-500">Cổng thanh toán điện tử</div>
                    </div>
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .compact-uploader label { height: 120px !important; padding: 10px !important; background-color: #f9fafb; border-color: #e5e7eb; }
        .compact-uploader label:hover { background-color: #f3f4f6; border-color: #d1d5db; }
        .compact-uploader label svg { width: 24px !important; height: 24px !important; margin-bottom: 4px !important; color: #6b7280; }
        .compact-uploader label p { font-size: 12px !important; color: #6b7280; }
        .compact-uploader label p.text-xs { display: none !important; }
      `}</style>
    </div>
  );
}