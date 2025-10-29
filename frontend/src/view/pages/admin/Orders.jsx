// src/view/pages/admin/Orders.jsx
import React, { useEffect, useState } from 'react';
import { Eye, RefreshCw, X, Trash2 } from 'lucide-react';
import api from '@/services/api';
import { useUI } from '@/store/useUI';
import AddNote from './AddNote';
import RefundBox from './RefundBox';

const fmtMoney = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n || 0));

/** Chuẩn hoá trạng thái (KHÔNG gộp delivered -> completed) */
const normalizeStatus = (s) =>
  ({ canceled: 'cancelled', shipped: 'shipping' }[s] || s);

/** Badge theo trạng thái */
const badge = (s) => ({
  pending: 'text-yellow-600 bg-yellow-100',
  processing: 'text-blue-600 bg-blue-100',
  shipping: 'text-purple-600 bg-purple-100',
  delivered: 'text-emerald-700 bg-emerald-100',
  completed: 'text-green-600 bg-green-100',
  cancel_requested: 'text-amber-700 bg-amber-100',
  cancelled: 'text-red-600 bg-red-100',
  refunded: 'text-orange-600 bg-orange-100',
  paid: 'text-green-600 bg-green-100',
  unpaid: 'text-red-600 bg-red-100',
}[s] || 'text-gray-600 bg-gray-100');

/** Dịch nhãn */
const t = (s) =>
  ({
    pending: 'Chờ xử lý',
    processing: 'Đang xử lý',
    shipping: 'Đang giao',
    delivered: 'Đã giao',
    completed: 'Hoàn thành',
    cancel_requested: 'Chờ duyệt huỷ',
    cancelled: 'Đã huỷ',
    refunded: 'Đã hoàn',
    paid: 'Đã thanh toán',
    unpaid: 'Chưa thanh toán',
  }[s] || s);

/** Tiến trình (Admin dừng ở DELIVERED) */
const nextStatus = (s) =>
  ({ pending: 'processing', processing: 'shipping', shipping: 'delivered' }[s] || null);

/** Pill nhỏ dùng trong dialog */
const StatusPill = (s) => (
  <span className={`px-2 py-1 text-xs rounded-full ${badge(s)}`}>{t(s)}</span>
);

