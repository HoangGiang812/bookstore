import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(-2).map(w => w[0]).join("").toUpperCase();

export default function Authors() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let ok = true;
    api
      .get("/authors", { params: { limit: 50, start: 0 } })
      .then((res) => {
        if (ok) setItems(Array.isArray(res) ? res : []);
      })
      .catch((e) => ok && setErr(e.message))
      .finally(() => ok && setLoading(false));
    return () => { ok = false; };
  }, []);

  if (loading) return <div className="container px-4 py-12 text-center">⏳ Đang tải tác giả…</div>;
  if (err) return <div className="container px-4 py-12 text-red-600 text-center">Lỗi: {err}</div>;

  return (
    <div className="container px-4 py-12">
      <h1 className="text-4xl font-bold mb-10 text-center">Tác giả</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
        {items.map((a) => (
          <Link
            key={a.id}
            to={`/authors/${a.id}`}
            className="group bg-white rounded-2xl border shadow-sm hover:shadow-lg transition overflow-hidden p-6 flex flex-col items-center text-center"
          >
            {/* Avatar tròn */}
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shadow mb-4">
              {a.avatar ? (
                <img
                  src={a.avatar}
                  alt={a.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <span className="text-lg font-semibold text-gray-500">{initials(a.name)}</span>
              )}
            </div>

            <h2 className="text-lg font-semibold group-hover:text-blue-600">{a.name}</h2>
            <p className="text-sm text-gray-500 mt-1">{a.bookCount || 0} tựa sách</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
