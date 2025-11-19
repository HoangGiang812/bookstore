import React, { useEffect, useState } from 'react';
import { Eye, RefreshCw, Trash2, X, User, MapPin, CreditCard, Check, Ban } from 'lucide-react';
import api from '@/services/api';
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
}[s] || 'text-gray-600 bg-gray-100 border-gray-200');

const t = (s) =>
  ({
    pending: 'Chờ xử lý',
    processing: 'Đang xử lý',
    shipping: 'Đang giao',
    delivered: 'Đã giao',
    completed: 'Hoàn thành',
    cancel_requested: 'Chờ duyệt huỷ',
    cancelled: 'Đã huỷ',
    refunded: 'Đã hoàn tiền',
    paid: 'Đã thanh toán',
    unpaid: 'Chưa thanh toán',
  }[s] || s);

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

  // --- ACTIONS ---

  const stepToNext = async (order) => {
    const st = normalizeStatus(order.status);
    const next = nextStatus(st);
    if (!next) return;

    try {
      if (next === 'processing') await api.post(`/admin/orders/${order._id}/processing`);
      else if (next === 'shipping') await api.post(`/admin/orders/${order._id}/shipping`, {});
      else if (next === 'delivered') {
        await api.post(`/admin/orders/${order._id}/delivered`, { deliveredAt: new Date().toISOString() });
        
        // Logic tự động thanh toán COD
        if (order.payment?.method === 'cod' && getPay(order) !== 'paid') {
           await api.patch(`/admin/orders/${order._id}/payment`, { status: 'paid' });
           showToast({ type: 'success', title: 'Đã giao hàng & Đã nhận tiền (COD)' });
        } else {
           showToast({ type: 'success', title: 'Đã chuyển sang Đã giao', duration: 1800 });
        }
      }
      
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
                      <div className="flex items-center justify-end gap-2">
                        
                        {/* 1. Nút Xem Chi Tiết (Luôn hiện) */}
                        <button 
                          onClick={() => { setSelectedOrder(o); setShowModal(true); }} 
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                        
                        {/* 2. Nút Chuyển Trạng Thái (Luôn hiện) */}
                        {st === 'cancel_requested' ? (
                           <div className="flex gap-1">
                             <button onClick={() => approveCancelOrder(o._id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Duyệt huỷ"><Check size={18}/></button>
                             <button onClick={() => { setRejectOrderId(o._id); setRejectOpen(true); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Từ chối"><Ban size={18}/></button>
                           </div>
                        ) : (
                           <button 
                             onClick={() => canAdvance && openConfirm({
                                 title: `Chuyển trạng thái`,
                                 message: `Xác nhận chuyển đơn hàng sang "${t(nxt)}"?`,
                                 confirmText: 'Chuyển ngay',
                                 onConfirm: () => stepToNext(o)
                             })}
                             disabled={!canAdvance}
                             className={`p-1.5 rounded transition ${
                                 canAdvance ? 'text-green-600 hover:bg-green-50 cursor-pointer' : 
                                 'text-gray-200 cursor-not-allowed'
                             }`}
                             title={canAdvance ? `Chuyển sang: ${t(nxt)}` : (st === 'shipping' ? 'Đang giao - Chờ khách xác nhận' : 'Không thể chuyển tiếp')}
                           >
                             <RefreshCw size={18} />
                           </button>
                        )}
                        
                        {/* 3. Nút Xóa Đơn (Luôn hiện) */}
                        <button
                          onClick={() => canDelete && openConfirm({
                              title: `Xoá đơn #${String(o._id).slice(-6)}`,
                              message: 'Hành động này không thể hoàn tác. Bạn chắc chắn muốn xoá vĩnh viễn?',
                              confirmText: 'Xoá vĩnh viễn',
                              tone: 'danger',
                              onConfirm: () => performDeleteOrder(o._id),
                          })}
                          disabled={!canDelete}
                          className={`p-1.5 rounded transition ${
                              canDelete ? 'text-red-500 hover:bg-red-50 cursor-pointer' : 
                              'text-gray-200 cursor-not-allowed'
                          }`}
                          title={canDelete ? "Xoá đơn vĩnh viễn" : "Chỉ xoá được đơn đã huỷ/hoàn tất"}
                        >
                          <Trash2 size={18} />
                        </button>

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
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Chi tiết đơn hàng #{String(selectedOrder.code || selectedOrder._id).slice(-6)}</h3>
                <p className="text-xs text-gray-500 mt-1">Ngày đặt: {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><User size={16}/> Khách hàng</h4>
                  <div className="space-y-1 text-gray-600">
                    <p><span className="font-medium text-gray-900">{selectedOrder.shippingAddress?.receiver || 'N/A'}</span></p>
                    <p>{selectedOrder.shippingAddress?.phone}</p>
                    <p>{selectedOrder.customer?.email}</p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><MapPin size={16}/> Giao tới</h4>
                  <div className="text-gray-600 leading-relaxed">
                    {selectedOrder.shippingAddress?.detail}, {selectedOrder.shippingAddress?.ward}, {selectedOrder.shippingAddress?.district}, {selectedOrder.shippingAddress?.province}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><CreditCard size={16}/> Thanh toán</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phương thức:</span>
                      <span className="font-medium uppercase">{selectedOrder.payment?.method || 'COD'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Trạng thái:</span>
                      <span className={`px-2 py-0.5 rounded text-xs border ${badge(getPay(selectedOrder))}`}>{t(getPay(selectedOrder))}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600 font-medium">
                    <tr>
                      <th className="px-4 py-2 text-left">Sản phẩm</th>
                      <th className="px-4 py-2 text-center">SL</th>
                      <th className="px-4 py-2 text-right">Đơn giá</th>
                      <th className="px-4 py-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(selectedOrder.items || []).map((it, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-gray-900">{it.title}</td>
                        <td className="px-4 py-3 text-center text-gray-600">x{it.qty}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{fmtMoney(it.price || it.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{fmtMoney((it.price || it.unitPrice) * it.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right text-gray-600">Tạm tính:</td>
                      <td className="px-4 py-2 text-right font-medium">{fmtMoney(selectedOrder.pricing?.subtotal || selectedOrder.total?.sub)}</td>
                    </tr>
                    {(selectedOrder.pricing?.discount > 0 || selectedOrder.discount > 0) && (
                      <tr>
                        <td colSpan={3} className="px-4 py-1 text-right text-green-600">
                          Giảm giá {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''}:
                        </td>
                        <td className="px-4 py-1 text-right font-medium text-green-600">
                          -{fmtMoney(selectedOrder.pricing?.discount || selectedOrder.discount)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-right text-gray-600">Phí vận chuyển:</td>
                      <td className="px-4 py-2 text-right font-medium">{fmtMoney(selectedOrder.shippingFee)}</td>
                    </tr>
                    <tr className="text-base">
                      <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-900">Tổng cộng:</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600">{fmtMoney(selectedOrder.pricing?.grandTotal || selectedOrder.total?.grand)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

               <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Ghi chú nội bộ</h4>
                    <AddNote onAdd={(text) => addOrderNote(selectedOrder._id, text)} />
                    <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                      {(selectedOrder.notes || []).map((n, i) => (
                        <div key={i} className="text-xs text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-100">
                          <span className="font-semibold">{n.by}:</span> {n.text} <span className="text-gray-400 ml-2">({new Date(n.ts).toLocaleString('vi-VN')})</span>
                        </div>
                      ))}
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

    </div>
  );
}