import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../store/useAuth";
import * as Reviews from "../../services/reviews";
import * as Orders from "../../services/orders";
import * as Catalog from "../../services/catalog";
import { Star } from "lucide-react";

const money = (n) => (Number(n || 0)).toLocaleString("vi-VN") + "đ";

export default function AccountComments() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);      // [{_id, bookId, book:{title,coverUrl}, rating, title, content,...}]
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null); // bookId đang edit
  const [form, setForm] = useState({ rating: 5, title: "", content: "" });

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        // 1) Thử endpoint chuẩn: /api/reviews/mine
        try {
          const mine = await Reviews.listMine({ limit: 100, skip: 0 });
          setItems(await ensureCovers(mine));
        } catch {
          // 2) Fallback: gom từ các đơn đã giao rồi lấy myReview(bookId)
          const res = await Orders.mine({ status: "delivered", limit: 50 });
          const orders = Array.isArray(res?.items) ? res.items : (res?.data?.items || res || []);
          const bookIds = [];
          for (const o of orders || []) {
            for (const it of (o.items || [])) {
              const id = it.bookId || it._id || it.id;
              if (id) bookIds.push(String(id));
            }
          }
          const uniq = [...new Set(bookIds)];
          const mine = [];
          await Promise.all(uniq.map(async (id) => {
            try {
              const r = await Reviews.myReview(id);
              if (r && r._id) {
                mine.push({
                  _id: r._id,
                  bookId: id,
                  book: r.book || null,
                  rating: r.rating,
                  title: r.title || "",
                  content: r.content || "",
                  createdAt: r.createdAt,
                  updatedAt: r.updatedAt,
                  verifiedPurchase: !!r.verifiedPurchase,
                });
              }
            } catch {}
          }));
          setItems(await ensureCovers(mine));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user?._id]);

  // Đảm bảo có ảnh bìa cho mỗi review
  async function ensureCovers(list) {
    const out = [...(list || [])];
    await Promise.all(out.map(async (it, i) => {
      const hasCover = it.book?.coverUrl || it.book?.image;
      if (!hasCover && it.bookId) {
        try {
          const b = await Catalog.getBook(it.bookId);
          out[i].book = {
            ...(out[i].book || {}),
            title: out[i].book?.title || b.title,
            coverUrl: b.coverUrl || b.image || "",
          };
        } catch {}
      }
    }));
    return out;
  }

  // search client-side
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return items;
    return items.filter(x => {
      const t = (x.book?.title || "").toLowerCase();
      const c = (x.content || "").toLowerCase();
      const tt = (x.title || "").toLowerCase();
      return t.includes(kw) || c.includes(kw) || tt.includes(kw);
    });
  }, [q, items]);

  const startEdit = (it) => {
    setEditing(it.bookId);
    setForm({ rating: it.rating, title: it.title || "", content: it.content || "" });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ rating: 5, title: "", content: "" });
  };

  const saveEdit = async (bookId) => {
    try {
      await Reviews.postReview(bookId, {
        rating: form.rating,
        title: form.title || "",
        content: form.content || "",
      }); // upsert
      // cập nhật local
      setItems(list => list.map(x => x.bookId === bookId ? { ...x, rating: form.rating, title: form.title, content: form.content, updatedAt: new Date().toISOString() } : x));
      cancelEdit();
    } catch (e) {
      alert(e?.message || "Cập nhật nhận xét thất bại");
    }
  };

  const removeReview = async (bookId) => {
    if (!confirm("Bạn muốn xoá nhận xét này?")) return;
    try {
      await Reviews.deleteMine(bookId);
      setItems(list => list.filter(x => x.bookId !== bookId));
    } catch (e) {
      alert(e?.message || "Xoá nhận xét thất bại");
    }
  };

  return (
    <div className="container px-4 py-6 grid lg:grid-cols-[280px,1fr] gap-6">
      {/* Sidebar */}
      <aside className="bg-white rounded-xl border shadow-sm">
        <div className="flex items-center gap-3 px-4 py-4 border-b">
          <div className="w-10 h-10 rounded-full bg-gray-100 grid place-items-center">👤</div>
          <div>
            <div className="text-xs text-gray-500">Tài khoản của</div>
            <div className="font-semibold">{user?.name || user?.email || "Bạn"}</div>
          </div>
        </div>
        <nav className="p-2 text-[15px]">
          <Link to="/account/info" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
            <span className="w-6 text-center">👤</span> Thông tin tài khoản
          </Link>
          <Link to="/account/reviews" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
            <span className="w-6 text-center">⭐</span> Đánh giá sản phẩm
          </Link>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100 font-medium">
            <span className="w-6 text-center">💬</span> Nhận xét của tôi
          </div>
          <Link to="/account/addresses" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
            <span className="w-6 text-center">📍</span> Sổ địa chỉ
          </Link>
          <Link to="/orders" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
            <span className="w-6 text-center">🧾</span> Quản lý đơn hàng
          </Link>
        </nav>
      </aside>

      {/* Content */}
      <section className="bg-white rounded-xl border shadow-sm p-5">
        <h1 className="text-2xl font-semibold mb-4">Nhận xét của tôi</h1>

        {/* Search */}
        <div className="mb-4">
          <input
            className="input w-full"
            placeholder="Tìm nhận xét theo Tên sách hoặc nội dung…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-gray-600">Đang tải…</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-600">Bạn chưa có nhận xét nào.</div>
        ) : (
          <div className="space-y-4">
            {filtered.map((it) => {
              const cover = it.book?.coverUrl || it.book?.image || "/placeholder.jpg";
              const bookTitle = it.book?.title || "Sách (đang cập nhật)";
              const isEdit = editing === it.bookId;

              return (
                <div key={it._id || it.bookId} className="border rounded-lg p-4">
                  <div className="flex gap-4">
                    <img
                      src={cover}
                      onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
                      className="w-16 h-24 object-contain border rounded bg-white"
                      alt={bookTitle}
                    />
                    <div className="flex-1">
                      <div className="font-semibold mb-1">{bookTitle}</div>

                      {!isEdit ? (
                        <>
                          <div className="flex items-center gap-2 text-amber-500">
                            {"★".repeat(it.rating)}{"☆".repeat(5 - it.rating)}
                          </div>
                          {it.title && <div className="mt-2 font-medium">{it.title}</div>}
                          {it.content && <div className="mt-1 text-sm text-gray-700 whitespace-pre-line">{it.content}</div>}

                          <div className="mt-3 flex gap-2">
                            <button className="btn bg-gray-100 hover:bg-gray-200" onClick={() => startEdit(it)}>
                              Sửa
                            </button>
                            <button className="btn bg-rose-100 text-rose-700 hover:bg-rose-200" onClick={() => removeReview(it.bookId)}>
                              Xoá
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Edit form inline */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-gray-600">Đánh giá:</span>
                            {[1,2,3,4,5].map(n=>(
                              <button
                                key={n}
                                type="button"
                                onClick={() => setForm(f => ({ ...f, rating: n }))}
                                className={`p-1 ${form.rating >= n ? "text-yellow-400" : "text-gray-300"}`}
                                aria-label={`${n} sao`}
                              >
                                <Star className={`w-5 h-5 ${form.rating >= n ? "fill-yellow-400" : ""}`} />
                              </button>
                            ))}
                          </div>
                          <input
                            className="input w-full mb-2"
                            placeholder="Tiêu đề (không bắt buộc)"
                            value={form.title}
                            onChange={(e)=>setForm(f => ({ ...f, title: e.target.value }))}
                          />
                          <textarea
                            className="input w-full min-h-[90px]"
                            placeholder="Nội dung nhận xét…"
                            value={form.content}
                            onChange={(e)=>setForm(f => ({ ...f, content: e.target.value }))}
                          />
                          <div className="mt-2 flex gap-2">
                            <button className="btn-primary" onClick={() => saveEdit(it.bookId)}>Lưu</button>
                            <button className="btn" onClick={cancelEdit}>Huỷ</button>
                          </div>
                        </>
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
  );
}
