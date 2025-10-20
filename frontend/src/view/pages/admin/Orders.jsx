// src/view/pages/admin/Orders.jsx
import React, { useEffect, useState } from 'react';
import { Eye, RefreshCw, X, XCircle } from 'lucide-react';
import api from '@/services/api';
import { useUI } from '@/store/useUI';
import AddNote from './AddNote';
import RefundBox from './RefundBox';

const fmtMoney = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n || 0));

// badge màu theo trạng thái
const badge = (s) => ({
  completed: 'text-green-600 bg-green-100',
  processing: 'text-blue-600 bg-blue-100',
  shipping: 'text-purple-600 bg-purple-100',
  pending: 'text-yellow-600 bg-yellow-100',
  canceled: 'text-red-600 bg-red-100',
  cancelled: 'text-red-600 bg-red-100',
  refunded: 'text-orange-600 bg-orange-100',
  paid: 'text-green-600 bg-green-100',
  unpaid: 'text-red-600 bg-red-100',
  cancel_requested: 'text-amber-700 bg-amber-100',
}[s] || 'text-gray-600 bg-gray-100');

// dịch nhãn
const t = (s) =>
  ({
    completed: 'Hoàn thành',
    processing: 'Đang xử lý',
    shipping: 'Đang giao',
    pending: 'Chờ xử lý',
    canceled: 'Đã huỷ',
    cancelled: 'Đã huỷ',
    refunded: 'Đã hoàn',
    paid: 'Đã thanh toán',
    unpaid: 'Chưa thanh toán',
    cancel_requested: 'Chờ duyệt huỷ',
  }[s] || s);

const nextStatus = (s) =>
  ({ pending: 'processing', processing: 'shipping', shipping: 'completed' }[s] || s);

// Lý do phổ biến để TỪ CHỐI yêu cầu huỷ
const REJECT_REASONS = [
  { key: 'already_shipped', label: 'Đơn đã bàn giao cho đơn vị vận chuyển' },
  { key: 'packed',          label: 'Đơn đã được đóng gói, không thể huỷ' },
  { key: 'over_time',       label: 'Vượt thời gian cho phép huỷ' },
  { key: 'custom_made',     label: 'Sản phẩm đặt theo yêu cầu/không hỗ trợ huỷ' },
  { key: 'payment_locked',  label: 'Thanh toán đã xác nhận/đang quyết toán' },
  { key: 'other',           label: 'Khác (ghi rõ)' },
];

