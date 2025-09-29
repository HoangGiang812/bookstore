// src/view/pages/AuthorDetail.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../services/api";
import {
  Star,
  BookOpen,
  Users,
  Calendar,
  Grid,
  List,
  Search,
} from "lucide-react";
import BookCard from "../components/BookCard";

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(-2).map(w => w[0]).join("").toUpperCase();

export default function AuthorDetail() {
  // Hỗ trợ cả route /authors/:slug và /authors/:id
  const { slug, id } = useParams();
  const authorKey = slug ?? id;

  const [author, setAuthor] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popularity");
  const [searchText, setSearchText] = useState("");

  // unwrap cho hợp cả axios ({data}) và fetch (json)
  const unwrap = (res) => (res && typeof res === "object" && "data" in res ? res.data : res) ?? null;

  useEffect(() => {
    if (!authorKey) return;
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        // 1) Lấy tác giả theo slug; nếu fail thử theo id
        let authorRes;
        try {
          authorRes = await api.get(`/authors/${encodeURIComponent(authorKey)}`);
        } catch {
          authorRes = await api.get(`/authors/id/${encodeURIComponent(authorKey)}`);
        }
        if (!alive) return;

        const a = unwrap(authorRes);
        setAuthor(a || null);
        if (!a?.name) {
          setBooks([]);
          return;
        }

        // 2) Lấy sách theo authorName; nếu BE chưa hỗ trợ, fallback q=authorName
        let booksRes;
        try {
          booksRes = await api.get("/books", { params: { authorName: a.name, limit: 60, start: 0 } });
        } catch {
          booksRes = await api.get("/books", { params: { q: a.name, limit: 60, start: 0 } });
        }
        if (!alive) return;

        const br = unwrap(booksRes);
        const list = Array.isArray(br?.items) ? br.items : (Array.isArray(br) ? br : []);
        setBooks(Array.isArray(list) ? list : []);
      } catch (e) {
        if (alive) setErr(e?.message || "Load author failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [authorKey]);

  if (loading) return <div className="container px-4 py-12 text-center">⏳ Đang tải thông tin tác giả…</div>;
  if (err) return <div className="container px-4 py-12 text-red-600 text-center">Lỗi: {err}</div>;
  if (!author) return <div className="container px-4 py-12 text-center">Không tìm thấy tác giả</div>;

  // Lọc & sắp xếp
  const filteredBooks = books.filter(b =>
    (filterCategory === "all" || b.category === filterCategory) &&
    (searchText === "" || b.title?.toLowerCase().includes(searchText.toLowerCase()))
  );

  const sortedBooks = [...filteredBooks].sort((a, b) => {
    switch (sortBy) {
      case "rating": return (b.rating || 0) - (a.rating || 0);
      case "price-low": return (a.price || 0) - (b.price || 0);
      case "price-high": return (b.price || 0) - (a.price || 0);
      case "newest": return (b.publishYear || 0) - (a.publishYear || 0);
      default: return (b.reviews || 0) - (a.reviews || 0); // popularity
    }
  });

  // ✅ Hiển thị số tác phẩm: ưu tiên bookCount > 0, nếu không dùng books.length
  const displayBookCount =
    typeof author?.bookCount === "number" && author.bookCount > 0
      ? author.bookCount
      : books.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header tác giả */}
      <div className="bg-white shadow-sm mb-8">
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row gap-8">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shadow">
            {author.avatar ? (
              <img src={author.avatar} alt={author.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl md:text-3xl font-semibold text-gray-500">{initials(author.name)}</span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{author.name}</h1>
            <p className="text-gray-600 mb-4">{displayBookCount} tựa sách</p>
            {author.bio && <p className="text-gray-500 leading-relaxed mb-4">{author.bio}</p>}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <BookOpen className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <div className="text-lg font-bold">{displayBookCount}</div>
                <div className="text-sm text-gray-600">Tác phẩm</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Users className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <div className="text-lg font-bold">{(author.followers ?? 0).toLocaleString()}</div>
                <div className="text-sm text-gray-600">Người theo dõi</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <Star className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                <div className="text-lg font-bold">{author.averageRating ?? "-"}</div>
                <div className="text-sm text-gray-600">Đánh giá TB</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <div className="text-lg font-bold">{author.nationality || "?"}</div>
                <div className="text-sm text-gray-600">Quốc tịch</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Books section */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Tác phẩm của {author.name}</h2>
            <p className="text-gray-600">Khám phá {sortedBooks.length} cuốn sách từ tác giả này</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg ${viewMode==="grid" ? "bg-blue-600 text-white":"bg-gray-100"}`}>
              <Grid className="w-5 h-5"/>
            </button>
            <button onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg ${viewMode==="list" ? "bg-blue-600 text-white":"bg-gray-100"}`}>
              <List className="w-5 h-5"/>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input
              type="text"
              value={searchText}
              onChange={e=>setSearchText(e.target.value)}
              placeholder="Tìm kiếm sách..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg">
            <option value="all">Tất cả thể loại</option>
            {[...new Set(books.map(b=>b.category).filter(Boolean))].map(c=>(
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg">
            <option value="popularity">Phổ biến nhất</option>
            <option value="rating">Đánh giá cao</option>
            <option value="price-low">Giá thấp → cao</option>
            <option value="price-high">Giá cao → thấp</option>
            <option value="newest">Mới nhất</option>
          </select>
        </div>

        {viewMode==="grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedBooks.map(b=>(
              <BookCard key={b.id || b._id} book={b}/>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedBooks.map(b=>(
              <div key={b.id || b._id} className="p-4 bg-white rounded-lg shadow">
                <BookCard book={b}/>
              </div>
            ))}
          </div>
        )}
        {sortedBooks.length===0 && <div className="text-gray-500">Chưa có sách.</div>}
      </div>
    </div>
  );
}
