import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useAuth } from '../../store/useAuth';
import * as Orders from '../../services/orders';
import * as Reviews from '../../services/reviews';
import * as Catalog from '../../services/catalog'; // dùng để lấy ảnh fallback

const money = (n) => (Number(n || 0)).toLocaleString('vi-VN') + 'đ';

function StarsInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          aria-label={`${n} sao`}
          className="p-1"
        >
          <Star
            className={`w-6 h-6 ${
              n <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

/**
 * Lấy ảnh fallback cho các item KHÔNG có image/coverUrl.
 * Trả về map: { [bookId]: imageUrl }
 */
function useImageFallback(booksToReview) {
  const [imgMap, setImgMap] = useState({});
  useEffect(() => {
    const need = [];
    const seen = new Set();
    for (const b of booksToReview || []) {
      const id = b.bookId;
      if (!id || b.image) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      need.push(id);
    }
    if (!need.length) return;

    (async () => {
      const updates = {};
      await Promise.all(
        need.map(async (id) => {
          try {
            const bk = await Catalog.getBook(id);
            const url = bk?.coverUrl || bk?.image || '';
            if (url) updates[id] = url;
          } catch {}
        })
      );
      if (Object.keys(updates).length) {
        setImgMap((m) => ({ ...m, ...updates }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify((booksToReview || []).map((b) => ({ id: b.bookId, has: b.image ? 1 : 0 })))]);

  return imgMap;
}

export default function AccountReviews() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // form state theo bookId
  const [forms, setForms] = useState({}); // { [bookId]: { rating, content, posting } }
  const [posted, setPosted] = useState({}); // { [bookId]: true }

  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Lấy các đơn đã hoàn tất (completed)
        const res = await Orders.mine({ status: 'completed', limit: 50 });
        const items = Array.isArray(res?.items) ? res.items : res || [];
        setOrders(items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  /**
   * ✅ GỘP CÁC SẢN PHẨM TRÙNG (cùng bookId) TỪ NHIỀU ĐƠN
   * - Chỉ hiển thị 1 block/1 bookId
   * - Gộp tổng số lượng đã mua
   * - Lưu lại đơn gần nhất để hiển thị thông tin
   */
  const booksToReview = useMemo(() => {
    const map = new Map();
    for (const o of orders || []) {
      for (const it of o.items || []) {
        const bookId = it.bookId || it._id || it.id;
        if (!bookId) continue;

        const key = String(bookId);
        const qty = it.qty ?? it.quantity ?? 1;

        const current =
          map.get(key) || {
            bookId: key,
            title: it.title || it.name || '',
            image: it.image || it.coverUrl || '',
            unitPrice: it.unitPrice ?? it.price ?? 0,
            totalQty: 0,
            lastOrderId: null,
            lastOrderCode: '',
            lastOrderAt: null,
            orders: [],
          };

        current.totalQty += qty;
        current.orders.push({
          orderId: o._id || o.id,
          orderCode: o.code || String(o._id || '').slice(-6),
          orderAt: o.createdAt,
          qty,
        });

        // Cập nhật đơn gần nhất
        if (!current.lastOrderAt || new Date(o.createdAt) > new Date(current.lastOrderAt)) {
          current.lastOrderAt = o.createdAt;
          current.lastOrderCode = o.code || String(o._id || '').slice(-6);
          current.lastOrderId = o._id || o.id;
        }

        // Nếu trước đó chưa có ảnh mà item này có ảnh -> cập nhật
        if (!current.image && (it.image || it.coverUrl)) {
          current.image = it.image || it.coverUrl;
        }

        map.set(key, current);
      }
    }
    return Array.from(map.values());
  }, [orders]);

  // Ảnh fallback cho item thiếu ảnh
  const imgMap = useImageFallback(booksToReview);

  const onChangeForm = (bookId, patch) => {
    setForms((f) => ({ ...f, [bookId]: { rating: 5, content: '', ...f[bookId], ...patch } }));
  };

  const submit = async (b) => {
    if (!user) return nav(`/login?next=${encodeURIComponent('/account/reviews')}`);
    const fv = forms[b.bookId] || {};
    if (!(fv.rating >= 1 && fv.rating <= 5)) return alert('Vui lòng chọn số sao (1-5)');
    try {
      onChangeForm(b.bookId, { posting: true });
      await Reviews.postReview(b.bookId, {
        rating: fv.rating,
        title: '',
        content: fv.content || '',
        photos: [],
      });
      setPosted((p) => ({ ...p, [b.bookId]: true }));
    } catch (e) {
      alert(e?.message || 'Gửi đánh giá thất bại');
    } finally {
      onChangeForm(b.bookId, { posting: false });
    }
  };

  return (
    <>
        {/* Content */}
        <section className="bg-white rounded-xl border shadow-sm p-5">
          <h1 className="text-2xl font-semibold mb-4">Đánh giá sản phẩm</h1>

          {loading ? (
            <div className="text-gray-600">Đang tải…</div>
          ) : booksToReview.length === 0 ? (
            <div className="text-gray-600">Chưa có sản phẩm nào đã giao để đánh giá.</div>
          ) : (
            <div className="space-y-5">
              {booksToReview.map((b) => {
                const f = forms[b.bookId] || { rating: 5, content: '' };
                const isPosted = !!posted[b.bookId];
                const img = b.image || imgMap[b.bookId] || '/placeholder.jpg';
                return (
                  <div key={b.bookId} className="border rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={img}
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.jpg';
                        }}
                        alt={b.title}
                        className="w-20 h-28 object-contain border rounded bg-white"
                      />
                      <div className="flex-1">
                        <div className="font-semibold">{b.title}</div>
                        <div className="text-sm text-gray-500">
                          Đơn gần nhất #{String(b.lastOrderCode).slice(-6)} • Tổng SL đã mua: {b.totalQty}{' '}
                          • {money(b.unitPrice)}
                        </div>

                        {isPosted ? (
                          <div className="mt-3 text-green-600 font-medium">
                            Bạn đã gửi đánh giá cho sản phẩm này. Cảm ơn bạn!
                          </div>
                        ) : (
                          <div className="mt-3 space-y-3">
                            <div>
                              <div className="text-sm text-gray-600 mb-1">Đánh giá</div>
                              <StarsInput
                                value={f.rating ?? 5}
                                onChange={(v) => onChangeForm(b.bookId, { rating: v })}
                              />
                            </div>
                            <div>
                              <textarea
                                className="input w-full min-h-[96px]"
                                placeholder="Cảm nhận của bạn về sản phẩm…"
                                value={f.content || ''}
                                onChange={(e) => onChangeForm(b.bookId, { content: e.target.value })}
                              />
                            </div>
                            <div className="flex items-center justify-end">
                              <button
                                onClick={() => submit(b)}
                                disabled={!!f.posting}
                                className="btn-primary disabled:opacity-60"
                              >
                                {f.posting ? 'Đang gửi…' : 'Gửi đánh giá'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* (Tuỳ chọn) liệt kê các lần mua trước cho sản phẩm này */}
                    {b.orders?.length > 1 && (
                      <details className="mt-3 text-sm text-gray-600">
                        <summary className="cursor-pointer select-none">Xem các lần mua</summary>
                        <ul className="mt-2 list-disc pl-5">
                          {b.orders
                            .sort((a, c) => new Date(c.orderAt) - new Date(a.orderAt))
                            .map((o) => (
                              <li key={`${o.orderId}:${o.qty}`}>
                                Đơn #{String(o.orderCode).slice(-6)} • SL: {o.qty}
                              </li>
                            ))}
                        </ul>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </>
  );
}
