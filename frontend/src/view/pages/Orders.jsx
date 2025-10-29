// src/view/pages/Orders.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  list as listOrders,
  cancel as cancelOrder,
  rma as requestRMA,
  withdrawCancel,
  confirmReceived,
  // ✅ đã bỏ import tracking
} from '../../services/orders';
import { useAuth } from '../../store/useAuth';
import { useUI } from '../../store/useUI';

const TABS = [
  { key: 'all',              label: 'Tất cả đơn' },
  { key: 'pending',          label: 'Chờ thanh toán' },
  { key: 'processing',       label: 'Đang xử lý' },
  { key: 'shipping',         label: 'Đang vận chuyển' },
  { key: 'delivered',        label: 'Đã giao' },
  { key: 'completed',        label: 'Hoàn tất' },
  { key: 'cancel_requested', label: 'Chờ huỷ' },
  { key: 'cancelled',        label: 'Đã huỷ' },
];

const REASONS = [
  { key: 'changed_mind',   label: 'Đặt nhầm / Đổi ý' },
  { key: 'slow_delivery',  label: 'Thời gian giao hàng quá lâu' },
  { key: 'duplicate',      label: 'Đặt trùng đơn' },
  { key: 'found_better',   label: 'Tìm được giá tốt hơn' },
  { key: 'edit_order',     label: 'Muốn sửa/thêm sản phẩm trong đơn' },
  { key: 'wrong_info',     label: 'Muốn đổi địa chỉ / số điện thoại' },
  { key: 'other',          label: 'Khác (ghi rõ)' },
];

const money  = (n) => (Number(n || 0)).toLocaleString('vi-VN') + 'đ';
const dateVN = (d) => (d ? new Date(d).toLocaleString('vi-VN') : '-');

const normStatus = (s) => {
  const m = { shipped: 'shipping', delivered: 'delivered', canceled: 'cancelled' };
  return m[s] || s;
};
const labelStatus = (s) => {
  const m = {
    pending: 'Chờ thanh toán',
    processing: 'Đang xử lý',
    shipping: 'Đang vận chuyển',
    delivered: 'Đã giao',
    completed: 'Hoàn tất',
    cancel_requested: 'Chờ huỷ (đợi duyệt)',
    cancelled: 'Đã huỷ',
  };
  return m[s] || s;
};

