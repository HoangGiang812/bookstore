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
import { X, Truck, Package, RefreshCcw, AlertTriangle, CheckCircle, CreditCard, Smartphone, DollarSign, Clock, XCircle, RefreshCw, ChevronLeft, ChevronRight, Mail, Facebook, PhoneCall } from 'lucide-react';

// --- HẰNG SỐ & HELPER ---
const TABS = [
  { key: 'all',              label: 'Tất cả đơn' },
  { key: 'pending',          label: 'Chờ thanh toán' },
  { key: 'processing',       label: 'Đang xử lý' },
  { key: 'shipping',         label: 'Đang vận chuyển' },
  { key: 'completed',        label: 'Hoàn tất' },
  { key: 'cancelled',        label: 'Đã huỷ / Hoàn tiền' },
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

const getOrderStatusDisplay = (o) => {
    const s = o.status;
    const isPaid = o.payment?.status === 'paid' || o.paymentStatus === 'paid' || o.paid;
    const isCOD = o.payment?.method === 'cod';
    const rma = o.rmaDetails || {};
    const rmaStatus = rma.status || o.rmaStatus;

    if (s === 'refunded') return { label: 'Đã hoàn tiền', color: 'text-red-600', bg: 'bg-red-50' };
    if (s === 'returned') return { label: 'Đang hoàn về kho', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (rmaStatus === 'requested') 
        return { badge: { text: 'Đang chờ duyệt đổi trả', color: 'bg-blue-50 text-blue-700', icon: Clock }, rmaActive: true };
    
    if (rmaStatus === 'approved' || rmaStatus === 'picking') 
        return { badge: { text: 'Shipper đang đến lấy hàng', color: 'bg-indigo-50 text-indigo-700', icon: Truck }, rmaActive: true };
    
    if (rmaStatus === 'picked' || rmaStatus === 'returned_to_warehouse') 
        return { badge: { text: 'Shop đã nhận lại hàng (Chờ hoàn tiền)', color: 'bg-orange-50 text-orange-700', icon: Package }, rmaActive: true };
    
    if (rmaStatus === 'processed' || rmaStatus === 'refunded' || o.status === 'refunded') 
        return { badge: { text: 'Đổi trả hoàn tất', color: 'bg-green-50 text-green-700', icon: CheckCircle }, rmaActive: true };

    if (rmaStatus === 'rejected') 
        return { badge: { text: 'Yêu cầu đổi trả bị từ chối', color: 'bg-red-50 text-red-700', icon: X }, rmaActive: true };
    if (o.rmaStatus === 'approved') return { label: 'Yêu cầu Trả hàng được duyệt', color: 'text-blue-600', bg: 'bg-blue-50', showGuide: true };
    if (o.rmaStatus === 'requested') return { label: 'Đang chờ duyệt trả hàng', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (o.rmaStatus === 'picking') 
      return { badge: { text: 'Shipper đang đến lấy hàng', color: 'bg-indigo-100 text-indigo-700', icon: Truck } };

    if (o.rmaStatus === 'picked') 
        return { badge: { text: 'Shipper đã lấy hàng xong', color: 'bg-blue-100 text-blue-700', icon: Package } };

    if (o.rmaStatus === 'returned_to_warehouse') 
        return { badge: { text: 'Đã về kho - Chờ hoàn tiền', color: 'bg-orange-100 text-orange-700', icon: RefreshCcw } };

    if (o.rmaStatus === 'completed') // Hoặc processed
        return { badge: { text: 'Đổi trả hoàn tất', color: 'bg-green-100 text-green-700', icon: CheckCircle } };

    switch (s) {
        case 'pending':
            return { 
                label: isPaid ? 'Chờ xác nhận (Đã thanh toán)' : 'Chờ xác nhận', 
                color: isPaid ? 'text-blue-700' : 'text-gray-600', 
                bg: isPaid ? 'bg-blue-50' : 'bg-gray-100',
                showPayBtn: !isPaid
            };
        case 'confirmed': 
        case 'processing': 
            return { label: 'Đang đóng gói', color: 'text-blue-600', bg: 'bg-blue-50' };
        case 'ready_to_pick': 
            return { label: 'Shipper đang lấy hàng', color: 'text-indigo-600', bg: 'bg-indigo-50' };
        case 'shipping': 
            return { label: 'Đang giao hàng', color: 'text-purple-600', bg: 'bg-purple-50' };
        case 'delivery_failed': 
            return { label: 'Giao thất bại (Chờ giao lại)', color: 'text-orange-600', bg: 'bg-orange-50' };
        case 'delivered': 
            return { label: 'Đã giao thành công', color: 'text-emerald-600', bg: 'bg-emerald-50', showConfirmBtn: true }; 
        case 'completed': 
            return { label: 'Hoàn thành', color: 'text-green-700', bg: 'bg-green-100' };
        case 'cancelled': 
        case 'cancel_requested': 
            return { label: 'Đã hủy', color: 'text-gray-500', bg: 'bg-gray-100' };
        default: 
            return { label: s, color: 'text-gray-600', bg: 'bg-gray-50' };
    }
};

const money  = (n) => (Number(n || 0)).toLocaleString('vi-VN') + 'đ';
const dateVN = (d) => (d ? new Date(d).toLocaleString('vi-VN') : '-');

// Helper Tabs Image
const TabButton = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    {label}
  </button>
);

export default function Orders() {
  const { user } = useAuth();
  const { showToast } = useUI();
  const nav = useNavigate();

  const [tab, setTab] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // --- STATE MODALS (Đã gộp gọn gàng, không trùng lặp) ---
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [reasonKey, setReasonKey] = useState('');
  const [reasonOther, setReasonOther] = useState('');
  
  const [rmaOpen, setRmaOpen] = useState(false); 
  const [rmaOrder, setRmaOrder] = useState(null); 
  const [rmaReasonKey, setRmaReasonKey] = useState('');
  const [rmaNote, setRmaNote] = useState(''); 
  const [rmaImages, setRmaImages] = useState([]); 
  const [rmaImageTab, setRmaImageTab] = useState('upload');
  const [urlInput, setUrlInput] = useState('');
  
  const [payOpen, setPayOpen] = useState(false);
  const [payOrder, setPayOrder] = useState(null);
  
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideOrder, setGuideOrder] = useState(null);
  
  const [confirmModal, setConfirmModal] = useState(null);
  const [rmaBank, setRmaBank] = useState({ bankName: '', accountNo: '', accountName: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 5;

  // --- LOAD DỮ LIỆU ---
  const reload = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Gọi API với params skip & limit
      const res = await listOrders({ 
          skip: (page - 1) * LIMIT, 
          limit: LIMIT 
      });
      
      const list = res.items || res || [];
      const total = res.total || list.length; // Backend phải trả về total
      
      setItems(list);
      setTotalPages(Math.ceil(total / LIMIT));
    } catch(e) { console.error(e); } 
    finally { setLoading(false); }
  };

  // Thêm useEffect để load lại khi đổi trang
  useEffect(() => { reload(); }, [user, page]);

  const view = useMemo(() => {
    if (tab === 'all') return items;
    return items.filter((o) => {
        if (tab === 'pending') return ['pending'].includes(o.status);
        if (tab === 'processing') return ['confirmed', 'processing', 'ready_to_pick'].includes(o.status);
        if (tab === 'shipping') return ['shipping', 'delivery_failed'].includes(o.status);
        if (tab === 'completed') return ['delivered', 'completed'].includes(o.status);
        if (tab === 'cancelled') return ['cancelled', 'refunded', 'returned', 'cancel_requested'].includes(o.status);
        return false;
    });
  }, [items, tab]);

  // --- COMPONENT STEPPER ---
  const OrderStepper = ({ status, rmaStatus }) => {
    // --- 1. CHẾ ĐỘ RMA (ĐỔI TRẢ) ---
    if (rmaStatus && rmaStatus !== 'rejected') {
        const steps = [
            { key: 'requested', label: 'Đã yêu cầu' },
            { key: 'approved', label: 'Shop duyệt' }, // Gộp picking vào đây
            { key: 'returned', label: 'Đã trả hàng' }, // Gộp picked, returned_to_warehouse
            { key: 'processed', label: 'Hoàn tiền' }
        ];
        
        let activeIdx = 0;
        if (['approved', 'picking'].includes(rmaStatus)) activeIdx = 1;
        else if (['picked', 'returned_to_warehouse'].includes(rmaStatus)) activeIdx = 2;
        else if (['processed', 'refunded'].includes(rmaStatus)) activeIdx = 3;

        return (
            <div className="w-full mb-6">
                <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit mb-4 mx-2">
                    🔄 Quy trình Đổi / Trả
                </div>
                <div className="flex items-center justify-between px-2 relative">
                    {/* Line Background */}
                    <div className="absolute top-[5px] left-4 right-4 h-[2px] bg-gray-200 -z-10"></div>
                    
                    {steps.map((step, idx) => {
                        const isCompleted = idx <= activeIdx;
                        return (
                            <div key={step.key} className="flex-1 flex flex-col items-center relative">
                                <div className={`w-3 h-3 rounded-full z-10 ${isCompleted ? 'bg-indigo-600 ring-2 ring-indigo-100' : 'bg-gray-300'}`}></div>
                                <div className={`absolute top-5 left-1/2 -translate-x-1/2 w-24 text-center text-[10px] font-medium ${isCompleted ? 'text-indigo-700' : 'text-gray-400'}`}>
                                    {step.label}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // --- 2. CHẾ ĐỘ MUA HÀNG (BÌNH THƯỜNG - GIỮ NGUYÊN CODE CŨ) ---
    const steps = [
        { key: 'pending', label: 'Đặt hàng' },
        { key: 'processing', label: 'Đang xử lý' },
        { key: 'shipping', label: 'Vận chuyển' },
        { key: 'delivered', label: 'Đã giao' },
        { key: 'completed', label: 'Hoàn tất' }
    ];
    let currentStep = 0;
    if (['confirmed', 'processing', 'ready_to_pick'].includes(status)) currentStep = 1;
    else if (['shipping', 'delivery_failed'].includes(status)) currentStep = 2;
    else if (['delivered'].includes(status)) currentStep = 3;
    else if (['completed'].includes(status)) currentStep = 4;
    else if (['cancelled', 'returned', 'refunded', 'cancel_requested'].includes(status)) 
      return <div className="text-red-500 font-bold bg-red-50 p-2 rounded text-center text-sm">Đơn hàng đã hủy / hoàn tiền</div>;

    return (
        <div className="flex items-center justify-between w-full mb-6 px-2">
          {steps.map((step, idx) => {
            const isCompleted = idx <= currentStep;
            const isLast = idx === steps.length - 1;
            return (
              <div key={step.key} className="flex-1 flex items-center relative">
                <div className={`w-3 h-3 rounded-full z-10 ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                <div className={`absolute top-5 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap font-medium ${isCompleted ? 'text-green-700' : 'text-gray-400'}`}>
                  {step.label}
                </div>
                {!isLast && (
                  <div className={`h-[2px] w-full absolute left-0 top-[5px] pl-3 ${idx < currentStep ? 'bg-green-600' : 'bg-gray-200'}`}></div>
                )}
              </div>
            );
          })}
        </div>
    );
  };
  // --- ACTIONS HANDLERS ---
  
  // 1. Submit Xác nhận đã nhận hàng
  const submitConfirmReceived = async () => {
    if (!confirmModal) return;
    setSubmitting(true);
    try {
        await confirmReceived(confirmModal.orderId);
        showToast({ type: 'success', title: 'Cảm ơn bạn đã mua hàng! 🎉' });
        await reload();
        setConfirmModal(null);
    } catch (e) {
        showToast({ type: 'error', title: 'Lỗi', msg: e.message });
    } finally {
        setSubmitting(false);
    }
  };

  // 2. Submit Hủy đơn
  const submitCancel = async () => {
    if (!cancelOrderId) return;
    const picked = REASONS.find(r => r.key === reasonKey);
    const finalReason = reasonKey === 'other' ? reasonOther : picked?.label;
    setSubmitting(true);
    try {
      await cancelOrder(cancelOrderId, { reason: finalReason });
      setCancelOpen(false);
      reload();
      showToast({ type: 'success', title: 'Đã hủy đơn hàng' });
    } catch (e) {
      showToast({ type: 'error', title: 'Lỗi', msg: e.message });
    } finally { setSubmitting(false); }
  };

  // 3. Logic RMA (Đổi trả)
  const openRMADialog = (order) => {
    setRmaOrder(order);
    setRmaReasonKey('');
    setRmaNote('');
    setRmaImages([]);
    setRmaImageTab('upload');
    setUrlInput('');
    setRmaOpen(true);
  };
  const closeRMADialog = () => { if (!submitting) setRmaOpen(false); };
  
  const handleImageUpload = (newImageUrl) => {
    if (newImageUrl && !rmaImages.includes(newImageUrl)) {
      setRmaImages(prev => [...prev, newImageUrl]);
      showToast({ type: 'success', title: 'Đã thêm ảnh', duration: 1500 });
    }
  };
  const addImageUrl = () => {
    if (urlInput && urlInput.trim() !== '' && !rmaImages.includes(urlInput)) {
      setRmaImages(prev => [...prev, urlInput.trim()]);
    }
    setUrlInput('');
  };
  const removeImage = (index) => setRmaImages(prev => prev.filter((_, i) => i !== index));

  const submitRMA = async () => {
    if (!rmaOrder) return;
    if (!rmaReasonKey) { alert('Vui lòng chọn lý do trả hàng'); return; }
    
    // [MỚI] Validate ngân hàng
    if (!rmaBank.bankName || !rmaBank.accountNo || !rmaBank.accountName) {
        alert('Vui lòng nhập thông tin ngân hàng để nhận tiền hoàn.');
        return;
    }

    const pickedReason = RMA_REASONS.find(r => r.key === rmaReasonKey)?.label || 'Khác';
    const itemsPayload = (rmaOrder.items || []).map(item => ({
      bookId: item.bookId,
      qty: item.qty || 1,
      reason: pickedReason
    }));

    // [MỚI] Thêm bankInfo vào payload
    const payload = { 
        type: 'return', 
        items: itemsPayload, 
        customerNote: rmaNote, 
        images: rmaImages,
        bankInfo: rmaBank // <-- QUAN TRỌNG
    };

    setSubmitting(true);
    try {
      await requestRMA(rmaOrder._id, payload);
      closeRMADialog(); // Hàm đóng modal cũ của bạn
      showToast({ type: 'success', title: 'Đã gửi yêu cầu đổi/trả' });
      await reload();
    } catch (e) {
      showToast({ type: 'error', title: 'Lỗi', msg: e.message });
    } finally { setSubmitting(false); }
  };

  // 4. Logic Thanh toán
  const proceedToPay = (method) => {
    if (!payOrder) return;
    const oid = payOrder._id || payOrder.id;
    const code = payOrder.code;
    setPayOpen(false);
    setPayOrder(null);
    if (method === 'bank') {
      nav(`/payment-bank?orderId=${encodeURIComponent(oid)}&code=${encodeURIComponent(code)}`);
    } else {
      alert('Tính năng đang bảo trì. Vui lòng chọn chuyển khoản.');
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container px-4 py-6 grid lg:grid-cols-[280px,1fr] gap-6">
        
        {/* Sidebar */}
        <aside className="bg-white rounded-xl border shadow-sm h-fit hidden lg:block">
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
            <Link to="/account/addresses" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
              <span className="w-6 text-center">📍</span> Sổ địa chỉ
            </Link>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100 text-gray-900 font-medium">
              <span className="w-6 text-center">🧾</span> Quản lý đơn hàng
            </div>
          </nav>
        </aside>

        {/* Content */}
        <section className="bg-white rounded-xl border shadow-sm min-h-[500px]">
          <div className="px-5 pt-5 border-b pb-0">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Đơn hàng của tôi</h1>
            <div className="flex gap-6 overflow-x-auto no-scrollbar">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`relative py-3 whitespace-nowrap text-sm font-medium transition-colors ${tab === t.key ? 'text-violet-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {t.label}
                  {tab === t.key && <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-violet-600 rounded-t-full" />}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 space-y-4 bg-gray-50/50 min-h-[400px]">
            {loading && <div className="text-center py-10">Đang tải...</div>}
            {!loading && view.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Package size={48} className="opacity-20 mb-3"/>
                    <p>Chưa có đơn hàng nào.</p>
                </div>
            )}
            
            {view.map((o) => {
              const display = getOrderStatusDisplay(o);
              const total = Number(o?.pricing?.grandTotal ?? o?.total?.grand ?? 0);
              const discount = Number(o?.pricing?.discount ?? o?.discount ?? 0);

              return (
                <div key={o._id || o.id} className="rounded-xl border border-gray-200 p-5 bg-white shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="mb-5 pb-5 border-b border-dashed border-gray-200">
                      <OrderStepper status={o.status} rmaStatus={o.rmaStatus || o.rmaDetails?.status} />
                  </div>

                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-gray-900 text-lg">#{String(o.code || o._id).slice(-6)}</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-sm text-gray-500">{dateVN(o.createdAt)}</span>
                      </div>
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold ${display.bg} ${display.color}`}>
                        {display.label}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-violet-700">{money(total)}</div>
                      {discount > 0 && <div className="text-xs text-green-600 font-medium mt-0.5">(Đã giảm: {money(discount)})</div>}
                      <div className="text-xs text-gray-400 font-medium uppercase mt-1 tracking-wider">{o.payment?.method || 'COD'}</div>
                    </div>
                  </div>

                  {(() => {
                      const rmaSt = o.rmaStatus || o.rmaDetails?.status;
                      const adminNote = o.rmaDetails?.adminNote;

                      // TRƯỜNG HỢP 1: TỪ CHỐI
                      if (rmaSt === 'rejected') return (
                        <div className="mb-6 p-5 bg-red-50 border border-red-100 rounded-2xl">
                            <div className="flex gap-3 items-start text-red-800 mb-4">
                                <XCircle size={24} className="mt-0.5 shrink-0"/>
                                <div>
                                    <h4 className="font-bold text-base">Yêu cầu đổi trả bị từ chối</h4>
                                    <p className="text-sm mt-1 opacity-90">Lý do từ Shop: <span className="font-medium italic">"{adminNote || 'Không đủ điều kiện'}"</span></p>
                                </div>
                            </div>
                              
                            <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Bạn cần hỗ trợ thêm? Liên hệ ngay:</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <ContactBtn icon={PhoneCall} label="Hotline" sub="0937088329" color="text-green-600 bg-green-50" href="tel:0937088329"/>
                                    <ContactBtn icon={Facebook} label="Facebook" sub="Chat ngay" color="text-blue-600 bg-blue-50" href="https://m.me/yourpage"/>
                                    <ContactBtn icon={Smartphone} label="Zalo" sub="0937088329" color="text-blue-500 bg-blue-50" href="https://zalo.me/0937088329"/>
                                    <ContactBtn icon={Mail} label="Email" sub="Gửi mail" color="text-gray-600 bg-gray-50" href="mailto:support@shop.com"/>
                                </div>
                            </div>
                        </div>
                      );

                      // TRƯỜNG HỢP 2: ĐỒNG Ý (Cần đóng gói)
                      if (['approved', 'picking'].includes(rmaSt)) return (
                          <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex gap-3 items-start text-indigo-900">
                              <Package size={20} className="mt-0.5 shrink-0"/>
                              <div>
                                  <strong>Yêu cầu đã được duyệt!</strong>
                                  <ul className="list-disc pl-4 mt-2 text-sm space-y-1 opacity-90">
                                      <li>Vui lòng đóng gói sản phẩm cẩn thận vào hộp.</li>
                                      <li>Ghi mã đơn hàng <b>#{String(o.code).slice(-6)}</b> bên ngoài kiện hàng.</li>
                                      <li>Shipper sẽ liên hệ bạn để lấy hàng trong 24h tới.</li>
                                  </ul>
                              </div>
                          </div>
                      );

                      return null;
                  })()}

                  {(() => {
                      const rma = o.rmaDetails || {}; // Lấy thông tin RMA
                      const status = rma.status || o.rmaStatus; // Lấy trạng thái

                      // NẾU CÓ TRẠNG THÁI RMA -> HIỂN THỊ THÔNG BÁO
                      if (status === 'requested') return (
                          <div className="mb-6 p-4 bg-blue-50 text-blue-800 text-sm rounded-xl flex gap-3 items-start border border-blue-100">
                              <Clock size={18} className="mt-0.5 shrink-0"/>
                              <div><strong>Yêu cầu đổi trả đã gửi!</strong><p className="opacity-90">Vui lòng chờ Shop xét duyệt.</p></div>
                          </div>
                      );
                      if (['picked', 'returned_to_warehouse'].includes(status)) return (
                          <div className="mb-6 p-4 bg-orange-50 text-orange-800 text-sm rounded-xl flex gap-3 items-start border border-orange-100">
                              <Package size={18} className="mt-0.5 shrink-0"/>
                              <div><strong>Shop đang kiểm tra hàng hoàn.</strong><p className="opacity-90">Tiền sẽ được hoàn lại sau khi kiểm tra xong.</p></div>
                          </div>
                      );
                      if (['processed', 'refunded'].includes(status) || o.status === 'refunded') return (
                          <div className="mb-6 p-4 bg-green-50 text-green-800 text-sm rounded-xl border border-green-100">
                              <div className="flex gap-2 items-start">
                                  <CheckCircle size={18} className="mt-0.5 shrink-0"/>
                                  <div><strong>Hoàn tiền thành công!</strong><p>Giao dịch đã hoàn tất.</p></div>
                              </div>
                              {/* Ảnh UNC */}
                              {rma.refundProof && (
                                  <div className="mt-3 pt-3 border-t border-green-200">
                                      <p className="text-xs font-bold mb-1">Bằng chứng chuyển khoản:</p>
                                      <img src={getImageUrl(rma.refundProof)} className="h-24 rounded border cursor-pointer hover:scale-105 transition" onClick={()=>window.open(getImageUrl(rma.refundProof))}/>
                                  </div>
                              )}
                          </div>
                      );
                      return null; // Không có RMA thì không hiện gì
                  })()}

                  {display.showGuide && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3 text-sm text-blue-800">
                      <div className="bg-white p-2 rounded-full shadow-sm"><Truck className="w-5 h-5 text-blue-600" /></div>
                      <div>
                        <strong className="block text-base mb-1">Yêu cầu đổi trả đã được duyệt!</strong>
                        <p className="opacity-90">Vui lòng đóng gói sản phẩm cẩn thận. Shipper sẽ liên hệ bạn trong 1-2 ngày tới để thu hồi hàng hoàn.</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
                    {(o.items || []).map((i, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-gray-500 font-bold w-8">x{i.quantity || i.qty}</span>
                          <span className="font-medium text-gray-800 line-clamp-1">{i.title}</span>
                        </div>
                        <span className="font-medium">
                            {money((Number(i.price) || Number(i.unitPrice) || 0) * (i.qty || 1))}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap justify-end gap-3">
                    {display.showPayBtn && (
                      <button onClick={() => { setPayOrder(o); setPayOpen(true); }} className="btn bg-violet-600 text-white hover:bg-violet-700 px-4 py-2 rounded-lg font-medium shadow-sm shadow-violet-200">
                        Thanh toán ngay
                      </button>
                    )}

                    {['pending', 'confirmed'].includes(o.status) && (
                      <button onClick={() => { setCancelOrderId(o._id); setCancelOpen(true); }} className="btn border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium">
                        Huỷ đơn
                      </button>
                    )}

                    {/* NÚT XÁC NHẬN NHẬN HÀNG */}
                    {display.showConfirmBtn && (
                      <button 
                        onClick={() => setConfirmModal({ orderId: o._id })} 
                        className="btn bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 px-5 py-2 rounded-lg font-bold shadow-lg shadow-emerald-200 animate-pulse"
                      >
                        <CheckCircle size={18} /> Đã nhận được hàng
                      </button>
                    )}

                    {/* Nếu ĐÃ yêu cầu -> Hiện trạng thái text (Không cho bấm nữa) */}
                    {(() => {
                        // Chỉ hiện cho đơn đã hoàn thành (hoặc đang trong quy trình RMA)
                        if (o.status !== 'completed' && !o.rmaStatus && !o.rmaDetails) return null;

                        const rma = o.rmaDetails || {};
                        const status = rma.status || o.rmaStatus;

                        // CASE 1: Chưa từng yêu cầu -> Hiện nút Đổi Trả
                        if (!status && o.status === 'completed') {
                          const completedDate = new Date(o.completedAt || o.updatedAt);
                          const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
                          const isExpired = completedDate < threeDaysAgo;
                          if (isExpired) return null;
                            return (
                                <button onClick={() => openRMADialog(o)} className="btn border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95">
                                    <RefreshCcw size={16}/> Đổi / Trả
                                </button>
                            );
                        }

                        // CASE 2: Đang chờ duyệt
                        if (status === 'requested') {
                            return (
                                <span className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold flex items-center gap-2 border border-blue-100 cursor-help" title="Đang chờ Shop phản hồi">
                                    <Clock size={16}/> Đang chờ duyệt
                                </span>
                            );
                        }

                        // CASE 3: Đã duyệt (Hiện nút xem hướng dẫn)
                        if (['approved', 'picking'].includes(status)) {
                            return (
                                <button className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-200 transition animate-pulse">
                                    <Package size={16}/> Chờ lấy hàng
                                </button>
                            );
                        }

                        // CASE 4: Đã lấy hàng / Đang kiểm tra
                        if (['picked', 'returned_to_warehouse'].includes(status)) {
                            return (
                                <span className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg font-bold flex items-center gap-2 border border-orange-200">
                                    <RefreshCw size={16} className="animate-spin-slow"/> Đang kiểm hàng
                                </span>
                            );
                        }

                        // CASE 5: Hoàn tất
                        if (['processed', 'refunded'].includes(status) || o.status === 'refunded') {
                            return (
                                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-bold flex items-center gap-2 border border-green-200">
                                    <CheckCircle size={16}/> Hoàn tất
                                </span>
                            );
                        }

                        // CASE 6: Bị từ chối -> Cho phép gửi lại hoặc xem lý do
                        if (status === 'rejected') {
                            return (
                                <div className="flex gap-2">
                                    <span className="px-3 py-2 bg-gray-100 text-gray-500 rounded-lg font-medium text-xs flex items-center gap-1 border border-gray-200" title={rma.adminNote}>
                                        <XCircle size={14}/> Bị từ chối
                                    </span>
                                    {/* Cho phép gửi lại yêu cầu */}
                                    <button onClick={() => openRMADialog(o)} className="btn border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-1">
                                        <RefreshCcw size={14}/> Gửi lại
                                    </button>
                                </div>
                            );
                        }

                        return null;
                    })()}
                    
                    <Link to="/categories" className="btn border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium">Mua lại</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* --- MODALS SECTION --- */}

      {/* 1. Confirm Received Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submitting && setConfirmModal(null)}></div>
            <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 p-6 text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Xác nhận đã nhận hàng?</h3>
                <p className="text-gray-500 text-sm mb-6">
                    Bằng việc xác nhận, bạn đồng ý rằng đã nhận đủ hàng và sản phẩm không có vấn đề gì. Hệ thống sẽ hoàn tất đơn hàng.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setConfirmModal(null)}
                        disabled={submitting}
                        className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                    >
                        Để sau
                    </button>
                    <button 
                        onClick={submitConfirmReceived}
                        disabled={submitting}
                        className="flex-1 py-2.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg shadow-green-200"
                    >
                        {submitting ? 'Đang xử lý...' : 'Xác nhận ngay'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 2. Cancel Modal */}
      {cancelOpen && (
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/40" onClick={() => !submitting && setCancelOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
              <div className="px-5 pt-5">
                <h2 className="text-lg font-semibold">Gửi yêu cầu huỷ</h2>
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
                  {submitting ? 'Đang gửi…' : 'Xác nhận huỷ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. RMA Modal */}
      {rmaOpen && rmaOrder && (
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/40" onClick={closeRMADialog} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5 flex flex-col max-h-[90vh]">
              <div className="flex-shrink-0 px-5 pt-5">
                <h2 className="text-xl font-semibold text-red-600">Yêu cầu Đổi / Trả hàng</h2>
                <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded text-sm text-red-800 flex gap-2">
                  <AlertTriangle size={18} className="shrink-0" />
                  <p>Bạn đang yêu cầu trả hàng cho đơn hàng <b>#{String(rmaOrder.code || rmaOrder._id).slice(-6)}</b>.</p>
                </div>
              </div>

              <form id="rmaForm" onSubmit={(e) => { e.preventDefault(); submitRMA(); }} className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Products */}
                <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
                  <p className="text-xs font-bold text-gray-500 uppercase">Sản phẩm:</p>
                  {(rmaOrder.items || []).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.title}</span>
                      <span className="font-mono text-gray-600">x{item.qty}</span>
                    </div>
                  ))}
                </div>

                {/* Reasons */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lý do <span className="text-red-500">*</span></label>
                  <div className="space-y-2">
                    {RMA_REASONS.map(r => (
                      <label key={r.key} className="flex items-center gap-3 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                        <input type="radio" name="rma_reason" className="accent-red-600" checked={rmaReasonKey === r.key} onChange={() => setRmaReasonKey(r.key)} />
                        <span className="text-sm text-gray-800">{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hình ảnh minh chứng</label>
                  <div className="flex border-b mb-2 mt-1">
                    <TabButton label="Tải lên" active={rmaImageTab === 'upload'} onClick={() => setRmaImageTab('upload')} />
                    <TabButton label="Link URL" active={rmaImageTab === 'url'} onClick={() => setRmaImageTab('url')} />
                  </div>
                  <div className="mt-2">
                    {rmaImageTab === 'upload' && (
                      <div className="compact-uploader">
                        <ImageUploader value={null} onChange={handleImageUpload} />
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

                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="text-sm font-bold text-yellow-800 mb-3 flex items-center gap-2">
                      <CreditCard size={16}/> Thông tin nhận tiền hoàn
                  </h4>
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs font-bold text-gray-600 block mb-1">Tên Ngân hàng</label>
                          <input 
                              className="input w-full text-sm" 
                              placeholder="VD: MB Bank, Vietcombank..." 
                              value={rmaBank.bankName} 
                              onChange={e => setRmaBank({...rmaBank, bankName: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="text-xs font-bold text-gray-600 block mb-1">Số tài khoản</label>
                              <input 
                                  className="input w-full text-sm" 
                                  placeholder="VD: 0123456789" 
                                  value={rmaBank.accountNo} 
                                  onChange={e => setRmaBank({...rmaBank, accountNo: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-gray-600 block mb-1">Tên chủ thẻ (Không dấu)</label>
                              <input 
                                  className="input w-full text-sm uppercase" 
                                  placeholder="NGUYEN VAN A" 
                                  value={rmaBank.accountName} 
                                  onChange={e => setRmaBank({...rmaBank, accountName: e.target.value})}
                              />
                          </div>
                      </div>
                  </div>
              </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ghi chú thêm</label>
                  <textarea className="mt-1 w-full input min-h-[70px]" placeholder="Mô tả chi tiết lỗi..." value={rmaNote} onChange={(e) => setRmaNote(e.target.value)} />
                </div>
              </form>

              <div className="flex-shrink-0 px-5 pb-5 flex items-center justify-end gap-3 border-t pt-4">
                <button className="btn bg-gray-100 hover:bg-gray-200" onClick={closeRMADialog} disabled={submitting}>Hủy bỏ</button>
                <button type="submit" form="rmaForm" className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-60" disabled={submitting || !rmaReasonKey}>
                  {submitting ? 'Đang gửi…' : 'Gửi yêu cầu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Payment Modal */}
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
                 <button onClick={() => proceedToPay('bank')} className="w-full p-4 border rounded-xl flex items-center gap-3 hover:bg-blue-50 hover:border-blue-200 transition">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><CreditCard size={20} /></div>
                    <div className="text-left"><div className="font-semibold text-gray-900">Chuyển khoản Ngân hàng</div><div className="text-xs text-gray-500">Quét mã QR, duyệt nhanh</div></div>
                 </button>
                 <button onClick={() => proceedToPay('momo')} className="w-full p-4 border rounded-xl flex items-center gap-3 hover:bg-pink-50 hover:border-pink-200 transition">
                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600"><Smartphone size={20} /></div>
                    <div className="text-left"><div className="font-semibold text-gray-900">Ví Momo / VNPAY</div><div className="text-xs text-gray-500">Cổng thanh toán điện tử</div></div>
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {totalPages > 1 && (
          <div className="flex justify-center mt-10 mb-8">
              <nav className="inline-flex items-center gap-1 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
                  {/* Nút Trước */}
                  <button 
                      disabled={page === 1} 
                      onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} // Thêm scroll
                      className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Trang trước"
                  >
                      <ChevronLeft size={20} />
                  </button>
                  
                  {/* Danh sách trang */}
                  <div className="flex items-center gap-1 px-2 border-x border-gray-100">
                      {[...Array(totalPages)].map((_, i) => {
                          const pNum = i + 1;
                          const isActive = page === pNum;
                          
                          // Logic hiển thị thông minh (nếu quá nhiều trang)
                          // Chỉ hiện trang đầu, cuối, trang hiện tại và lân cận
                          if (totalPages > 7 && Math.abs(page - pNum) > 2 && pNum !== 1 && pNum !== totalPages) {
                              if (Math.abs(page - pNum) === 3) return <span key={i} className="text-gray-300 text-xs px-1">•••</span>;
                              return null;
                          }

                          return (
                              <button
                                  key={i}
                                  onClick={() => { setPage(pNum); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                  className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all duration-200 ${
                                      isActive 
                                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105' 
                                      : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'
                                  }`}
                              >
                                  {pNum}
                              </button>
                          );
                      })}
                  </div>

                  {/* Nút Sau */}
                  <button 
                      disabled={page === totalPages} 
                      onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Trang sau"
                  >
                      <ChevronRight size={20} />
                  </button>
              </nav>
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
// Component nút liên hệ nhỏ
const ContactBtn = ({ icon: Icon, label, sub, color, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className={`flex flex-col items-center justify-center p-2 rounded-lg border border-transparent hover:border-gray-200 transition ${color} bg-opacity-50 hover:bg-opacity-100`}>
        <Icon size={20} className="mb-1"/>
        <span className="text-xs font-bold">{label}</span>
        <span className="text-[10px] opacity-80">{sub}</span>
    </a>
);