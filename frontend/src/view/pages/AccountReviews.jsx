// src/view/pages/AccountReviews.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useAuth } from '../../store/useAuth';
import * as Orders from '../../services/orders';
import * as Reviews from '../../services/reviews';
import * as Catalog from '../../services/catalog'; // ✅ dùng để lấy ảnh fallback

const money = (n) => (Number(n || 0)).toLocaleString('vi-VN') + 'đ';

function StarsInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(n=>(
        <button
          key={n}
          type="button"
          onClick={()=>onChange?.(n)}
          aria-label={`${n} sao`}
          className="p-1"
        >
          <Star className={`w-6 h-6 ${n<=value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  );
}

/**
 * Hook lấy ảnh fallback cho các order item KHÔNG có image/coverUrl (đơn cũ).
 * - Nhận mảng booksToReview
 * - Trả về map: { [bookId]: imageUrl }
 */
function useImageFallback(booksToReview) {
  const [imgMap, setImgMap] = useState({});
  useEffect(() => {
    // Lọc các bookId chưa có ảnh trong item
    const need = [];
    const seen = new Set();
    for (const b of booksToReview || []) {
      const id = b.bookId;
      if (!id || b.image) continue;          // đã có ảnh thì bỏ qua
      if (seen.has(id)) continue;
      seen.add(id);
      need.push(id);
    }
    if (!need.length) return;

    // Fetch ảnh từng sách (song song)
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
  }, [JSON.stringify((booksToReview||[]).map(b=>({ id:b.bookId, has:b.image?1:0 })))]);

  return imgMap;
}

export default function AccountReviews() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // form state theo bookId
  const [forms, setForms] = useState({}); // { [bookId]: { rating, title, content, posting } }
  const [posted, setPosted] = useState({}); // { [bookId]: true } -> đã gửi thành công

  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Lấy các đơn "đã giao" (FE gửi delivered, BE map -> completed)
        const res = await Orders.mine({ status: 'delivered', limit: 50 });
        const items = Array.isArray(res?.items) ? res.items : (res?.data?.items || res || []);
        setOrders(items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Flatten các sách có thể đánh giá từ các đơn đã giao
  const booksToReview = useMemo(() => {
    const out = [];
    for (const o of orders || []) {
      for (const it of (o.items || [])) {
        const bookId = it.bookId || it._id || it.id;
        if (!bookId) continue;
        out.push({
          orderId: o._id || o.id,
          orderCode: o.code || (o._id || '').slice(-6),
          orderAt: o.createdAt,
          bookId,
          title: it.title || it.name,
          image: it.image || it.coverUrl, // nếu BE đã có sẵn ảnh
          unitPrice: it.unitPrice ?? it.price ?? 0,
          qty: it.qty ?? it.quantity ?? 1,
        });
      }
    }
    // lọc trùng cùng bookId trong nhiều đơn (tuỳ bạn, ở đây giữ tất cả mục)
    return out;
  }, [orders]);

  // ✅ Lấy ảnh fallback cho những item thiếu ảnh (đơn cũ)
  const imgMap = useImageFallback(booksToReview);

  const onChangeForm = (bookId, patch) => {
    setForms(f => ({ ...f, [bookId]: { rating: 5, title:'', content:'', ...f[bookId], ...patch } }));
  };

  const submit = async (b) => {
    if (!user) return nav(`/login?next=${encodeURIComponent('/account/reviews')}`);
    const fv = forms[b.bookId] || {};
    if (!(fv.rating >= 1 && fv.rating <= 5)) return alert('Vui lòng chọn số sao (1-5)');
    try {
      onChangeForm(b.bookId, { posting: true });
      await Reviews.postReview(b.bookId, {
        rating: fv.rating,
        title: fv.title || '',
        content: fv.content || '',
        photos: [],
      });
      setPosted(p => ({ ...p, [b.bookId]: true }));
    } catch (e) {
      alert(e?.message || 'Gửi đánh giá thất bại');
    } finally {
      onChangeForm(b.bookId, { posting: false });
    }
  };

  return (
    <div className="bg-gray-50">
      {/* breadcrumb */}
      <div className="container px-4 pt-4 text-sm text-gray-500">
        <Link to="/" className="hover:underline">Trang chủ</Link>
        <span className="mx-2">›</span>
        <span>Đánh giá sản phẩm</span>
      </div>

      <div className="container px-4 py-6 grid lg:grid-cols-[280px,1fr] gap-6">
        {/* Sidebar đơn giản (giống Orders) */}
        <aside className="bg-white rounded-xl border shadow-sm">
          <div className="flex items-center gap-3 px-4 py-4 border-b">
            <div className="w-10 h-10 rounded-full bg-gray-100 grid place-items-center">👤</div>
            <div>
              <div className="text-xs text-gray-500">Tài khoản của</div>
              <div className="font-semibold text-gray-900">{user?.name || user?.email || 'Bạn'}</div>
            </div>
          </div>
          <nav className="p-2 text-[15px]">
            <Link to="/account/info" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
              <span className="w-6 text-center">👤</span> Thông tin tài khoản
            </Link>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100 text-gray-900 font-medium">
              <span className="w-6 text-center">⭐</span> Đánh giá sản phẩm
            </div>
            <Link to="/account/addresses" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
              <span className="w-6 text-center">📍</span> Sổ địa chỉ
            </Link>
            <Link to="/orders" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
              <span className="w-6 text-center">🧾</span> Đơn hàng của tôi
            </Link>
          </nav>
        </aside>

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
                const f = forms[b.bookId] || { rating: 5, title: '', content: '' };
                const isPosted = !!posted[b.bookId];
                const img = b.image || imgMap[b.bookId] || '/placeholder.jpg'; // ✅ ưu tiên item.image, fallback map
                return (
                  <div key={`${b.orderId}:${b.bookId}`} className="border rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={img}
                        onError={(e)=> { e.currentTarget.src='/placeholder.jpg'; }}
                        alt={b.title}
                        className="w-20 h-28 object-contain border rounded bg-white"
                      />
                      <div className="flex-1">
                        <div className="font-semibold">{b.title}</div>
                        <div className="text-sm text-gray-500">
                          Đơn #{String(b.orderCode).slice(-6)} • SL: {b.qty} • {money(b.unitPrice)}
                        </div>

                        {isPosted ? (
                          <div className="mt-3 text-green-600 font-medium">Bạn đã gửi đánh giá. Cảm ơn bạn!</div>
                        ) : (
                          <div className="mt-3 space-y-3">
                            <div>
                              <div className="text-sm text-gray-600 mb-1">Chọn số sao</div>
                              <StarsInput value={f.rating ?? 5} onChange={(v)=>onChangeForm(b.bookId, { rating: v })}/>
                            </div>
                            <div>
                              <input
                                className="input w-full"
                                placeholder="Tiêu đề (không bắt buộc)"
                                value={f.title || ''}
                                onChange={(e)=>onChangeForm(b.bookId, { title: e.target.value })}
                              />
                            </div>
                            <div>
                              <textarea
                                className="input w-full min-h-[96px]"
                                placeholder="Cảm nhận của bạn về sản phẩm…"
                                value={f.content || ''}
                                onChange={(e)=>onChangeForm(b.bookId, { content: e.target.value })}
                              />
                            </div>
                            <div className="flex items-center justify-end">
                              <button
                                onClick={()=>submit(b)}
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
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
