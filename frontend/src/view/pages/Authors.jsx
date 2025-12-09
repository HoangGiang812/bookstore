import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAuthors } from "../../services/author";
import { Search, ChevronLeft, ChevronRight, Users, PenTool } from "lucide-react";

// Helper tạo avatar chữ cái đầu
const initials = (name = "") =>
  name.trim().split(/\s+/).slice(-2).map(w => w[0]).join("").toUpperCase();

// Helper tạo slug (giữ nguyên logic của bạn)
const slugify = (s = "") =>
  s.toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");

const LIMIT = 12; // Số lượng tác giả mỗi trang

export default function Authors() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  
  // State cho tìm kiếm và phân trang
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0); // Tổng số tác giả (nếu API trả về)

  // Debounce tìm kiếm (đợi người dùng gõ xong mới tìm)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 500); // Delay 500ms
    return () => clearTimeout(timer);
  }, [page, search]);

  // Reset về trang 1 khi search thay đổi
  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const loadData = async () => {
    setLoading(true);
    setErr("");
    try {
      const offset = (page - 1) * LIMIT;
      
      // Gọi API
      const res = await fetchAuthors(LIMIT, offset, search);
      
      // LOGIC XỬ LÝ DỮ LIỆU MỚI
      if (res && res.items) {
        // Trường hợp Backend trả về { items: [...], total: 100 } (Code mới)
        setItems(res.items);
        setTotal(res.total); 
      } else if (Array.isArray(res)) {
        // Fallback trường hợp Backend chưa update (Code cũ trả về mảng)
        setItems(res);
        // Đoán total tạm thời
        setTotal(res.length < LIMIT ? offset + res.length : offset + LIMIT + 1);
      }
    } catch (e) {
      setErr(e?.message || "Không thể tải danh sách tác giả");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* --- HEADER SECTION --- */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="text-violet-600" /> Tác Giả & Nghệ Sĩ
              </h1>
              <p className="text-sm text-gray-500 mt-1">Khám phá những ngòi bút làm nên kiệt tác</p>
            </div>

            {/* Thanh tìm kiếm đẹp hơn */}
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-violet-600 transition-colors" size={18} />
              <input 
                type="text" 
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-transparent focus:bg-white border focus:border-violet-500 rounded-xl outline-none transition-all shadow-sm"
                placeholder="Tìm kiếm tên tác giả..."
                value={search}
                onChange={handleSearch}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        
        {/* --- ERROR STATE --- */}
        {err && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-center mb-8">
            Đã có lỗi xảy ra: {err}
          </div>
        )}

        {/* --- CONTENT GRID --- */}
        {loading ? (
          // Skeleton Loading (Hiệu ứng khung xương khi tải)
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[...Array(LIMIT)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col items-center animate-pulse">
                <div className="w-24 h-24 bg-gray-200 rounded-full mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <PenTool size={48} className="mx-auto mb-3 opacity-20"/>
            <p>Không tìm thấy tác giả nào phù hợp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {items.map((a) => {
              const name = a.name || "Tác giả ẩn danh";
              const slug = (a.slug && a.slug !== "undefined") ? a.slug : slugify(name);
              const href = `/authors/${encodeURIComponent(slug)}`;

              return (
                <Link
                  key={a._id || slug}
                  to={href}
                  className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden"
                >
                  {/* Trang trí nền mờ */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>

                  <div className="w-24 h-24 mb-4 relative">
                    <div className="w-full h-full rounded-full overflow-hidden border-4 border-gray-50 shadow-inner group-hover:border-violet-100 transition-colors">
                      {(a.avatar || a.avatarUrl) ? (
                        <img
                          src={a.avatar || a.avatarUrl}
                          alt={name}
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.src = "/placeholder.png")}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 font-bold text-xl">
                          {initials(name)}
                        </div>
                      )}
                    </div>
                    {/* Badge icon nhỏ */}
                    <div className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow border border-gray-100 text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                        <PenTool size={12} />
                    </div>
                  </div>

                  <h3 className="text-gray-900 font-bold text-base group-hover:text-violet-700 transition-colors line-clamp-2">
                    {name}
                  </h3>
                  
                  {/* Nếu API có trả về số lượng sách thì hiện ở đây */}
                  {a.bookCount !== undefined && (
                    <span className="text-xs text-gray-500 mt-1 bg-gray-100 px-2 py-0.5 rounded-full">
                        {a.bookCount} tác phẩm
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* --- PAGINATION (PHÂN TRANG) --- */}
        {!loading && (items.length > 0 || page > 1) && (
          <div className="mt-12 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 pb-10">
            
            <div className="flex items-center bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm">
                {/* Nút Trang Trước */}
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-3 rounded-xl hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all active:scale-90"
                  title="Trang trước"
                >
                  <ChevronLeft size={20} />
                </button>

                {/* Hiển thị số trang: Trang X / Y */}
                <div className="px-6 py-2 text-sm font-bold text-gray-700 min-w-[140px] text-center select-none border-x border-gray-100">
                  <span className="text-gray-400 font-medium mr-2">Trang</span>
                  <span className="text-violet-600 text-lg">{page}</span>
                  <span className="text-gray-300 mx-2 text-xl font-light">/</span>
                  <span className="text-gray-500">{totalPages || 1}</span>
                </div>

                {/* Nút Trang Sau */}
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages}
                  className="p-3 rounded-xl hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all active:scale-90"
                  title="Trang sau"
                >
                  <ChevronRight size={20} />
                </button>
            </div>

            {/* Thông tin phụ: Tổng số lượng */}
            <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                Đang hiển thị {items.length} kết quả
                {total > 0 && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span>Tổng cộng <b>{total}</b> tác giả</span>
                  </>
                )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}