// src/view/pages/Orders.jsx
import { list, cancel, rma } from '../../services/orders'; // ⬅️ sửa đường dẫn
import { useAuth } from '../../store/useAuth';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const TABS = [
  { key: 'all',               label: 'Tất cả đơn' },
  { key: 'pending',           label: 'Chờ thanh toán' },
  { key: 'processing',        label: 'Đang xử lý' },
  { key: 'shipping',          label: 'Đang vận chuyển' },
  { key: 'completed',         label: 'Đã giao' },
  { key: 'cancel_requested',  label: 'Chờ huỷ' },            // ⬅️ thêm tab
  { key: 'cancelled',         label: 'Đã huỷ' },
];

const money  = (n) => (Number(n || 0)).toLocaleString('vi-VN') + 'đ';
const dateVN = (d) => (d ? new Date(d).toLocaleString('vi-VN') : '-');

const normStatus = (s) => {
  const m = { shipped: 'shipping', delivered: 'completed', canceled: 'cancelled' };
  return m[s] || s;
};
const labelStatus = (s) => {
  const m = {
    pending: 'Chờ thanh toán',
    processing: 'Đang xử lý',
    shipping: 'Đang vận chuyển',
    shipped: 'Đang vận chuyển',
    completed: 'Đã giao',
    delivered: 'Đã giao',
    cancel_requested: 'Chờ huỷ (đợi duyệt)',                 // ⬅️ hiển thị trạng thái mới
    cancelled: 'Đã huỷ',
    canceled: 'Đã huỷ',
  };
  return m[s] || s;
};

export default function Orders() {
  const { user } = useAuth();
  const [tab, setTab]       = useState('all');
  const [q, setQ]           = useState('');
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    if (!user?.id && !user?._id) return;
    setLoading(true);
    try {
      const data = await list({}); // service đã dùng token để biết "mine"
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

  // helper gọi huỷ (hỏi lý do)
  const requestCancel = async (orderId, isPending) => {
    let reason = '';
    if (!isPending) {
      reason = window.prompt('Lý do huỷ (tuỳ chọn):', '') || '';
    }
    await cancel(orderId, { reason });   // services/orders → POST /mine/:id/cancel (BE đọc reason)
    await reload();
  };

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

          {/* Tìm kiếm */}
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

          {/* Danh sách đơn */}
          <div className="p-5">
            {loading ? (
              <div className="text-gray-600">Đang tải…</div>
            ) : (
              <div className="space-y-4">
                {view.map((o) => {
                  const id    = o._id || o.id;
                  const total = o.total ?? o.pricing?.grandTotal ?? 0;
                  const st    = normStatus(o.status);

                  const showCancelNow   = st === 'pending';                                    // huỷ ngay
                  const showCancelReq   = ['processing','shipping'].includes(st);              // gửi yêu cầu huỷ
                  const isCancelWait    = st === 'cancel_requested';

                  return (
                    <div key={id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">Đơn #{String(o.code || id).slice(-6)}</div>
                          <div className="text-sm text-gray-600">
                            Ngày: {dateVN(o.createdAt)} • Trạng thái: <b>{labelStatus(o.status)}</b>
                          </div>

                          {isCancelWait && (
                            <div className="mt-1 text-xs text-amber-600">
                              Đã gửi yêu cầu huỷ — vui lòng chờ admin duyệt.
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-violet-700">{money(total)}</div>

                          {(showCancelNow || showCancelReq) && (
                            <div className="flex gap-2 justify-end mt-2">
                              <button
                                onClick={() => requestCancel(id, showCancelNow)}
                                className="btn bg-gray-100 hover:bg-gray-200"
                              >
                                {showCancelNow ? 'Huỷ đơn' : 'Yêu cầu huỷ'}
                              </button>
                              {showCancelNow && (
                                <button
                                  onClick={async () => {
                                    await rma(id, 'Không phù hợp');
                                    alert('Đã gửi yêu cầu đổi/trả');
                                    await reload();
                                  }}
                                  className="btn bg-gray-100 hover:bg-gray-200"
                                >
                                  Yêu cầu đổi/trả
                                </button>
                              )}
                            </div>
                          )}
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
    </div>
  );
}
