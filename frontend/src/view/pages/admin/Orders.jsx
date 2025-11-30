import React, { useEffect, useState } from 'react';
import { Eye, RefreshCw, Trash2, X, User, MapPin, CreditCard, Check, Ban, UserPlus, Truck, Phone, Package } from 'lucide-react';
import { listShippers, assignShipper } from '@/services/admin';
import api, { getImageUrl } from '@/services/api';
import { useUI } from '@/store/useUI';
import AddNote from './AddNote';

// --- CÁC HÀM TIỆN ÍCH ---
const fmtMoney = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n || 0));

const normalizeStatus = (s) =>
  ({ canceled: 'cancelled', shipped: 'shipping' }[s] || s);

const badge = (s) => ({
  pending: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  processing: 'text-blue-700 bg-blue-50 border-blue-200',
  shipping: 'text-purple-700 bg-purple-50 border-purple-200',
  delivered: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  completed: 'text-green-700 bg-green-100 border-green-200',
  cancel_requested: 'text-amber-700 bg-amber-50 border-amber-200',
  cancelled: 'text-gray-600 bg-gray-100 border-gray-200',
  refunded: 'text-orange-700 bg-orange-50 border-orange-200',
  ready_to_pick: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  delivery_failed: 'text-orange-700 bg-orange-50 border-orange-200',
  returned: 'text-red-700 bg-red-50 border-red-200',
}[s] || 'text-gray-600 bg-gray-100 border-gray-200');

const t = (s) => ({
    pending: 'Chờ duyệt', 
    processing: 'Đang đóng gói', 
    ready_to_pick: 'Chờ lấy',
    delivery_failed: 'Giao thất bại',
    returned: 'Hoàn về kho',
    shipping: 'Đang giao hàng',
    delivered: 'Shipper đã giao',
    completed: 'Hoàn thành', 
    cancel_requested: 'Khách yêu cầu huỷ', 
    cancelled: 'Đã huỷ', 
    refunded: 'Đã hoàn tiền',
    paid: 'Đã thanh toán', 
    unpaid: 'Chưa thanh toán'

  }[s] || s);

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

const nextStatus = (s) =>
  ({ pending: 'processing', processing: 'shipping', shipping: 'delivered' }[s] || null);

const getPay = (o) =>
  (o.payment?.status || o.paymentStatus || (o.paid ? 'paid' : 'unpaid'))?.toLowerCase();