export default function Orders() {
  const { user } = useAuth();
  const { showToast } = useUI();

  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [cancelIsPending, setCancelIsPending] = useState(false);
  const [reasonKey, setReasonKey] = useState('');
  const [reasonOther, setReasonOther] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ✅ ĐÃ XOÁ: state & modal tracking

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

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [user]);

  const view = useMemo(() => {
    const byTab = items.filter((o) => (tab === 'all' ? true : normStatus(o.status) === tab));
    const t = q.trim().toLowerCase();
    if (!t) return byTab;
    return byTab.filter((o) => {
      const code   = String(o.code || o._id || o.id || '').toLowerCase();
      const names  = (o.items || []).map(i => i.title || i.name || '').join(' ').toLowerCase();
      const seller = String(o.sellerName || '').toLowerCase();
      return code.includes(t) || names.includes(t) || seller.includes(t);
    });
  }, [items, tab, q]);

  // Cancel dialog helpers
  const openCancelDialog = (orderId, isPending) => {
    setCancelOrderId(orderId);
    setCancelIsPending(!!isPending);
    setReasonKey('');
    setReasonOther('');
    setCancelOpen(true);
  };
  const canSubmitCancel = () => (reasonKey === 'other' ? reasonOther.trim().length > 0 : Boolean(reasonKey));

  const submitCancel = async () => {
    if (!cancelOrderId || !canSubmitCancel()) return;
    const picked = REASONS.find(r => r.key === reasonKey);
    const finalReason = reasonKey === 'other' ? (reasonOther || '').trim() : (picked?.label || '');
    setSubmitting(true);
    try {
      await cancelOrder(cancelOrderId, { reason: finalReason });
      setCancelOpen(false);
      setCancelOrderId(null);
      showToast({
        type: 'success',
        title: cancelIsPending ? 'Đã huỷ đơn' : 'Đã gửi yêu cầu huỷ',
        msg: cancelIsPending
          ? 'Đơn hàng đã được huỷ thành công.'
          : 'Yêu cầu huỷ đã được gửi, vui lòng chờ xét duyệt.',
        duration: 2500,
      });
      await reload();
    } catch (e) {
      showToast({
        type: 'error',
        title: 'Không thể huỷ đơn',
        msg: e?.message || 'Vui lòng thử lại sau.',
        duration: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Withdraw cancel
  const onWithdraw = async (id) => {
    try {
      await withdrawCancel(id);
      showToast({ type: 'success', title: 'Đã rút yêu cầu huỷ', duration: 2200 });
      await reload();
    } catch (e) {
      showToast({ type: 'error', title: 'Không rút được yêu cầu', msg: e?.message, duration: 3000 });
    }
  };

  // Confirm received
  const onConfirmReceived = async (id) => {
    try {
      await confirmReceived(id);
      showToast({ type: 'success', title: 'Cảm ơn bạn! Đơn đã hoàn tất.', duration: 2200 });
      await reload();
    } catch (e) {
      showToast({ type: 'error', title: 'Xác nhận thất bại', msg: e?.message, duration: 3000 });
    }
  };

  const getGrand = (o) => Number(o?.pricing?.grandTotal ?? o?.total?.grand ?? 0);

  return (
    <div className="bg-gray-50">
      {/* breadcrumb */}
      <div className="container px-4 pt-4 text-sm text-gray-500">
        <Link to="/" className="hover:underline">Trang chủ</Link>
        <span className="mx-2">›</span>
        <span>Đơn hàng của tôi</span>
      </div>

      <div className="container px-4 py-6 grid lg:grid-cols-[280px,1fr] gap-6">
        {/* Sidebar */}
        <aside className="bg-white rounded-xl border shadow-sm">
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

          {/* ✅ Sidebar giống hình: có thêm Đánh giá & Nhận xét; mục “Quản lý đơn hàng” đang active */}
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
          <div className="px-5 pt-5">
            <h1 className="text-2xl font-semibold">Đơn hàng của tôi</h1>
          </div>

          {/* Tabs */}
          <div className="mt-4 px-5">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:gap-6 font-medium text-gray-700">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`relative py-3 -mb-px ${tab === t.key ? 'text-violet-700' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  {t.label}
                  {tab === t.key && <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-violet-600 rounded-full" />}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="px-5 pt-2 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  className="input w-full h-11 pl-4 pr-10"
                  placeholder="Tìm đơn hàng (mã đơn, nhà bán, tên sản phẩm)…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') {} }}
                  aria-label="Tìm đơn hàng"
                />
                {q?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setQ('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Xoá từ khoá"
                    title="Xoá"
                  >
                    ×
                  </button>
                )}
              </div>

              <button className="btn text-violet-700 border border-violet-200 bg-violet-50 hover:bg-violet-100">
                Tìm đơn hàng
              </button>
            </div>
          </div>

          {/* List */}
          <div className="p-5">
            {loading ? (
              <div className="text-gray-600">Đang tải…</div>
            ) : (
              <div className="space-y-4">
                {view.map((o) => {
                  const id    = o._id || o.id;
                  const total = Number(o?.pricing?.grandTotal ?? o?.total?.grand ?? 0);
                  const st    = normStatus(o.status);

                  const isPending   = st === 'pending';
                  const isProcess   = st === 'processing';
                  const isShipping  = st === 'shipping';
                  const isDelivered = st === 'delivered';
                  const isCompleted = st === 'completed';
                  const isCancelReq = st === 'cancel_requested';
                  const isCancelled = st === 'cancelled';

                  return (
                    <div key={id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">Đơn #{String(o.code || id).slice(-6)}</div>
                          <div className="text-sm text-gray-600">
                            Ngày: {dateVN(o.createdAt)} • Trạng thái: <b>{labelStatus(o.status)}</b>
                          </div>
                          {o.protectionUntil && (
                            <div className="mt-1 text-xs text-gray-500">
                              Bảo vệ người mua đến: {dateVN(o.protectionUntil)}
                            </div>
                          )}
                          {isCancelReq && (
                            <div className="mt-1 text-xs text-amber-600">
                              Đã gửi yêu cầu huỷ — vui lòng chờ admin duyệt.
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-lg font-semibold text-violet-700">{money(total)}</div>

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-2 justify-end mt-2">
                            {/* Cancel / request cancel */}
                            {(isPending || isProcess || isShipping) && (
                              <button
                                onClick={() => openCancelDialog(id, isPending)}
                                className="btn bg-gray-100 hover:bg-gray-200"
                              >
                                {isPending ? 'Huỷ đơn' : 'Yêu cầu huỷ'}
                              </button>
                            )}

                            {/* Rút yêu cầu huỷ */}
                            {isCancelReq && (
                              <button
                                onClick={() => onWithdraw(id)}
                                className="btn bg-gray-100 hover:bg-gray-200"
                              >
                                Rút yêu cầu huỷ
                              </button>
                            )}

                            {/* ✅ ĐÃ XOÁ: nút Theo dõi vận đơn */}

                            {/* Xác nhận đã nhận hàng */}
                            {isDelivered && (
                              <button
                                onClick={() => onConfirmReceived(id)}
                                className="btn bg-emerald-600 text-white hover:bg-emerald-700"
                              >
                                Đã nhận hàng
                              </button>
                            )}

                            {/* RMA nếu còn bảo vệ người mua */}
                            {(isDelivered || isCompleted) && (() => {
                              const until = o?.protectionUntil ? new Date(o.protectionUntil) : null;
                              const active = !!until && Date.now() < +until;
                              return active;
                            })() && (
                              <button
                                onClick={async () => {
                                  try {
                                    await requestRMA(id, 'Không phù hợp / Lỗi sản phẩm');
                                    showToast({
                                      type: 'success',
                                      title: 'Đã gửi yêu cầu đổi/trả',
                                      msg: 'Chúng tôi sẽ liên hệ hỗ trợ sớm.',
                                      duration: 2500,
                                    });
                                  } catch (e) {
                                    showToast({
                                      type: 'error',
                                      title: 'Không thể gửi yêu cầu đổi/trả',
                                      msg: e?.message || 'Vui lòng thử lại sau.',
                                      duration: 3000,
                                    });
                                  }
                                }}
                                className="btn bg-gray-100 hover:bg-gray-200"
                              >
                                Đổi/Trả – Hoàn tiền
                              </button>
                            )}

                            {/* Mua lại */}
                            {(isCompleted || isCancelled) && (
                              <Link to="/categories" className="btn bg-gray-100 hover:bg-gray-200">
                                Mua lại
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 divide-y">
                        {(o.items || []).map((i, idx) => {
                          const qty   = i.quantity ?? i.qty ?? 1;
                          const price = i.price ?? i.unitPrice ?? 0;
                          return (
                            <div key={idx} className="py-2 flex items-center justify-between text-sm">
                              <div className="truncate">{i.title || i.name} × {qty}</div>
                              <b>{money(price * qty)}</b>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {!view.length && <div className="text-gray-600">Không có đơn phù hợp.</div>}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Cancel reason dialog */}
      {cancelOpen && (
        <div className="fixed inset-0 z-[1000]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !submitting && setCancelOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-black/5"
            >
              <div className="px-5 pt-5">
                <h2 className="text-lg font-semibold">
                  {cancelIsPending ? 'Huỷ đơn hàng' : 'Gửi yêu cầu huỷ'}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Vui lòng chọn lý do huỷ để chúng tôi phục vụ tốt hơn.
                </p>
              </div>

              <div className="px-5 py-4 space-y-2">
                {REASONS.map(r => (
                  <label
                    key={r.key}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      className="mt-1"
                      name="cancel_reason"
                      value={r.key}
                      checked={reasonKey === r.key}
                      onChange={() => setReasonKey(r.key)}
                    />
                    <span className="text-sm text-gray-800">{r.label}</span>
                  </label>
                ))}

                {reasonKey === 'other' && (
                  <textarea
                    className="mt-1 w-full input min-h-[96px]"
                    placeholder="Nhập lý do khác…"
                    value={reasonOther}
                    onChange={(e) => setReasonOther(e.target.value)}
                  />
                )}
              </div>

              <div className="px-5 pb-5 flex items-center justify-end gap-3">
                <button
                  className="btn bg-gray-100 hover:bg-gray-200"
                  onClick={() => setCancelOpen(false)}
                  disabled={submitting}
                >
                  Bỏ qua
                </button>
                <button
                  className="btn bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
                  onClick={submitCancel}
                  disabled={submitting || !canSubmitCancel()}
                >
                  {submitting
                    ? 'Đang gửi…'
                    : (cancelIsPending ? 'Xác nhận huỷ' : 'Gửi yêu cầu')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
