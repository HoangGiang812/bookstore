// src/view/pages/Categories.jsx
import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { Search, Grid, List, Filter, ChevronDown, ChevronRight, Star, Check } from "lucide-react";
import api from "../../services/api";
import DealCard from "../components/DealCard";
import { useCart } from "../../store/useCart";
import { useAuth } from "../../store/useAuth";
import * as CartSvc from "../../services/cart";

/* ===== Helpers Utility ===== */
// 1. Hàm đệ quy dựng cây danh mục từ danh sách phẳng
function buildCategoryTree(items) {
  const map = {};
  const roots = [];

  // Khởi tạo map
  items.forEach((item) => {
    map[item._id] = { ...item, children: [] };
  });

  // Xếp cha con
  items.forEach((item) => {
    // Kiểm tra parentId (có thể là string hoặc object tùy API trả về)
    const pId = typeof item.parentId === 'object' ? item.parentId?._id : item.parentId;
    
    if (pId && map[pId]) {
      map[pId].children.push(map[item._id]);
    } else {
      roots.push(map[item._id]); // Không có cha -> Là Root
    }
  });

  return roots;
}

const normalize = (s = "") =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toNumber = (v) =>
  typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[^\d]/g, "")) || 0 : 0;

function mapBook(b) {
  const categoryObj = b.category || b.categoryId || b.categoryRef || null;
  const catName = categoryObj?.name || b.categoryName || (Array.isArray(b.categories) ? b.categories[0]?.name : b.category) || "Khác";
  const originalPrice = toNumber(b?.price ?? 0);
  const discountPercent = toNumber(b?.discountPercent ?? b?.discount ?? 0);
  const hasDiscount = discountPercent > 0 && originalPrice > 0;
  const price = toNumber(b?.salePrice ?? 0) > 0
    ? toNumber(b.salePrice)
    : (hasDiscount ? Math.round(originalPrice * (1 - discountPercent / 100)) : originalPrice);

  return {
    id: b._id || b.id || b.bookId,
    slug: b.slug || null,
    title: b.title || b.name || "—",
    author:
      b.author?.name ||
      b.authorName ||
      (Array.isArray(b.authors) ? b.authors[0]?.name : b.author) ||
      "—",

    price: price,
    originalPrice: originalPrice,
    rating: Number(b.ratingAvg || b.rating || 0),
    reviewCount: b.reviewsCount ?? b.reviewCount ?? b.ratingCnt ?? 0,
    discount: discountPercent, 
    discountPercent: discountPercent, 
    category: catName,
    categorySlug: categoryObj?.slug || b.categorySlug || normalize(catName),
    image:
      b.images?.[0]?.url ||
      b.cover?.url ||
      b.coverUrl ||
      b.image ||
      "/placeholder.png",
  };
}

const extractItems = (payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (payload.items && Array.isArray(payload.items)) return payload.items;
    if (payload.data && Array.isArray(payload.data)) return payload.data;
    return [];
};