export default function Orders() {
  const { showToast } = useUI();

  const [orders, setOrders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // State modal TỪ CHỐI huỷ
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState(null);
  const [rejectReasonKey, setRejectReasonKey] = useState('');
  const [rejectReasonOther, setRejectReasonOther] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  const loadOrders = async () => {
    try {
      let r;
      try {
        r = await api.get('/admin/orders');
      } catch {
        r = await api.get('/orders'); // fallback cũ
      }
      setOrders(r.items || r);
    } catch (e) {
      console.error('orders error', e);
      setOrders([]);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // ----- Actions -----
  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status });
    } catch {
      await api.patch(`/orders/${orderId}/status`, { status });
    }
    await loadOrders();
  };

  const addOrderNote = async (orderId, text) => {
    if (!text?.trim()) return;
    try {
      await api.post(`/admin/orders/${orderId}/notes`, { text });
    } catch {
      await api.post(`/orders/${orderId}/notes`, { text });
    }
    await loadOrders();
  };

  const refundOrder = async (orderId, amount, reason) => {
    try {
      await api.post(`/admin/orders/${orderId}/refund`, { amount, reason });
    } catch {
      await api.post(`/orders/${orderId}/refund`, { amount, reason });
    }
    await loadOrders();
  };

  // Duyệt huỷ
  const approveCancelOrder = async (id) => {
    try {
      await api.post(`/admin/orders/${id}/cancel/approve`);
    } catch {
      await api.post(`/orders/${id}/cancel/approve`);
    }
    showToast({ type: 'success', title: 'Đã duyệt huỷ', msg: 'Đơn hàng đã được huỷ theo yêu cầu.', duration: 2200 });
    await loadOrders();
  };

  // --------- TỪ CHỐI HUỶ: modal + submit ----------
  const openRejectDialog = (id) => {
    setRejectOrderId(id);
    setRejectReasonKey('');
    setRejectReasonOther('');
    setRejectOpen(true);
  };

  const canSubmitReject = () => {
    if (rejectReasonKey === 'other') return rejectReasonOther.trim().length > 0;
    return Boolean(rejectReasonKey);
  };

  const submitReject = async () => {
    if (!rejectOrderId || !canSubmitReject()) return;
    const picked = REJECT_REASONS.find((r) => r.key === rejectReasonKey);
    const finalReason =
      rejectReasonKey === 'other'
        ? (rejectReasonOther || '').trim()
        : (picked?.label || '');

    setSubmittingReject(true);
    try {
      try {
        await api.post(`/admin/orders/${rejectOrderId}/cancel/reject`, { reason: finalReason });
      } catch {
        await api.post(`/orders/${rejectOrderId}/cancel/reject`, { reason: finalReason });
      }
      showToast({
        type: 'success',
        title: 'Đã từ chối yêu cầu huỷ',
        msg: 'Lý do đã được gửi tới khách hàng.',
        duration: 2400,
      });
      setRejectOpen(false);
      setRejectOrderId(null);
      await loadOrders();
    } catch (e) {
      showToast({
        type: 'error',
        title: 'Từ chối thất bại',
        msg: e?.message || 'Vui lòng thử lại.',
        duration: 3000,
      });
    } finally {
      setSubmittingReject(false);
    }
  };

  // ----- Render -----
  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {Object.entries(statusCounts).map(([s, c]) => (
          <div key={s} className="bg-white rounded-lg border p-4 text-center">
            <div className={`inline-flex p-2 rounded-full mb-2 ${badge(s)}`} />
            <p className="text-xl font-bold text-gray-900">{c}</p>
            <p className="text-xs text-gray-600">{t(s)}</p>
          </div>
        ))}
      </div>

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
                const payStatus = o.payment?.status || o.paymentStatus || (o.paid ? 'paid' : 'unpaid');
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
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${badge(o.status)}`}>{t(o.status)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${badge(payStatus)}`}>{t(payStatus)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => { setSelectedOrder(o); setShowModal(true); }}
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* bước tiến trình nhanh */}
                        <button
                          className="text-green-600 hover:text-green-800"
                          onClick={() => updateOrderStatus(o._id, nextStatus(o.status))}
                          title="Chuyển trạng thái tiếp theo"
                          disabled={['cancel_requested', 'cancelled', 'canceled'].includes(o.status)}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        {/* Huỷ ngay (đặt cờ), ẩn nếu đã huỷ */}
                        {!['canceled','cancelled'].includes(o.status) && (
                          <button
                            className="text-red-600 hover:text-red-800"
                            onClick={() => updateOrderStatus(o._id, 'canceled')}
                            title="Đánh dấu huỷ ngay"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* >>> Duyệt/Từ chối yêu cầu huỷ */}
                        {o.status === 'cancel_requested' && (
                          <>
                            <button
                              className="px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700"
                              onClick={() => approveCancelOrder(o._id)}
                            >
                              Duyệt huỷ
                            </button>
                            <button
                              className="px-3 py-1 rounded-md border hover:bg-gray-50"
                              onClick={() => openRejectDialog(o._id)}
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

      {/* Modal chi tiết đơn (đơn giản) */}
      {showModal && selectedOrder && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => { setShowModal(false); setSelectedOrder(null); }}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
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
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !submittingReject && setRejectOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-black/5"
            >
              <div className="px-5 pt-5">
                <h2 className="text-lg font-semibold">Từ chối yêu cầu huỷ</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Chọn lý do để thông báo cho khách hàng (giúp giảm khiếu nại).
                </p>
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
                <button
                  className="btn bg-gray-100 hover:bg-gray-200"
                  onClick={() => setRejectOpen(false)}
                  disabled={submittingReject}
                >
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
    </div>
  );
}