/** Helper lấy trạng thái thanh toán chuẩn */
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

  // ✅ Confirm dialog (thay confirm/alert)
  const [confirm, setConfirm] = useState({
    open: false,
    title: '',
    message: null,
    confirmText: 'Xác nhận',
    cancelText: 'Bỏ qua',
    tone: 'default', // default | danger
    onConfirm: null,
  });
  const openConfirm = (cfg) =>
    setConfirm({
      open: true,
      title: 'Xác nhận',
      message: '',
      confirmText: 'Xác nhận',
      cancelText: 'Bỏ qua',
      tone: 'default',
      onConfirm: null,
      ...(cfg || {}),
    });
  const closeConfirm = () => setConfirm((s) => ({ ...s, open: false }));

  const REJECT_REASONS = [
    { key: 'already_shipped', label: 'Đơn đã bàn giao cho đơn vị vận chuyển' },
    { key: 'packed',          label: 'Đơn đã được đóng gói, không thể huỷ' },
    { key: 'over_time',       label: 'Vượt thời gian cho phép huỷ' },
    { key: 'custom_made',     label: 'Sản phẩm đặt theo yêu cầu/không hỗ trợ huỷ' },
    { key: 'payment_locked',  label: 'Thanh toán đã xác nhận/đang quyết toán' },
    { key: 'other',           label: 'Khác (ghi rõ)' },
  ];

  /** ===== LOAD & TỰ SỬA QUY TẮC ===== */
  const loadOrders = async () => {
    try {
      let r;
      try { r = await api.get('/admin/orders'); }
      catch { r = await api.get('/orders'); } // fallback cũ
      const arr = r.items || r;
      setOrders(arr);

      // Auto-fix: completed -> payment paid
      const toFix = (arr || []).filter(
        (o) => normalizeStatus(o.status) === 'completed' &&
               !['paid', 'refunded'].includes(getPay(o))
      );
      if (toFix.length) {
        for (const o of toFix) {
          await setPaymentAndMaybeAdvance(o, 'paid', { silent: true, reload: false });
        }
        // reload 1 lần sau khi auto-fix xong
        try {
          let r2;
          try { r2 = await api.get('/admin/orders'); }
          catch { r2 = await api.get('/orders'); }
          setOrders(r2.items || r2);
        } catch {}
      }
    } catch (e) {
      console.error('orders error', e);
      setOrders([]);
    }
  };
  useEffect(() => { loadOrders(); }, []);

  /** ===== CHUYỂN TRẠNG THÁI ĐƠN ===== */
  const stepToNext = async (order) => {
    const st = normalizeStatus(order.status);
    const next = nextStatus(st);
    if (!next) return;

    try {
      if (next === 'processing') {
        try { await api.post(`/admin/orders/${order._id}/processing`); }
        catch { await api.patch(`/admin/orders/${order._id}/status`, { status: 'processing' }); }
        showToast({ type: 'success', title: 'Đã chuyển ĐANG XỬ LÝ', duration: 1800 });
      } else if (next === 'shipping') {
        try { await api.post(`/admin/orders/${order._id}/shipping`, {}); }
        catch { await api.patch(`/admin/orders/${order._id}/status`, { status: 'shipping' }); }
        showToast({ type: 'success', title: 'Đã chuyển ĐANG GIAO', duration: 1800 });
      } else if (next === 'delivered') {
        const deliveredAt = new Date().toISOString();
        try { await api.post(`/admin/orders/${order._id}/delivered`, { deliveredAt }); }
        catch { await api.patch(`/admin/orders/${order._id}/status`, { status: 'delivered', deliveredAt }); }
        showToast({ type: 'success', title: 'Đã chuyển ĐÃ GIAO', duration: 1800 });
      }
      await loadOrders();
    } catch (e) {
      showToast({ type: 'error', title: 'Chuyển trạng thái thất bại', msg: e?.message, duration: 2800 });
    }
  };

  const handleClickStatus = async (order) => {
    const st = normalizeStatus(order.status);
    if (['cancel_requested', 'cancelled', 'completed'].includes(st)) return;
    const nxt = nextStatus(st);
    if (!nxt) {
      showToast({
        type: 'info',
        title: 'Không có bước kế tiếp',
        msg: st === 'delivered' ? 'KH xác nhận “Đã nhận hàng” ở trang người dùng để hoàn tất.' : '',
        duration: 2400,
      });
      return;
    }

    openConfirm({
      title: 'Chuyển trạng thái đơn hàng',
      message: (
        <div className="text-sm">
          <div className="mb-2">Bạn có chắc muốn chuyển trạng thái:</div>
          <div className="flex items-center gap-2">
            {StatusPill(st)} <span className="text-gray-400">→</span> {StatusPill(nxt)}
          </div>
        </div>
      ),
      confirmText: `Chuyển sang “${t(nxt)}”`,
      onConfirm: () => stepToNext(order),
    });
  };

  /** ===== THANH TOÁN (tự gắn với trạng thái) ===== */

  // Điều hướng đơn sang processing khi vừa đánh dấu paid
  const advanceToProcessingIfNeeded = async (order, justPaid) => {
    const st = normalizeStatus(order.status);
    if (justPaid && st === 'pending') {
      try {
        try { await api.post(`/admin/orders/${order._id}/processing`); }
        catch { await api.patch(`/admin/orders/${order._id}/status`, { status: 'processing' }); }
        return true;
      } catch (e) {
        // Không show error ở đây; việc cập nhật payment vẫn thành công
        return false;
      }
    }
    return false;
  };

  // Cập nhật payment + (tuỳ) tự đẩy sang processing
  const setPaymentAndMaybeAdvance = async (order, status, opts = {}) => {
    const { silent = false, reload = true } = opts;
    let progressed = false;

    try {
      // Ưu tiên endpoint admin; nếu không có thì fallback
      try { await api.patch(`/admin/orders/${order._id}/payment`, { status }); }
      catch {
        try { await api.patch(`/orders/${order._id}/payment`, { status }); }
        catch {
          await api.patch(`/admin/orders/${order._id}`, { payment: { status } });
        }
      }

      if (status === 'paid') {
        progressed = await advanceToProcessingIfNeeded(order, true);
      }

      if (!silent) {
        showToast({
          type: 'success',
          title: progressed ? 'Đã thanh toán & chuyển ĐANG XỬ LÝ' : 'Đã cập nhật thanh toán',
          duration: 2000,
        });
      }

      if (reload) await loadOrders();
    } catch (e) {
      if (!silent) {
        showToast({ type: 'error', title: 'Cập nhật thanh toán thất bại', msg: e?.message, duration: 3000 });
      }
      throw e;
    }
  };

  const handleClickPayment = (order) => {
    const pay = getPay(order);
    if (pay === 'refunded') return; // đã hoàn tiền thì khoá

    const next = pay === 'unpaid' ? 'paid' : 'unpaid';
    const note =
      pay === 'unpaid'
        ? 'Đánh dấu đã thu tiền (tiền mặt/chuyển khoản). Nếu đơn đang "Chờ xử lý", hệ thống sẽ tự chuyển sang "Đang xử lý".'
        : 'Đánh dấu CHƯA thanh toán (sử dụng khi ghi nhận nhầm).';

    openConfirm({
      title: 'Cập nhật trạng thái thanh toán',
      message: (
        <div className="text-sm">
          <div className="mb-2">{note}</div>
          <div className="flex items-center gap-2">
            {StatusPill(pay)} <span className="text-gray-400">→</span> {StatusPill(next)}
          </div>
        </div>
      ),
      confirmText: `Chuyển sang “${t(next)}”`,
      onConfirm: () => setPaymentAndMaybeAdvance(order, next),
    });
  };

  /** ===== Ghi chú / Refund / Duyệt huỷ / Xoá ===== */
  const addOrderNote = async (orderId, text) => {
    if (!text?.trim()) return;
    try { await api.post(`/admin/orders/${orderId}/notes`, { text }); }
    catch { await api.post(`/orders/${orderId}/notes`, { text }); }
    await loadOrders();
  };

  const refundOrder = async (orderId, amount, reason) => {
    try { await api.post(`/admin/orders/${orderId}/refund`, { amount, reason }); }
    catch { await api.post(`/orders/${orderId}/refund`, { amount, reason }); }
    await loadOrders();
  };

  const approveCancelOrder = async (id) => {
    try {
      try { await api.post(`/admin/orders/${id}/cancel/approve`); }
      catch { await api.post(`/orders/${id}/cancel/approve`); }
      showToast({ type: 'success', title: 'Đã duyệt huỷ', msg: 'Đơn hàng đã được huỷ theo yêu cầu.', duration: 2200 });
      await loadOrders();
    } catch (e) {
      showToast({ type: 'error', title: 'Duyệt huỷ thất bại', msg: e?.message, duration: 2800 });
    }
  };

  const performDeleteOrder = async (id, status) => {
    const st = normalizeStatus(status);
    const canDelete = ['cancelled', 'completed'].includes(st);
    if (!canDelete) {
      return showToast({ type: 'error', title: 'Không thể xoá', msg: 'Chỉ xoá đơn đã HUỶ hoặc HOÀN THÀNH.', duration: 2600 });
    }
    try {
      try { await api.delete(`/admin/orders/${id}`); }
      catch { await api.delete(`/orders/${id}`); }
      showToast({ type: 'success', title: 'Đã xoá đơn', duration: 1800 });
      await loadOrders();
    } catch (e) {
      showToast({ type: 'error', title: 'Xoá thất bại', msg: e?.message, duration: 2800 });
    }
  };

  const canSubmitReject = () => (rejectReasonKey === 'other' ? rejectReasonOther.trim().length > 0 : !!rejectReasonKey);

  const submitReject = async () => {
    if (!rejectOrderId || !canSubmitReject()) return;
    const picked = REJECT_REASONS.find((r) => r.key === rejectReasonKey);
    const finalReason = rejectReasonKey === 'other' ? (rejectReasonOther || '').trim() : (picked?.label || '');
    setSubmittingReject(true);
    try {
      try { await api.post(`/admin/orders/${rejectOrderId}/cancel/reject`, { reason: finalReason }); }
      catch { await api.post(`/orders/${rejectOrderId}/cancel/reject`, { reason: finalReason }); }
      showToast({ type: 'success', title: 'Đã từ chối yêu cầu huỷ', msg: 'Lý do đã được gửi tới khách hàng.', duration: 2400 });
      setRejectOpen(false);
      setRejectOrderId(null);
      await loadOrders();
    } catch (e) {
      showToast({ type: 'error', title: 'Từ chối thất bại', msg: e?.message || 'Vui lòng thử lại.', duration: 3000 });
    } finally {
      setSubmittingReject(false);
    }
  };

  /** ===== Summary ===== */
  const statusCounts = orders.reduce((acc, o) => {
    const st = normalizeStatus(o.status);
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});
  const SUMMARY_KEYS = ['cancel_requested', 'pending', 'processing', 'shipping', 'delivered', 'completed', 'cancelled', 'refunded'];
  const summaryEntries = SUMMARY_KEYS
    .map((k) => [k, statusCounts[k] || 0])
    .filter(([, c]) => c > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h2>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {summaryEntries.map(([s, c]) => (
          <div key={s} className="bg-white rounded-lg border p-4 text-center">
            <div className={`inline-flex p-2 rounded-full mb-2 ${badge(s)}`} />
            <p className="text-xl font-bold text-gray-900">{c}</p>
            <p className="text-xs text-gray-600">{t(s)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn hàng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổng tiền</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái đơn</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thanh toán</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày đặt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((o) => {
                const total = o.total?.grand ?? o.total ?? 0;
                const payStatus = getPay(o);

                const st = normalizeStatus(o.status);
                const nxt = nextStatus(st);
                const disableAdvance = !nxt || ['cancel_requested', 'cancelled', 'completed'].includes(st);
                const canDelete = ['cancelled', 'completed'].includes(st);

                return (
                  <tr key={o._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">#{String(o._id).slice(-6)}</p>
                        <p className="text-sm text-gray-600">{o.items?.length} sản phẩm</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {o.customer?.name ||
                            o.customerName ||
                            o.shippingAddress?.name ||
                            o.shippingAddress?.receiver ||
                            '-'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {o.customer?.email || o.shippingAddress?.email || ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{fmtMoney(total)}</td>

                    {/* Badge trạng thái — click để nhảy 1 bước */}
                    <td className="px-6 py-4">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() => handleClickStatus(o)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClickStatus(o)}
                        className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-2 cursor-pointer transition
                          ${badge(st)} ${['cancel_requested','cancelled','completed'].includes(st) ? 'opacity-75 cursor-default' : 'hover:shadow hover:ring-1 hover:ring-gray-300'}`}
                        title={nxt ? `Bấm để chuyển sang “${t(nxt)}”` : 'Không có bước kế tiếp'}
                      >
                        {t(st)}
                      </span>
                    </td>

                    {/* Badge thanh toán — click để chuyển paid/unpaid */}
                    <td className="px-6 py-4">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() => handleClickPayment(o)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClickPayment(o)}
                        className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-2 transition
                          ${badge(payStatus)} ${payStatus === 'refunded' ? 'opacity-75 cursor-default' : 'cursor-pointer hover:shadow hover:ring-1 hover:ring-gray-300'}`}
                        title={payStatus === 'refunded' ? 'Đã hoàn – không thể đổi' : 'Bấm để chuyển đổi thanh toán'}
                      >
                        {t(payStatus)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {/* Xem chi tiết */}
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => { setSelectedOrder(o); setShowModal(true); }}
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Nút tiến trình nhanh */}
                        <button
                          className={`${disableAdvance ? 'text-gray-300 cursor-not-allowed' : 'text-green-600 hover:text-green-800'}`}
                          onClick={() => !disableAdvance && stepToNext(o)}
                          title={disableAdvance ? 'Không thể chuyển tiếp' : 'Chuyển trạng thái tiếp theo'}
                          disabled={disableAdvance}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        {/* Xoá đơn (ConfirmDialog) */}
                        <button
                          className={`${canDelete ? 'text-red-600 hover:text-red-800' : 'text-gray-300 cursor-not-allowed'}`}
                          onClick={() => canDelete && openConfirm({
                            title: `Xoá đơn #${String(o._id).slice(-6)}`,
                            message: (
                              <div className="text-sm">
                                Hành động này <b>không thể hoàn tác</b>. Bạn chắc chắn muốn xoá vĩnh viễn đơn này?
                              </div>
                            ),
                            confirmText: 'Xoá vĩnh viễn',
                            tone: 'danger',
                            onConfirm: () => performDeleteOrder(o._id, st),
                          })}
                          title={canDelete ? 'Xoá đơn' : 'Chỉ xoá khi ĐÃ HUỶ hoặc HOÀN THÀNH'}
                          disabled={!canDelete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Duyệt/Từ chối yêu cầu huỷ */}
                        {st === 'cancel_requested' && (
                          <>
                            <button
                              className="px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700"
                              onClick={() => approveCancelOrder(o._id)}
                            >
                              Duyệt huỷ
                            </button>
                            <button
                              className="px-3 py-1 rounded-md border hover:bg-gray-50"
                              onClick={() => {
                                setRejectOrderId(o._id);
                                setRejectReasonKey('');
                                setRejectReasonOther('');
                                setRejectOpen(true);
                              }}
                            >
                              Từ chối
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                    Chưa có dữ liệu đơn hàng.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal chi tiết đơn */}
      {showModal && selectedOrder && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => { setShowModal(false); setSelectedOrder(null); }}
        >
          <div className="bg-white rounded-xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Đơn #{String(selectedOrder._id).slice(-6)}</h3>
              <button onClick={() => { setShowModal(false); setSelectedOrder(null); }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-sm text-gray-700">
              {(selectedOrder.items || []).map((it, i) => (
                <div key={i} className="flex justify-between">
                  <span className="truncate">{it.title || it.name} × {it.qty || it.quantity || 1}</span>
                  <b>{fmtMoney((it.price || it.unitPrice || 0) * (it.qty || it.quantity || 1))}</b>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <AddNote onAdd={(text) => addOrderNote(selectedOrder._id, text)} />
              <RefundBox onRefund={(amount, reason) => refundOrder(selectedOrder._id, amount, reason)} />
            </div>
          </div>
        </div>
      )}

      {/* Modal TỪ CHỐI yêu cầu huỷ */}
      {rejectOpen && (
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/40" onClick={() => !submittingReject && setRejectOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
              <div className="px-5 pt-5">
                <h2 className="text-lg font-semibold">Từ chối yêu cầu huỷ</h2>
                <p className="mt-1 text-sm text-gray-600">Chọn lý do để thông báo cho khách hàng.</p>
              </div>

              <div className="px-5 py-4 space-y-2">
                {REJECT_REASONS.map((r) => (
                  <label key={r.key} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      className="mt-1"
                      name="reject_reason"
                      value={r.key}
                      checked={rejectReasonKey === r.key}
                      onChange={() => setRejectReasonKey(r.key)}
                    />
                    <span className="text-sm text-gray-800">{r.label}</span>
                  </label>
                ))}

                {rejectReasonKey === 'other' && (
                  <textarea
                    className="mt-1 w-full input min-h-[96px]"
                    placeholder="Nhập lý do khác…"
                    value={rejectReasonOther}
                    onChange={(e) => setRejectReasonOther(e.target.value)}
                  />
                )}
              </div>

              <div className="px-5 pb-5 flex items-center justify-end gap-3">
                <button className="btn bg-gray-100 hover:bg-gray-200" onClick={() => setRejectOpen(false)} disabled={submittingReject}>
                  Bỏ qua
                </button>
                <button
                  className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                  onClick={submitReject}
                  disabled={submittingReject || !canSubmitReject()}
                >
                  {submittingReject ? 'Đang gửi…' : 'Xác nhận từ chối'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog dùng chung */}
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
    </div>
  );
}
