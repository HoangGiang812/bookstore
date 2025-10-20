// src/view/components/ReviewSection.jsx
import { useEffect, useState } from 'react';
import * as ReviewAPI from '../../services/reviews';
import RatingStars from './RatingStars';
import { useAuth } from '../../store/useAuth';

export default function ReviewSection({ bookId, onSummaryChanged }) {
  const { user } = useAuth();
  const [can, setCan] = useState(false);
  const [summary, setSummary] = useState({ avg: 0, cnt: 0 });
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const limit = 5;

  // load summary + quyền review + list
  useEffect(() => {
    if (!bookId) return;
    (async () => {
      try {
        const s = await ReviewAPI.getSummary(bookId);
        setSummary({ avg: Number(s?.avg || 0), cnt: Number(s?.cnt || 0) });
        onSummaryChanged?.(s);
      } catch {}
      try {
        if (user) {
          const c = await ReviewAPI.canReview(bookId);
          setCan(!!c?.ok);
        } else {
          setCan(false);
        }
      } catch {}
      await loadPage(0);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, user?._id]);

  async function loadPage(p = 0) {
    try {
      const r = await ReviewAPI.listReviews(bookId, { limit, skip: p * limit });
      setItems(r?.items || []);
      setPage(p);
    } catch {}
  }

  return (
    <section id="reviews" className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-semibold">Đánh giá & nhận xét</h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <RatingStars value={summary.avg} size={18} />
          <span>{Number(summary.avg || 0).toFixed(1)} · {summary.cnt} đánh giá</span>
        </div>
      </div>

      {user && can && <ReviewForm bookId={bookId} onDone={async () => {
        try {
          const s = await ReviewAPI.getSummary(bookId);
          setSummary({ avg: Number(s?.avg || 0), cnt: Number(s?.cnt || 0) });
          onSummaryChanged?.(s);
        } catch {}
        await loadPage(0);
      }} />}

      <ReviewList items={items} page={page} limit={limit} onPrev={() => loadPage(page - 1)} onNext={() => loadPage(page + 1)} />
    </section>
  );
}

function ReviewForm({ bookId, onDone }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  return (
    <div className="p-4 border rounded-lg mb-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm">Đánh giá:</span>
        {[1,2,3,4,5].map(n=>(
          <button key={n} onClick={()=>setRating(n)}
                  className={`w-8 h-8 rounded-full ${rating>=n?'bg-amber-400':'bg-gray-200'}`} />
        ))}
        <span className="text-sm text-gray-600">{rating} sao</span>
      </div>
      <input className="input w-full mb-2" placeholder="Tiêu đề ngắn" value={title} onChange={e=>setTitle(e.target.value)} />
      <textarea className="input w-full min-h-[90px]" placeholder="Nhận xét của bạn…" value={content} onChange={e=>setContent(e.target.value)} />
      <div className="mt-2 flex justify-end">
        <button className="btn-primary" onClick={async ()=>{
          if (!(rating >= 1 && rating <= 5)) return;
          try {
            await ReviewAPI.postReview(bookId, { rating, title, content, photos: [] });
            setTitle(''); setContent('');
            onDone?.();
          } catch (e) {
            console.error(e);
            alert('Gửi đánh giá thất bại');
          }
        }}>Gửi đánh giá</button>
      </div>
    </div>
  );
}

function ReviewList({ items, page, limit, onPrev, onNext }) {
  const total = items.length < limit && page === 0 ? items.length : undefined; // không biết total -> chỉ phân trang đơn giản
  return (
    <div className="space-y-3">
      {items.map(rv=>(
        <div key={rv._id} className="p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <img src={rv.userId?.avatar || '/avatar.png'}
                 onError={e=>{e.currentTarget.src='/avatar.png'}}
                 className="w-8 h-8 rounded-full object-cover" />
            <div>
              <div className="font-medium">{rv.userId?.name || rv.userId?.email || 'Người dùng'}</div>
              <div className="text-xs text-gray-500">{new Date(rv.createdAt).toLocaleString('vi-VN')}</div>
            </div>
            <div className="ml-auto text-amber-400">{'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}</div>
          </div>
          {rv.title && <div className="mt-2 font-medium">{rv.title}</div>}
          {rv.content && <div className="mt-1 text-sm text-gray-700 whitespace-pre-line">{rv.content}</div>}
        </div>
      ))}
      {items.length === 0 && <div className="text-gray-600">Chưa có nhận xét nào</div>}

      {/* Điều hướng đơn giản: nếu backend trả total thì bạn có thể thay bằng paginator hoàn chỉnh */}
      <div className="flex justify-center gap-2 pt-2">
        <button className="btn bg-gray-100 hover:bg-gray-200" disabled={page===0} onClick={onPrev}>Trước</button>
        <button className="btn bg-gray-100 hover:bg-gray-200" disabled={items.length < limit} onClick={onNext}>Sau</button>
      </div>
    </div>
  );
}