const BOOK_ENDPOINTS = ["/books", "/book", "/public/books", "/store/books", "/products"];
async function fetchBooksWithFallback(params) {
  let lastErr;
  for (const path of BOOK_ENDPOINTS) {
    try {
      const res = await api.get(path, { params });
      const items = extractItems(res);
      return { items };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("Không tìm thấy endpoint sách phù hợp");
}

/* ===================== COMPONENT: Category Node (Recursive) ===================== */
const CategoryNode = ({ node, currentSlug, onSelect, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  
  // Tự động mở nếu con đang được chọn
  useEffect(() => {
      const isActive = node.slug === currentSlug;
      const hasActiveChild = (n) => n.children.some(c => c.slug === currentSlug || hasActiveChild(c));
      if (isActive || hasActiveChild(node)) setIsOpen(true);
  }, [currentSlug, node]);

  const isSelected = node.slug === currentSlug;

  return (
    <div className="select-none">
      <div 
        className={`flex items-center justify-between py-2 px-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-100 text-gray-700'}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={(e) => {
            e.stopPropagation();
            onSelect(node.slug);
        }}
      >
        <span className="text-sm truncate flex-1">{node.name}</span>
        {hasChildren && (
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="p-1 hover:bg-gray-200 rounded-full text-gray-400"
            >
                {isOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
            </button>
        )}
      </div>
      
      {/* Render con đệ quy */}
      {hasChildren && isOpen && (
        <div className="border-l border-gray-100 ml-4">
            {node.children.map(child => (
                <CategoryNode 
                    key={child._id} 
                    node={child} 
                    currentSlug={currentSlug} 
                    onSelect={onSelect} 
                    level={level + 1} 
                />
            ))}
        </div>
      )}
    </div>
  );
};

/* ===================== PAGE MAIN ===================== */
export default function Categories() {
  const [layout, setLayout] = useState("grid");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [catSlug, setCatSlug] = useState("all");
  const [author, setAuthor] = useState("all");
  const [rating, setRating] = useState(0);

  const [categoryTree, setCategoryTree] = useState([]); // Lưu dạng cây
  const [flatCategories, setFlatCategories] = useState([]); // Lưu dạng phẳng để tìm kiếm nếu cần
  const [authors, setAuthors] = useState(["all"]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const PER_PAGE = 12; // Số lượng đẹp cho lưới 3,4 cột
  const [page, setPage] = useState(1);

  const [sp] = useSearchParams();
  const cart = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const params = useParams();

  // 1. Khởi tạo params từ URL
  useEffect(() => {
    const q = sp.get("q");
    const s = sp.get("sort");
    const by = sp.get("by");
    const val = sp.get("value");
    if (q) setSearch(q);
    if (s) setSort(s);
    if (by === 'category' && val) setCatSlug(normalize(val));
    // eslint-disable-next-line
  }, []);

  // 2. Sync URL params slug
  useEffect(() => {
    if (params.slug) setCatSlug(params.slug);
    else if (!sp.get("by")) setCatSlug("all");
  }, [params.slug, sp]);

  // 3. Fetch Categories & Build Tree
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/categories", { params: { active: true } });
        const items = extractItems(res);
        setFlatCategories(items);
        
        // Xây dựng cây
        const tree = buildCategoryTree(items);
        setCategoryTree(tree);
      } catch (e) { console.error("Load Cat Error", e); }
    })();
  }, []);

  // 4. Fetch Books
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setErr("");
      try {
        const deepFlag = true; // Luôn tìm sâu (bao gồm danh mục con)
        const p = {
          q: search || undefined,
          sort,
          categorySlug: catSlug !== "all" ? catSlug : undefined,
          deep: deepFlag ? 1 : undefined,
          limit: 300, // Lấy nhiều để filter client cho mượt (demo)
        };
        
        const { items } = await fetchBooksWithFallback(p);
        if (cancelled) return;
        
        const mapped = items.map(mapBook);
        
        // Lấy list tác giả từ kết quả hiện tại
        const aSet = new Set(mapped.map((b) => b.author).filter(Boolean));
        setAuthors(["all", ...Array.from(aSet).sort()]);
        
        setBooks(mapped);
        setPage(1);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Không thể tải dữ liệu sách");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [search, sort, catSlug]);

  // 5. Filter Client-side (cho mượt)
  const filtered = useMemo(() => {
    let f = [...books];
    if (author !== "all") f = f.filter((b) => b.author === author);
    if (rating > 0) f = f.filter((b) => Math.floor(b.rating || 0) >= rating);
    
    // Sort client bổ sung (nếu BE sort chưa chuẩn)
    switch (sort) {
      case "price-asc": f.sort((a, b) => a.price - b.price); break;
      case "price-desc": f.sort((a, b) => b.price - a.price); break;
      case "bestseller": f.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0)); break;
      default: break; // BE đã sort newest
    }
    return f;
  }, [books, author, rating, sort]);

  // Pagination
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page, PER_PAGE]);

  // Actions
  const handleAdd = (bk) => {
    cart.add(bk, 1);
    try {
        localStorage.setItem("__cart_bump__", String(Date.now()));
        window.dispatchEvent(new Event("storage"));
    } catch {}
  };

  const handleBuy = (bk) => {
    cart.add(bk, 1);
    CartSvc.setBuyNow({ id: bk.id, qty: 1 });
    if (!user) nav(`/login?next=${encodeURIComponent("/cart?buy=1")}`);
    else nav("/cart?buy=1");
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-8">
      <div className="container mx-auto px-4">
        
        {/* --- Header Area --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Tủ sách</h1>
                <p className="text-sm text-gray-500 mt-1">Tìm thấy <strong>{filtered.length}</strong> quyển sách phù hợp</p>
            </div>
            
            <div className="flex items-center gap-3">
                {/* Layout Switcher */}
                <div className="bg-white p-1 rounded-lg border shadow-sm flex">
                    <button onClick={() => setLayout("grid")} className={`p-2 rounded-md transition ${layout === "grid" ? "bg-blue-100 text-blue-600 shadow-inner" : "text-gray-400 hover:text-gray-600"}`}>
                        <Grid size={18} />
                    </button>
                    <button onClick={() => setLayout("list")} className={`p-2 rounded-md transition ${layout === "list" ? "bg-blue-100 text-blue-600 shadow-inner" : "text-gray-400 hover:text-gray-600"}`}>
                        <List size={18} />
                    </button>
                </div>

                {/* Sort Dropdown (Custom Style) */}
                <div className="relative">
                    <select 
                        className="appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 pl-4 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium cursor-pointer"
                        value={sort} 
                        onChange={(e) => setSort(e.target.value)}
                    >
                        <option value="newest">Mới nhất</option>
                        <option value="price-asc">Giá tăng dần</option>
                        <option value="price-desc">Giá giảm dần</option>
                        <option value="bestseller">Bán chạy nhất</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* --- SIDEBAR (Sticky) --- */}
          <aside className="lg:col-span-3 lg:sticky lg:top-24 space-y-6">
            
            {/* 1. Search Box */}
            <div className="relative">
                <input
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-sm"
                    placeholder="Tìm tên sách, tác giả..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            {/* 2. Danh mục (TREE VIEW) */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                    <Filter size={16} className="text-blue-600"/>
                    <h3 className="font-bold text-gray-900">Danh mục</h3>
                </div>
                <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                    <div 
                        className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer mb-1 ${catSlug === 'all' ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-gray-100 text-gray-700'}`}
                        onClick={() => nav('/categories')}
                    >
                        <span className="text-sm">Tất cả sách</span>
                    </div>
                    {/* Render Cây Danh Mục */}
                    {categoryTree.map(node => (
                        <CategoryNode 
                            key={node._id} 
                            node={node} 
                            currentSlug={catSlug} 
                            onSelect={(slug) => nav(`/categories/${slug}`)} 
                        />
                    ))}
                </div>
            </div>

            {/* 3. Bộ lọc khác */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-6">
                {/* Tác giả */}
                <div>
                    <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">Tác giả</h4>
                    <select 
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                        value={author} 
                        onChange={(e) => setAuthor(e.target.value)}
                    >
                        {authors.map(a => (
                            <option key={a} value={a}>{a === 'all' ? 'Tất cả tác giả' : a}</option>
                        ))}
                    </select>
                </div>
                
                <div className="border-t border-gray-100"></div>

                {/* Đánh giá */}
                <div>
                    <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">Đánh giá</h4>
                    <div className="space-y-2">
                        {[5, 4, 3].map(r => (
                            <label key={r} className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${rating === r ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                                    {rating === r && <Check size={12} className="text-white" strokeWidth={3} />}
                                </div>
                                <input type="radio" name="rating" className="hidden" checked={rating === r} onChange={() => setRating(r === rating ? 0 : r)} />
                                <div className="flex items-center gap-1">
                                    <div className="flex text-yellow-400">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={14} fill={i < r ? "currentColor" : "none"} className={i >= r ? "text-gray-300" : ""} />
                                        ))}
                                    </div>
                                    <span className="text-xs text-gray-500 mt-0.5">trở lên</span>
                                </div>
                            </label>
                        ))}
                         <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${rating === 0 ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                                    {rating === 0 && <Check size={12} className="text-white" strokeWidth={3} />}
                                </div>
                                <input type="radio" name="rating" className="hidden" checked={rating === 0} onChange={() => setRating(0)} />
                                <span className="text-sm text-gray-600">Mọi đánh giá</span>
                         </label>
                    </div>
                </div>
            </div>

          </aside>

          {/* --- MAIN LIST --- */}
          <main className="lg:col-span-9">
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border"></div>
                    ))}
                </div>
            ) : pageItems.length > 0 ? (
                <>
                    <div className={`grid ${
                        layout === 'grid' 
                        ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' 
                        : 'grid-cols-1'
                    } gap-6`}>
                        {pageItems.map(b => (
                            <div key={b.id} className={layout === 'list' ? 'max-w-3xl' : ''}>
                                <DealCard book={b} onAdd={handleAdd} onBuy={handleBuy} />
                            </div>
                        ))}
                    </div>

                    {/* Pagination Modern */}
                    {pageCount > 1 && (
                        <div className="mt-12 flex justify-center">
                            <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border">
                                <button 
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"
                                >
                                    <ChevronDown className="rotate-90" size={18}/>
                                </button>
                                
                                <div className="flex items-center px-2 gap-1">
                                    {Array.from({length: pageCount}).map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setPage(i + 1)}
                                            className={`w-8 h-8 text-sm font-bold rounded-lg transition ${page === i + 1 ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-gray-500 hover:bg-gray-100'}`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>

                                <button 
                                    onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                                    disabled={page === pageCount}
                                    className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"
                                >
                                    <ChevronRight size={18}/>
                                </button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                    <img src="/empty-box.png" className="w-32 opacity-50 mb-4" onError={e=>e.target.style.display='none'} alt=""/>
                    <h3 className="text-lg font-bold text-gray-900">Không tìm thấy sách nào</h3>
                    <p className="text-gray-500 mt-1">Hãy thử thay đổi từ khóa hoặc bộ lọc xem sao.</p>
                    <button onClick={() => { setSearch(""); setCatSlug("all"); setAuthor("all"); }} className="mt-4 text-blue-600 font-bold hover:underline">
                        Xóa bộ lọc
                    </button>
                </div>
            )}
          </main>
        </div>
      </div>
      
      {/* CSS Custom Scrollbar cho sidebar danh mục */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkfit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}