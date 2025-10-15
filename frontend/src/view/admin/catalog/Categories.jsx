// src/view/components/CategoryMenu.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";

export default function CategoryMegaMenu({ open, setOpen, anchorRef }) {
  const panelRef = useRef(null);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [hoverIndex, setHoverIndex] = useState(0);
  const [panelStyle, setPanelStyle] = useState({}); // neo dưới nút "Sách"

  // Lấy danh mục từ BE (khi mở)
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true); setErr("");
      try {
        // /api/categories/tree trả về MẢNG root categories (mỗi item có children)
        const data = await api.get("/categories/tree");
        // Hỗ trợ cả 2 dạng: [{...}] hoặc { items: [...] }
        const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        if (mounted) setCats(items);
      } catch {
        if (mounted) { setErr("Không tải được danh mục"); setCats([]); }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (open) run();
    return () => { mounted = false; };
  }, [open]);

  // Bảo đảm hoverIndex hợp lệ
  useEffect(() => {
    if (!Array.isArray(cats) || cats.length === 0) { setHoverIndex(0); return; }
    if (hoverIndex < 0 || hoverIndex >= cats.length) setHoverIndex(0);
  }, [cats, hoverIndex]);

  // Neo panel dưới nút "Sách"
  useEffect(() => {
    if (!open) return;
    const a = anchorRef?.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    setPanelStyle({
      position: "fixed",
      top: `${r.bottom + 6}px`,
      left: `${r.left}px`,
      minWidth: "640px",
      maxWidth: "90vw",
      zIndex: 50
    });
  }, [open, anchorRef]);

  // Đóng khi click ra ngoài
  useEffect(() => {
    const onDocClick = (e) => {
      if (!open) return;
      const p = panelRef.current;
      const a = anchorRef?.current;
      if (p && p.contains(e.target)) return;
      if (a && a.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open, setOpen, anchorRef]);

  const roots = useMemo(() => cats || [], [cats]);
  const activeChildren = useMemo(
    () => (roots?.[hoverIndex]?.children || []),
    [roots, hoverIndex]
  );

  return (
    <div
      ref={panelRef}
      style={panelStyle}
      className={
        "bg-white border rounded-2xl shadow-xl transition-[opacity,transform] " +
        (open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none")
      }
      onMouseLeave={() => setOpen(false)}
      role="dialog"
      aria-label="Danh mục sách"
    >
      <div className="p-4 w-full">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Danh mục</div>
          {loading && <div className="text-xs text-gray-500">Đang tải…</div>}
        </div>

        {err && !loading && (
          <div className="text-sm text-rose-600 mb-2">{err}</div>
        )}

        {roots.length === 0 && !loading ? (
          <div className="text-sm text-gray-600">Chưa có danh mục.</div>
        ) : (
          <div className="flex gap-4">
            {/* Cột trái: danh mục cha */}
            <div className="w-64 max-h-[60vh] overflow-auto pr-2 border-r">
              <ul className="space-y-1">
                {roots.map((cat, idx) => {
                  const catKey = String(cat._id || cat.slug);
                  // Nhấn vào danh mục cha -> hiển thị TẤT CẢ sách của mọi danh mục con
                  // Nếu bạn không có route /categories/:slug, đổi thành: `/search?category=${encodeURIComponent(cat.slug)}`
                  const catHref = `/categories/${cat.slug || cat._id}?deep=1`;
                  const active = idx === hoverIndex;
                  return (
                    <li key={catKey}>
                      <Link
                        to={catHref}
                        onMouseEnter={() => setHoverIndex(idx)}
                        onFocus={() => setHoverIndex(idx)}
                        onClick={() => setOpen(false)}
                        className={
                          "block px-3 py-2 rounded-lg hover:bg-gray-100 " +
                          (active ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-800")
                        }
                      >
                        {cat.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Panel phải: danh mục con */}
            <div className="min-w-[360px] max-w-[56vw]">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeChildren.length === 0 ? (
                  <div className="text-sm text-gray-500 px-1 py-2">Danh mục này chưa có mục con.</div>
                ) : (
                  activeChildren.map((sub, i) => {
                    const subKey = String(sub._id || sub.slug);
                    const subHref = `/categories/${sub.slug || sub._id}`;
                    return (
                      <Link
                        key={subKey}
                        to={subHref}
                        className="block p-3 rounded-lg border hover:border-purple-300 hover:bg-purple-50/50 cat-slide-in"
                        style={{ animationDelay: `${i * 40}ms` }}
                        onClick={() => setOpen(false)}
                      >
                        <div className="font-medium text-gray-900">{sub.name}</div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CSS hiệu ứng */}
      <style>{`
        @keyframes catSlideRight {
          0% { opacity: 0; transform: translateX(-8px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .cat-slide-in {
          animation: catSlideRight .25s ease-out both;
        }
      `}</style>
    </div>
  );
}
