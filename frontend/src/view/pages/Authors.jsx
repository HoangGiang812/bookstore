// src/view/pages/Authors.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAuthors } from "../../services/author";

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(-2).map(w => w[0]).join("").toUpperCase();

// Fallback đề phòng item nào đó thiếu slug
const slugify = (s = "") =>
  s.toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");

export default function Authors() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let ok = true;
    fetchAuthors(50, 0, "")
      .then((list) => {
        if (!ok) return;
        const arr = Array.isArray(list) ? list : [];
        setItems(arr);
      })
      .catch((e) => ok && setErr(e?.message || "Fetch authors failed"))
      .finally(() => ok && setLoading(false));
    return () => { ok = false; };
  }, []);

  if (loading) return <div className="container px-4 py-12 text-center">⏳ Đang tải tác giả…</div>;
  if (err) return <div className="container px-4 py-12 text-red-600 text-center">Lỗi: {err}</div>;

  return (
    <div className="container px-4 py-12">
      <h1 className="text-4xl font-bold mb-10 text-center">Tác giả</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
        {items.map((a) => {
          const name = a.name || "";
          const slug = (a.slug && a.slug !== "undefined" && a.slug.trim()) || slugify(name);
          const href = `/authors/${encodeURIComponent(slug)}`;

          return (
            <Link
              key={slug}
              to={href}
              className="group bg-white rounded-2xl border shadow-sm hover:shadow-lg transition overflow-hidden p-6 flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shadow mb-4">
                {(a.avatar || a.avatarUrl) ? (
                  <img
                    src={a.avatar || a.avatarUrl}
                    alt={name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => (e.currentTarget.src = "/placeholder.png")}
                  />
                ) : (
                  <span className="text-lg font-semibold text-gray-500">{initials(name)}</span>
                )}
              </div>

              <h2 className="text-lg font-semibold group-hover:text-blue-600">{name}</h2>
              <p className="text-sm text-gray-500 mt-1">{a.bookCount || 0} tựa sách</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