export default function Orders() {
  const { showToast } = useUI();
  const [orders, setOrders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Modal TỪ CHỐI huỷ
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState(null);
  const [rejectReasonKey, setRejectReasonKey] = useState('');
  const [rejectReasonOther, setRejectReasonOther] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Confirm dialog
  const [confirm, setConfirm] = useState({ 
      open: false, 
      title: '', 
      message: null, 
      confirmText: 'Xác nhận', 
      cancelText: 'Bỏ qua',
      tone: 'default', 
      onConfirm: null 
  });

  const openConfirm = (cfg) => {
    setConfirm({
      open: true,
      title: cfg.title || 'Xác nhận',
      message: cfg.message || 'Bạn có chắc chắn?',
      confirmText: cfg.confirmText || 'Xác nhận',
      cancelText: cfg.cancelText || 'Bỏ qua',
      tone: cfg.tone || 'default',
      onConfirm: cfg.onConfirm
    });
  };
  const closeConfirm = () => setConfirm((s) => ({ ...s, open: false }));

  const REJECT_REASONS = [
    { key: 'already_shipped', label: 'Đơn đã bàn giao cho đơn vị vận chuyển' },
    { key: 'packed',          label: 'Đơn đã được đóng gói' },
    { key: 'other',           label: 'Khác (ghi rõ)' },
  ];

  const loadOrders = async () => {
    try {
      const r = await api.get('/admin/orders').catch(() => api.get('/orders'));
      setOrders(r.items || r);
    } catch (e) {
      console.error('orders error', e);
      setOrders([]);
    }
  };
  useEffect(() => { loadOrders(); }, []);

  const [assignModal, setAssignModal] = useState(null); // State modal gán đơn { orderId: ... }
  const [shippers, setShippers] = useState([]); // Danh sách shipper

  // Load danh sách shipper khi mở modal
  const openAssignModal = async (order) => {
      try {
          const res = await listShippers(); // API lấy user role=shipper
          setShippers(res.items || res || []); 
          setAssignModal(order);
      } catch (e) { alert("Lỗi tải danh sách shipper"); }
  };

  const handleAssign = async (shipperId) => {
      if (!assignModal) return;
      try {
          await assignShipper(assignModal._id, shipperId);
          showToast({ type: 'success', title: 'Đã gán shipper thành công' });
          setAssignModal(null);
          loadOrders(); // Reload lại bảng đơn hàng
      } catch (e) { alert(e.message); }
  };

  // --- ACTIONS ---

  const stepToNext = async (order) => {
    const st = normalizeStatus(order.status);
    const next = nextStatus(st);
    
    // LOGIC MỚI: Nếu bước tiếp theo là 'shipping' (tức là đang ở 'processing'),
    // thì KHÔNG gọi API ngay mà MỞ MODAL GÁN SHIPPER
    if (next === 'shipping' || st === 'processing') {
        openAssignModal(order); // Hàm này bạn đã có sẵn trong file gốc
        return;
    }

    if (!next) return;

    try {
      if (next === 'processing') await api.post(`/admin/orders/${order._id}/processing`);
      // Các logic khác giữ nguyên...
      else if (next === 'delivered') { /* ... code cũ ... */ }
      
      await loadOrders();
    } catch (e) {
      showToast({ type: 'error', title: 'Thất bại', msg: e?.message });
    }
  };

  const setPaymentAndMaybeAdvance = async (order, status) => {
    try {
      await api.patch(`/admin/orders/${order._id}/payment`, { status });
      if (status === 'paid' && normalizeStatus(order.status) === 'pending') {
        await api.post(`/admin/orders/${order._id}/processing`);
      }
      showToast({ type: 'success', title: 'Đã cập nhật thanh toán' });
      await loadOrders();
    } catch (e) {
      showToast({ type: 'error', title: 'Lỗi', msg: e?.message });
    }
  };

  const addOrderNote = async (orderId, text) => {
    if (!text?.trim()) return;
    try { await api.post(`/admin/orders/${orderId}/notes`, { text }); await loadOrders(); } catch {}
  };

  const approveCancelOrder = async (id) => {
    try { await api.post(`/admin/orders/${id}/cancel/approve`); showToast({ type: 'success', title: 'Đã duyệt huỷ đơn' }); await loadOrders(); } catch (e) { showToast({ type: 'error', title: 'Lỗi', msg: e?.message }); }
  };

  const performDeleteOrder = async (id) => {
    try { await api.delete(`/admin/orders/${id}`); showToast({ type: 'success', title: 'Đã xoá đơn' }); await loadOrders(); } catch (e) { showToast({ type: 'error', title: 'Xoá thất bại', msg: e?.message }); }
  };

  const canSubmitReject = () => (rejectReasonKey === 'other' ? rejectReasonOther.trim().length > 0 : !!rejectReasonKey);
  const submitReject = async () => {
    if (!rejectOrderId || !canSubmitReject()) return;
    const picked = REJECT_REASONS.find((r) => r.key === rejectReasonKey);
    const finalReason = rejectReasonKey === 'other' ? (rejectReasonOther || '').trim() : (picked?.label || '');
    setSubmittingReject(true);
    try {
      await api.post(`/admin/orders/${rejectOrderId}/cancel/reject`, { reason: finalReason });
      showToast({ type: 'success', title: 'Đã từ chối yêu cầu huỷ' });
      setRejectOpen(false); setRejectOrderId(null); await loadOrders();
    } catch (e) { showToast({ type: 'error', title: 'Lỗi', msg: e?.message }); } finally { setSubmittingReject(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
              <tr>
                <th className="px-6 py-3">Đơn hàng</th>
                <th className="px-6 py-3">Khách hàng</th>
                <th className="px-6 py-3">Tổng tiền</th>
                <th className="px-6 py-3">Trạng thái</th>
                <th className="px-6 py-3">Thanh toán</th>
                <th className="px-6 py-3">Ngày đặt</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((o) => {
                const total = o.total?.grand ?? o.total ?? 0;
                const payStatus = getPay(o);
                const st = normalizeStatus(o.status);
                const nxt = nextStatus(st);
                
                // Nút Next: Có thể bấm nếu có trạng thái tiếp theo (trừ delivered)
                const canAdvance = !!nxt;
                const canDelete = ['cancelled', 'completed'].includes(st);
                const canTogglePay = payStatus !== 'refunded';

                return (
                  <tr key={o._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-blue-600">
                      #{String(o.code || o._id).slice(-6)}
                      <div className="text-xs text-gray-400 font-normal mt-0.5">{o.items?.length} sản phẩm</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{o.shippingAddress?.receiver || o.customer?.name || 'Khách lẻ'}</div>
                      <div className="text-xs text-gray-500">{o.shippingAddress?.phone || o.customer?.email}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{fmtMoney(total)}</td>
                    
                    {/* Cột Trạng thái (Nút bấm được) */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => canAdvance && openConfirm({
                           title: `Chuyển trạng thái`,
                           message: `Xác nhận chuyển đơn hàng sang "${t(nxt)}"?`,
                           confirmText: 'Chuyển ngay',
                           onConfirm: () => stepToNext(o)
                        })}
                        disabled={!canAdvance}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition ${badge(st)} ${canAdvance ? 'hover:opacity-80 cursor-pointer' : ''}`}
                        title={canAdvance ? `Bấm để chuyển sang: ${t(nxt)}` : ''}
                      >
                        {t(st)}
                      </button>
                    </td>

                    {/* Cột Thanh toán (Nút bấm được) */}
                    <td className="px-6 py-4">
                       <button
                        onClick={() => canTogglePay && openConfirm({
                            title: 'Cập nhật thanh toán',
                            message: `Đánh dấu đơn này là ${payStatus === 'paid' ? 'CHƯA' : 'ĐÃ'} thanh toán?`,
                            confirmText: payStatus === 'paid' ? 'Đánh dấu Chưa trả' : 'Xác nhận Đã trả',
                            onConfirm: () => setPaymentAndMaybeAdvance(o, payStatus === 'paid' ? 'unpaid' : 'paid')
                        })}
                        disabled={!canTogglePay}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition ${
                          payStatus === 'paid' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 
                          payStatus === 'refunded' ? 'bg-orange-50 text-orange-700 border-orange-200 opacity-70 cursor-not-allowed' : 
                          'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 cursor-pointer'
                        }`}
                        title={payStatus === 'refunded' ? 'Đã hoàn – không thể đổi' : 'Bấm để đổi trạng thái'}
                       >
                         {t(payStatus)}
                       </button>
                    </td>

                    <td className="px-6 py-4 text-gray-500">{new Date(o.createdAt).toLocaleDateString('vi-VN')}</td>
                    
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                          
                          {/* --- CÁC NÚT ĐIỀU KHIỂN CHÍNH (ĐÃ SỬA VỊ TRÍ) --- */}
                          
                          {/* 1. Pending -> Processing (Duyệt) */}
                          {st === 'pending' && (
                              <button onClick={() => stepToNext(o)} className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100" title="Duyệt đơn">
                                  <Check size={18}/>
                              </button>
                          )}
                          
                          {/* 2. Processing -> Ready (Gán Shipper) */}
                          {st === 'processing' && (
                              <button onClick={() => openAssignModal(o)} className="p-1.5 text-purple-600 bg-purple-50 rounded hover:bg-purple-100" title="Gán Shipper">
                                  <UserPlus size={18}/>
                              </button>
                          )}

                          {/* 3. Shipping (Thông tin Shipper) */}
                          {['ready_to_pick', 'shipping'].includes(st) && o.shipping?.shipperId && (
                              <div className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded text-gray-600" title="Đã gán shipper">
                                  <Truck size={14}/> 
                                  <span className="max-w-[80px] truncate">{o.shipping.shipperId.name || 'Shipper'}</span>
                              </div>
                          )}
                        
                        {/* Nút Xem Chi Tiết */}
                        <button onClick={() => { setSelectedOrder(o); setShowModal(true); }} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"><Eye size={18} /></button>
                        
                        {/* Nút Duyệt Huỷ */}
                        {st === 'cancel_requested' && (
                           <>
                             <button onClick={() => approveCancelOrder(o._id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check size={18}/></button>
                             <button onClick={() => { setRejectOrderId(o._id); setRejectOpen(true); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Ban size={18}/></button>
                           </>
                        )}
                        
                        {/* Nút Xoá */}
                        {canDelete && (
                           <button onClick={() => openConfirm({ title: 'Xoá đơn', message: 'Chắc chắn xoá?', tone: 'danger', onConfirm: () => performDeleteOrder(o._id) })} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
                        )}

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CHI TIẾT ĐƠN HÀNG */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${badge(normalizeStatus(selectedOrder.status))}`}>
                  <Package size={24}/>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Đơn hàng #{String(selectedOrder.code || selectedOrder._id).slice(-6)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    Ngày đặt: {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
                  
                  {/* CỘT TRÁI (Thông tin Giao nhận) */}
                  <div className="md:col-span-4 space-y-4">
                      {/* 1. Thông tin Khách hàng */}
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500">
                              <User size={14}/> Người nhận
                          </h4>
                          <div className="space-y-1">
                              <p className="font-bold text-base text-gray-900">{selectedOrder.shippingAddress?.receiver || 'N/A'}</p>
                              <a href={`tel:${selectedOrder.shippingAddress?.phone}`} className="text-blue-600 font-medium hover:underline text-sm flex items-center gap-1">
                                  <Phone size={12}/> {selectedOrder.shippingAddress?.phone}
                              </a>
                              <p className="text-gray-500 text-sm mt-2 pt-2 border-t border-gray-200 leading-relaxed flex gap-2 items-start">
                                  <MapPin size={14} className="shrink-0 mt-0.5"/> 
                                  {selectedOrder.shippingAddress?.detail}, {selectedOrder.shippingAddress?.ward}, {selectedOrder.shippingAddress?.district}, {selectedOrder.shippingAddress?.province}
                              </p>
                          </div>
                      </div>

                      {/* 2. THÔNG TIN SHIPPER (ĐÃ SỬA LỖI HIỂN THỊ) */}
                      {selectedOrder.shipping?.shipperId ? (
                          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 relative overflow-hidden group">
                              {/* Background Icon */}
                              <Truck size={80} className="absolute -right-4 -bottom-4 text-indigo-100 opacity-50 group-hover:scale-110 transition-transform"/>
                              
                              <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2 text-xs uppercase tracking-wider relative z-10">
                                  <Truck size={14}/> Đơn vị vận chuyển
                              </h4>
                              
                              <div className="flex items-center gap-3 relative z-10">
                                  {/* Avatar Shipper - Có fallback chữ cái đầu */}
                                  <div className="w-10 h-10 rounded-full bg-white border-2 border-indigo-200 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                                      {selectedOrder.shipping.shipperId.avatarUrl ? (
                                          <img 
                                            src={getImageUrl(selectedOrder.shipping.shipperId.avatarUrl)} 
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} 
                                            alt="Shipper"
                                          />
                                      ) : (
                                          <span className="font-bold text-indigo-600 text-sm">
                                            {(selectedOrder.shipping.shipperId.name || 'S')[0].toUpperCase()}
                                          </span>
                                      )}
                                  </div>
                                  
                                  <div className="min-w-0">
                                      <p className="font-bold text-gray-900 text-sm truncate" title={selectedOrder.shipping.shipperId.name}>
                                        {selectedOrder.shipping.shipperId.name}
                                      </p>
                                      <a href={`tel:${selectedOrder.shipping.shipperId.phone}`} className="text-xs text-indigo-700 font-medium hover:underline block">
                                          {selectedOrder.shipping.shipperId.phone}
                                      </a>
                                  </div>
                              </div>

                              <div className="mt-3 pt-2 border-t border-indigo-200/50 text-[10px] text-indigo-800 font-medium relative z-10 flex justify-between">
                                  <span>Đã gán đơn:</span>
                                  <span>{selectedOrder.shipping.assignedAt ? new Date(selectedOrder.shipping.assignedAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--'}</span>
                              </div>
                          </div>
                      ) : (
                          // Nếu chưa có shipper -> Hiện thông báo hoặc ẩn đi
                          ['ready_to_pick', 'shipping'].includes(normalizeStatus(selectedOrder.status)) && (
                            <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-center text-orange-700 text-sm">
                                Chưa cập nhật thông tin Shipper
                            </div>
                          )
                      )}
                  </div>

                  {/* CỘT PHẢI (Sản phẩm & Thanh toán) */}
                  <div className="md:col-span-8 space-y-4">
                      
                      {/* Danh sách sản phẩm (ĐÃ SỬA LỖI ẢNH SÁCH) */}
                      <div className="border rounded-xl overflow-hidden shadow-sm">
                          <div className="bg-gray-50 px-4 py-2 border-b text-xs font-bold text-gray-500 uppercase flex justify-between">
                              <span>Sản phẩm</span>
                              <span>Tổng tiền</span>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto">
                              {(selectedOrder.items || []).map((it, i) => (
                                  <div key={i} className="flex justify-between items-center p-4 border-b last:border-0 hover:bg-gray-50 transition">
                                      <div className="flex items-center gap-3">
                                          {/* Ảnh Sách */}
                                          <div className="w-12 h-16 bg-gray-100 rounded border flex items-center justify-center shrink-0 overflow-hidden">
                                              {it.image || it.coverUrl ? (
                                                  <img 
                                                    src={getImageUrl(it.image || it.coverUrl)} 
                                                    className="w-full h-full object-cover" 
                                                    alt={it.title}
                                                    onError={(e) => { e.target.src = 'https://placehold.co/48x64?text=Book'; }}
                                                  />
                                              ) : (
                                                  <Package size={20} className="text-gray-400"/>
                                              )}
                                          </div>
                                          <div>
                                              <p className="font-medium text-gray-900 text-sm line-clamp-2" title={it.title}>{it.title}</p>
                                              <p className="text-xs text-gray-500 mt-0.5">Số lượng: <span className="font-bold text-gray-800">x{it.qty}</span></p>
                                              <p className="text-xs text-gray-400 mt-0.5">Đơn giá: {fmtMoney(it.price || it.unitPrice)}</p>
                                          </div>
                                      </div>
                                      <p className="font-bold text-gray-900 text-sm">{fmtMoney((it.price || it.unitPrice) * it.qty)}</p>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Tổng kết tiền & Thanh toán (Giữ nguyên) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 h-fit">
                              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500">
                                  <CreditCard size={14}/> Thanh toán
                              </h4>
                              <div className="flex justify-between items-center mb-2 text-sm">
                                  <span className="text-gray-600">Phương thức:</span>
                                  <span className="font-bold uppercase bg-white px-2 py-0.5 rounded border text-xs">{selectedOrder.payment?.method || 'COD'}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600">Trạng thái:</span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${badge(getPay(selectedOrder))}`}>
                                      {t(getPay(selectedOrder))}
                                  </span>
                              </div>
                          </div>

                          <div className="p-4 bg-white rounded-xl border border-blue-100 shadow-sm">
                              <div className="space-y-2 text-sm">
                                  <div className="flex justify-between text-gray-600">
                                      <span>Tạm tính:</span>
                                      <span>{fmtMoney(selectedOrder.pricing?.subtotal || selectedOrder.total?.sub)}</span>
                                  </div>
                                  <div className="flex justify-between text-gray-600">
                                      <span>Phí vận chuyển:</span>
                                      <span>{fmtMoney(selectedOrder.shippingFee)}</span>
                                  </div>
                                  {(selectedOrder.pricing?.discount > 0 || selectedOrder.discount > 0) && (
                                      <div className="flex justify-between text-green-600">
                                          <span>Giảm giá:</span>
                                          <span>-{fmtMoney(selectedOrder.pricing?.discount || selectedOrder.discount)}</span>
                                      </div>
                                  )}
                                  <div className="pt-2 mt-2 border-t border-dashed flex justify-between items-center">
                                      <span className="font-bold text-gray-900">Tổng cộng:</span>
                                      <span className="font-bold text-xl text-blue-600">{fmtMoney(selectedOrder.pricing?.grandTotal || selectedOrder.total?.grand)}</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Ghi chú & Lịch sử */}
                      <div className="border rounded-xl p-4 bg-gray-50/50">
                          <h4 className="font-bold text-gray-800 mb-2 text-xs uppercase tracking-wider text-gray-500">Ghi chú & Lịch sử</h4>
                          <AddNote onAdd={(text) => addOrderNote(selectedOrder._id, text)} />
                          <div className="mt-3 space-y-3 pl-3 border-l-2 border-gray-200 max-h-32 overflow-y-auto custom-scrollbar">
                              {(selectedOrder.history || []).map((h, i) => (
                                  <div key={i} className="relative">
                                      <div className="absolute -left-[17px] top-1.5 w-2 h-2 bg-gray-400 rounded-full ring-2 ring-white"></div>
                                      <p className="text-[10px] text-gray-400">{new Date(h.at).toLocaleString('vi-VN')}</p>
                                      <p className="text-xs text-gray-700">
                                          <span className="font-bold capitalize">{h.by}</span>: {h.note || h.type}
                                      </p>
                                  </div>
                              ))}
                          </div>
                      </div>

                  </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end">
              <button onClick={() => setShowModal(false)} className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium shadow-sm transition">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      
      {confirm.open && (
        <div className="fixed inset-0 z-[900]">
          <div className="absolute inset-0 bg-black/40" onClick={closeConfirm} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${confirm.tone === 'danger' ? 'text-red-700' : 'text-gray-900'}`}>
                  {confirm.title}
                </h3>
                <button className="p-2 hover:bg-gray-100 rounded-lg" onClick={closeConfirm}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-5 py-4 text-sm text-gray-700">{confirm.message}</div>
              <div className="px-5 pb-5 flex items-center justify-end gap-3">
                <button className="btn bg-gray-100 hover:bg-gray-200" onClick={closeConfirm}>
                  {confirm.cancelText}
                </button>
                <button
                  className={`btn text-white ${confirm.tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-violet-600 hover:bg-violet-700'}`}
                  onClick={async () => {
                    const fn = confirm.onConfirm;
                    closeConfirm();
                    try { await fn?.(); } catch {}
                  }}
                >
                  {confirm.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal TỪ CHỐI */}
      {rejectOpen && (
        <div className="fixed inset-0 z-[1000]">
           <div className="absolute inset-0 bg-black/40" onClick={() => !submittingReject && setRejectOpen(false)} />
           <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
                <div className="px-5 pt-5">
                    <h2 className="text-lg font-semibold">Từ chối yêu cầu huỷ</h2>
                    <p className="mt-1 text-sm text-gray-600">Chọn lý do để thông báo cho khách hàng.</p>
                </div>
                <div className="px-5 py-4 space-y-2">
                    {REJECT_REASONS.map((r) => (
                        <label key={r.key} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input type="radio" className="mt-1" name="reject_reason" value={r.key} checked={rejectReasonKey === r.key} onChange={() => setRejectReasonKey(r.key)} />
                            <span className="text-sm text-gray-800">{r.label}</span>
                        </label>
                    ))}
                    {rejectReasonKey === 'other' && (
                        <textarea className="mt-1 w-full input min-h-[96px]" placeholder="Nhập lý do khác…" value={rejectReasonOther} onChange={(e) => setRejectReasonOther(e.target.value)} />
                    )}
                </div>
                <div className="px-5 pb-5 flex items-center justify-end gap-3">
                    <button className="btn bg-gray-100 hover:bg-gray-200" onClick={() => setRejectOpen(false)} disabled={submittingReject}>Bỏ qua</button>
                    <button className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-60" onClick={submitReject} disabled={submittingReject || !canSubmitReject()}>
                        {submittingReject ? 'Đang gửi…' : 'Xác nhận từ chối'}
                    </button>
                </div>
            </div>
           </div>
        </div>
      )}

      {assignModal && (
         <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setAssignModal(null)}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                
                {/* Header Modal */}
                <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Chọn Shipper</h3>
                        <p className="text-xs text-gray-500 mt-1">
                           Gán đơn <span className="font-mono font-bold text-blue-600">#{String(assignModal.code || assignModal._id).slice(-6)}</span>
                        </p>
                    </div>
                    <button onClick={() => setAssignModal(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition"><X size={20}/></button>
                </div>

                {/* Body List */}
                <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar bg-gray-50/30">
                    <div className="space-y-1">
                        {shippers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 flex flex-col items-center gap-3">
                                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center"><Truck size={28} className="opacity-30"/></div>
                                <div>
                                    <p className="font-medium">Chưa tìm thấy Shipper nào.</p>
                                    <p className="text-xs mt-1 text-gray-400">Hãy vào trang "Người dùng" để cấp quyền Shipper.</p>
                                </div>
                            </div>
                        ) : (
                            shippers.map(s => (
                                <button 
                                    key={s._id} 
                                    onClick={() => handleAssign(s._id)} 
                                    className="w-full flex items-center gap-4 p-3 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-xl transition-all group text-left"
                                >
                                    {/* Avatar Shipper */}
                                    <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                        {s.avatarUrl || s.avatar ? (
                                            <img src={getImageUrl(s.avatarUrl || s.avatar)} className="w-full h-full object-cover" alt={s.name}/>
                                        ) : (
                                            <span className="font-bold text-gray-500">{s.name?.[0]?.toUpperCase()}</span>
                                        )}
                                    </div>
                                    
                                    {/* Thông tin */}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm text-gray-900 truncate group-hover:text-blue-700">{s.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                            {s.phone && (
                                                <span className="bg-white border px-1.5 py-0.5 rounded flex items-center gap-1 group-hover:border-blue-200 transition">
                                                    <Phone size={10}/> {s.phone}
                                                </span>
                                            )}
                                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Sẵn sàng</span>
                                        </div>
                                    </div>

                                    {/* Nút chọn */}
                                    <div className="p-2 rounded-full bg-gray-100 text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition">
                                        <Check size={16}/>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
                
                {/* Footer */}
                <div className="px-6 py-3 bg-white text-[10px] text-gray-400 text-center border-t uppercase tracking-wide font-medium">
                    Chọn nhân viên để gán đơn ngay
                </div>
            </div>
         </div>
      )}
    </div>
  )
}