import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Minus, Plus, ShoppingCart, Heart, Star, Share2, Truck, ShieldCheck, BookOpen, Tag, User } from "lucide-react";
import { useCart } from "../../store/useCart";
import { useAuth } from "../../store/useAuth";
import * as Catalog from "../../services/catalog";
import * as CartSvc from "../../services/cart";
import * as ReviewAPI from "../../services/reviews";
import { useWishlist } from "../../store/useWishlist";
import { getImageUrl } from "../../services/api";

/* --------- Helpers --------- */
const slugify = (str) => {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
};

const toVND = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(n || 0));

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const shuffle = (array) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

/* =================================================================== */

export default function BookDetail() {
  const { slug } = useParams();
  const nav = useNavigate();
  const cart = useCart();
  const { user } = useAuth();
  const location = useLocation();
  const { wishlist, toggleWishlist } = useWishlist();

  const [qty, setQty] = useState(1);
  const [book, setBook] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(""); 
  const [ratingSum, setRatingSum] = useState({ avg: 0, cnt: 0 });

  // ---- Fetch Data ----
  useEffect(() => {
    window.scrollTo(0, 0);
    
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // Backend cần hỗ trợ tìm bằng cả slug VÀ id
        const b = await Catalog.getBook(slug);
        if (!mounted) return;

        // 1. Xử lý danh mục (Lấy cái đầu tiên để hiện breadcrumb)
        // Giả sử backend trả về mảng categories đã populate
        const categories = Array.isArray(b.categories) ? b.categories : [];
        const primaryCategory = categories.length > 0 ? categories[0] : null;

        // 2. Xử lý tác giả (Lấy ID thật để link không bị lỗi)
        let authors = [];
        if (Array.isArray(b.authors) && b.authors.length > 0) {
            authors = b.authors.map(a => ({
                id: a._id || a.id,
                name: a.name || a.fullName,
                // 🔥 SỬA: Nếu backend không trả slug, tự tạo slug từ tên
                slug: a.slug || slugify(a.name || a.fullName) 
            }));
        } else if (b.author) {
            // Trường hợp sách cũ chỉ lưu tên string
            authors = [{ 
                name: b.author, 
                id: null, 
                // 🔥 SỬA: Tự tạo slug từ chuỗi tên
                slug: slugify(b.author) 
            }];
        }

        // 3. Xử lý ảnh
        const rawImages = Array.isArray(b.images) && b.images.length > 0 
          ? b.images.map(img => typeof img === 'string' ? img : img.url) 
          : [b.coverUrl || b.image];
        const imageList = rawImages.filter(Boolean).map(url => getImageUrl(url));

        const normalized = {
          id: b._id || b.id,
          _id: b._id || b.id,
          title: b.title,
          authors,
          images: imageList,
          mainImage: imageList[0],
          soldCount: Number(b.soldCount || 0),
          
          originalPrice: Number(b.price ?? 0),
          discountPercent: Number(b.discountPercent ?? 0),
          price: (Number(b.discountPercent ?? 0) > 0)
            ? Math.round(Number(b.price ?? 0) * (1 - Number(b.discountPercent ?? 0) / 100))
            : Number(b.price ?? 0),
            
          stock: Number(b.stock ?? 0),
          description: b.description || "",
          
          // Thông tin chi tiết
          specs: {
            publisher: b.publisher || "Đang cập nhật", 
            publicationYear: b.publicationYear,
            pages: b.pages,
            format: b.format,
            size: b.size,
            weight: b.weight ? `${b.weight} gr` : null,
          },
          categories: categories,
          category: primaryCategory,
          categoryId: primaryCategory?._id || primaryCategory?.id
        };
        
        setBook(normalized);
        setActiveImage(normalized.mainImage); 

        // Lấy đánh giá
        try {
          const s = await ReviewAPI.getSummary(normalized._id);
          setRatingSum({ avg: Number(s?.avg || 0), cnt: Number(s?.cnt || 0) });
        } catch {
          setRatingSum({ avg: Number(b.ratingAvg || 0), cnt: Number(b.ratingCnt || 0) });
        }

        // Logic Sách liên quan
        let rawList = [];
        const MIN_RELATED = 8; // Cần ít nhất 8 cuốn để lọc và random

        // Phân loại danh mục Cha và Con từ dữ liệu sách
        // Giả sử item trong categories có dạng { _id, name, parentId }
        const cats = normalized.categories || [];
        
        // 1. Tìm danh mục CON (ưu tiên cái có parentId)
        const childCat = cats.find(c => c.parentId) || cats[0];
        
        // 2. Tìm danh mục CHA (cái không có parentId hoặc chính là parentId của child)
        const parentCat = cats.find(c => !c.parentId && c._id !== childCat?._id) 
                          || (childCat?.parentId ? { _id: childCat.parentId } : null);

        // BƯỚC 1: Ưu tiên lấy sách cùng Danh mục CON (Specific)
        if (childCat?._id) {
            try {
                const res = await Catalog.getBooks({ category: childCat._id, limit: 12 });
                const items = res.items || res || [];
                rawList = [...items];
            } catch (e) { console.error("Err child cat", e); }
        }

        // BƯỚC 2: Nếu chưa đủ, lấy thêm sách cùng Danh mục CHA (Broad)
        // Tránh gọi nếu cha trùng con hoặc không có cha
        if (rawList.length < MIN_RELATED && parentCat?._id && parentCat._id !== childCat?._id) {
            try {
                const res = await Catalog.getBooks({ category: parentCat._id, limit: 12 });
                const items = res.items || res || [];
                // Cứ gộp vào, bước sau sẽ lọc trùng
                rawList = [...rawList, ...items];
            } catch (e) { console.error("Err parent cat", e); }
        }

        // BƯỚC 3: Nếu vẫn quá ít (< 4 cuốn), fallback tìm theo Tên (Content-based)
        if (rawList.length < 4 && normalized.title) {
           try { 
               // Lấy 2 từ đầu tiên của tên sách để tìm kiếm
               const searchKey = normalized.title.split(" ").slice(0, 2).join(" ");
               const more = await Catalog.getBooks({ q: searchKey, limit: 8 }); 
               const moreItems = more.items || more || [];
               rawList = [...rawList, ...moreItems];
           } catch (e) { console.error("Err search fallback", e); }
        }
        
        // BƯỚC 4: Lọc trùng lặp (Deduplication) & Loại bỏ chính nó
        const uniqueMap = new Map();
        rawList.forEach(item => {
            const itemId = item._id || item.id;
            if (itemId) {
                uniqueMap.set(String(itemId), item);
            }
        });
        
        // Xóa cuốn đang xem khỏi danh sách gợi ý
        const currentBookId = String(normalized.id);
        if (uniqueMap.has(currentBookId)) {
            uniqueMap.delete(currentBookId);
        }

        // BƯỚC 5: Chuẩn hóa dữ liệu hiển thị -> Random -> Cắt lấy 6 cuốn
        const uniqueBooks = Array.from(uniqueMap.values());
        
        const finalRelated = shuffle(uniqueBooks).slice(0, 6).map(r => ({
           id: r._id || r.id, 
           title: r.title,
           author: r.author?.name || r.authorName || (Array.isArray(r.authors) ? r.authors[0]?.name : r.author) || 'Đang cập nhật',
           slug: r.slug,
           price: Number(r.salePrice || r.price),
           originalPrice: Number(r.originalPrice || r.price),
           image: getImageUrl(r.coverUrl || r.image)
        }));
        
        setRelated(finalRelated);

      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [slug]);

  const liked = useMemo(() => wishlist.some(item => (item._id || item.id) === book?.id), [wishlist, book]);
  const hasDiscount = book && book.originalPrice > book.price;
  
  // Logic Thanh Tiến Độ Tồn Kho
  const stockPercent = useMemo(() => {
    if (!book) return 0;
    const maxStockDisplay = 50; 
    return clamp(((book.stock || 0) / maxStockDisplay) * 100, 5, 100); 
  }, [book]);

  const handleAddToCart = () => {
    if (!book) return;
    if (!user) {
       nav(`/login?next=${encodeURIComponent(location.pathname)}`);
       return;
    }
    cart.add({ ...book, image: book.images[0] }, qty); 
  };

  const handleBuyNow = () => {
    handleAddToCart(); 
    if (book) {
        CartSvc.setBuyNow({ id: book._id || book.id, qty: qty });
    }
    if(user) nav("/cart?buy=1");
    else nav(`/login?next=${encodeURIComponent("/cart?buy=1")}`);
  };

  const toggleLike = () => {
    if (user) { if (book) toggleWishlist(book); } 
    else nav('/login', { state: { from: location.pathname } });
  };

  if (loading || !book) return (
     <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center animate-pulse">
           <div className="w-12 h-12 bg-gray-300 rounded-full mb-4"></div>
           <div className="h-4 w-32 bg-gray-300 rounded"></div>
        </div>
     </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-12 animate-fade-in">
      
      {/* --- BREADCRUMBS (CÓ DANH MỤC) --- */}
      {/* --- BREADCRUMBS MỚI --- */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm/50 backdrop-blur-xl bg-white/80">
        <div className="container max-w-7xl mx-auto px-4 h-12 text-sm text-gray-500 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
          
          {/* 1. Home */}
          <Link to="/" className="flex items-center hover:text-blue-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" clipRule="evenodd" />
            </svg>
          </Link>
          <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />

          {/* 2. Trang danh sách chung */}
          <Link to="/categories" className="hover:text-blue-600 transition-colors font-medium">Tủ sách</Link>
          <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />

          {/* 3. Danh mục cụ thể (Logic xử lý lỗi) */}
          {book.category ? (
            <>
              <Link 
                to={`/categories/${book.category.slug || book.category._id}`} 
                className="hover:text-blue-600 transition-colors font-medium text-gray-800"
              >
                {book.category.name}
              </Link>
              <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
            </>
          ) : (
            /* Fallback nếu không có danh mục */
            <>
              <span className="text-gray-400">Đang cập nhật</span>
              <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
            </>
          )}

          {/* 4. Tên sách (Cắt ngắn nếu quá dài để không vỡ layout mobile) */}
          <span className="text-blue-600 font-bold truncate max-w-[150px] sm:max-w-xs" title={book.title}>
            {book.title}
          </span>
        </div>
      </div>

      <div className="container px-4 mt-6">
        <div className="bg-white rounded-3xl shadow-sm border p-5 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* --- LEFT: GALLERY --- */}
          <div className="lg:col-span-5 space-y-6">
            <div className="aspect-[3/4] rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden relative group border">
              <img
                src={activeImage}
                alt={book.title}
                className="max-h-[90%] max-w-[90%] object-contain transition-transform duration-500 group-hover:scale-105 drop-shadow-xl"
                onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
              />
              {book.discountPercent > 0 && (
                  <span className="absolute top-4 right-4 bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">
                    -{book.discountPercent}%
                  </span>
              )}
            </div>
            {book.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 justify-center">
                    {book.images.map((img, idx) => (
                        <button 
                          key={idx}
                          onClick={() => setActiveImage(img)}
                          className={`w-16 h-16 flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all ${activeImage === img ? 'border-blue-600 ring-2 ring-blue-100 scale-105' : 'border-gray-200 hover:border-blue-400'}`}
                        >
                            <img src={img} className="w-full h-full object-cover" alt="thumb" />
                        </button>
                    ))}
                </div>
            )}
          </div>

          {/* --- RIGHT: INFO --- */}
          <div className="lg:col-span-7 flex flex-col">
            {/* ✅ HIỂN THỊ TAG DANH MỤC */}
            <div className="flex flex-wrap gap-2 mb-3">
               {book.categories.map((c, i) => (
                  <Link 
                    key={i} 
                    to={`/categories/${c.slug || c._id}`} 
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wide hover:bg-blue-100 transition"
                  >
                     <Tag size={12} /> {c.name}
                  </Link>
               ))}
            </div>

            <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-3 leading-tight">{book.title}</h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-6">
    
            {/* 1. Tác giả */}
            <div className="flex items-center gap-1">
                <span>Tác giả:</span>
                <div className="font-medium text-blue-600 truncate max-w-[200px]">
                    {book.authors?.map((a, i) => (
                        <Link 
                            key={i} 
                            to={a.slug ? `/authors/${a.slug}` : '#'} 
                            className="hover:underline"
                        >
                            {a.name}{i < book.authors.length - 1 ? ', ' : ''}
                        </Link>
                    )) || "Đang cập nhật"}
                </div>
            </div>

            {/* Đường ngăn cách */}
            <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>

            {/* 2. Đánh giá (Rating) */}
            <div 
                className="flex items-center gap-2 cursor-pointer group relative" 
                onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
                title="Xem chi tiết đánh giá"
            >
                <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-yellow-500 leading-none mt-0.5">{ratingSum.avg}</span>
                    <Stars value={ratingSum.avg} size={16} />
                </div>
                {/* Xóa lớp 'underline decoration-dotted...' chỉ giữ lại hiệu ứng đổi màu khi hover */}
                <span className="text-gray-500 group-hover:text-blue-600 transition">
                    ({ratingSum.cnt} đánh giá)
                </span>
            </div>

            {/* Đường ngăn cách */}
            <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>

            {/* 3. Lượt bán */}
            <div className="flex items-center gap-1.5">
                <span className="font-bold text-gray-900 text-base">
                    {/* Format số lượng bán: > 1000 thì hiện k (vd: 1.5k) */}
                    {book.soldCount > 1000 
                        ? `${(book.soldCount / 1000).toFixed(1).replace('.0', '')}k` 
                        : (book.soldCount || 0)}
                </span>
                <span>Đã bán</span>
            </div>
        </div>

            {/* Price Box */}
            <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl mb-6 relative overflow-hidden">
               <div className="relative z-10 flex items-baseline gap-4">
                 <span className="text-4xl font-black text-red-600">{toVND(book.price)}</span>
                 {hasDiscount && (
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 line-through text-lg font-medium">{toVND(book.originalPrice)}</span>
                        <span className="text-red-600 text-xs font-bold bg-white border border-red-100 px-2 py-1 rounded-md shadow-sm">Tiết kiệm {book.discountPercent}%</span>
                    </div>
                 )}
               </div>
            </div>

            {/* Thanh tiến độ tồn kho - Phiên bản Animated RGB */}
            <div className="mb-8 group">
                <div className="flex justify-between items-end mb-3">
                    <div className={`text-sm font-bold flex items-center gap-2 transition-colors duration-300 ${book.stock > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {/* Icon thay đổi tùy trạng thái */}
                        {book.stock > 0 ? (
                            <Truck size={18} className="animate-bounce-slow" /> 
                        ) : (
                            <ShieldCheck size={18} />
                        )}
                        <span>{book.stock > 0 ? 'Đang có hàng' : 'Tạm hết hàng'}</span>
                    </div>
                    
                    {book.stock > 0 && (
                        <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">
                            Còn lại: <strong className={`${book.stock < 5 ? 'text-red-600 text-base' : 'text-gray-900'}`}>{book.stock}</strong>
                        </span>
                    )}
                </div>

                {book.stock > 0 && (
                    <div className="relative h-3.5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200 shadow-inner">
                        {/* Thanh màu chính */}
                        <div 
                            className={`h-full rounded-full shadow-[0_0_10px_currentColor] transition-all duration-1000 ease-out relative overflow-hidden
                                ${book.stock < 5 
                                    ? 'bg-gradient-to-r from-red-500 to-orange-500 shadow-red-400/50' // Màu báo động
                                    : 'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 shadow-teal-400/50' // Màu RGB Xanh đẹp
                                }
                            `}
                            style={{ width: `${stockPercent}%` }}
                        >
                            {/* Lớp 1: Hiệu ứng Sọc chéo chuyển động (Stripes) */}
                            <div className="absolute inset-0 w-full h-full" 
                                style={{
                                    backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)',
                                    backgroundSize: '1rem 1rem',
                                    animation: 'progress-stripes 1s linear infinite'
                                }}
                            ></div>

                            {/* Lớp 2: Hiệu ứng ánh sáng quét qua (Shimmer) */}
                            <div className="absolute top-0 bottom-0 left-0 w-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                        </div>
                    </div>
                )}
                
                {/* Style riêng cho animation chạy sọc & ánh sáng */}
                <style>{`
                    @keyframes progress-stripes {
                        from { background-position: 1rem 0; }
                        to { background-position: 0 0; }
                    }
                    @keyframes shimmer {
                        100% { transform: translateX(100%); }
                    }
                    .animate-bounce-slow {
                        animation: bounce 2s infinite;
                    }
                `}</style>
            </div>

            {/* Actions */}
            <div className="mt-auto">
                <div className="flex flex-wrap gap-4 mb-5 items-end">
                    
                    <div className="relative">
                        {qty >= book.stock && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded shadow-sm animate-bounce whitespace-nowrap z-10">
                                Tối đa {book.stock} sp
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-red-100"></div>
                            </div>
                        )}

                        <div className="flex items-center p-1 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 w-[130px] justify-between group h-14">
                            {/* Nút Giảm */}
                            <button 
                                onClick={() => setQty(q => Math.max(1, q - 1))}
                                disabled={qty <= 1}
                                className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full 
                                        text-gray-600 group-hover:text-white 
                                        group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-blue-600 
                                        disabled:opacity-30 disabled:hover:bg-transparent disabled:group-hover:text-gray-400 disabled:cursor-not-allowed 
                                        transition-all duration-300 active:scale-90"
                            >
                                <Minus size={18} strokeWidth={2.5} />
                            </button>

                            {/* Ô nhập số */}
                            <div className="flex-1 h-full flex items-center justify-center">
                                <input 
                                type="number"
                                value={qty} 
                                onChange={e => setQty(e.target.value)}
                                onBlur={(e) => {
                                    let val = parseInt(e.target.value) || 1;
                                    val = Math.max(1, Math.min(val, book.stock)); 
                                    setQty(val);
                                }}
                                className="w-full text-center bg-transparent border-none outline-none 
                                            font-bold text-lg text-gray-800 group-hover:text-blue-700 
                                            transition-colors duration-300"
                                />
                            </div>

                            {/* Nút Tăng */}
                            <button 
                                onClick={() => setQty(q => Math.min(book.stock, q + 1))}
                                disabled={qty >= book.stock}
                                className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full 
                                        text-gray-600 group-hover:text-white 
                                        group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-blue-600 
                                        disabled:opacity-30 disabled:hover:bg-transparent disabled:group-hover:text-gray-400 disabled:cursor-not-allowed 
                                        transition-all duration-300 active:scale-90"
                            >
                                <Plus size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    {/* 2. Add to Cart */}
                    <button 
                    onClick={handleAddToCart}
                    disabled={book.stock <= 0}
                    className="h-14 px-6 rounded-xl border-2 border-blue-600 text-blue-600 font-bold text-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition active:scale-95"
                    >
                    <ShoppingCart size={22}/> <span className="hidden sm:inline">Thêm giỏ hàng</span>
                    </button>

                    {/* 3. Buy Now */}
                    <button 
                    onClick={handleBuyNow}
                    disabled={book.stock <= 0}
                    className="h-14 px-8 rounded-xl bg-red-600 text-white font-bold text-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1 shadow-lg shadow-red-100 transition active:scale-95 whitespace-nowrap"
                    >
                    Mua Ngay
                    </button>
                </div>
               
               <div className="flex gap-6 border-t pt-4">
                 <button onClick={toggleLike} className={`group text-sm flex items-center gap-2 transition ${liked ? 'text-red-600 font-medium' : 'text-gray-500 hover:text-gray-900'}`}>
                    <Heart size={20} fill={liked ? "currentColor" : "none"} className={`transition ${liked ? 'scale-110' : 'group-hover:scale-110'}`} /> 
                    {liked ? 'Đã yêu thích' : 'Thêm vào yêu thích'}
                 </button>
                 <button className="group text-sm flex items-center gap-2 text-gray-500 hover:text-blue-600 transition">
                    <Share2 size={20} className="group-hover:rotate-12 transition"/> Chia sẻ
                 </button>
               </div>
            </div>

          </div>
        </div>
        
        {/* --- SECTION: DETAILS & RELATED --- */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Main Content */}
           <div className="lg:col-span-2 space-y-8">
              <div className="bg-white p-6 lg:p-8 rounded-3xl shadow-sm border">
                 <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <BookOpen size={24} className="text-blue-600"/> Thông tin chi tiết
                 </h3>
                 <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                     <div className="space-y-4 text-sm">
                        <SpecRow label="Công ty phát hành" value={book.specs.publisher} />
                        <div className="border-b border-gray-200/50"></div>
                        <SpecRow label="Ngày xuất bản" value={book.specs.publicationYear} />
                        <div className="border-b border-gray-200/50"></div>
                        <SpecRow label="Kích thước" value={book.specs.size} />
                        <div className="border-b border-gray-200/50"></div>
                        <SpecRow label="Loại bìa" value={book.specs.format} />
                        <div className="border-b border-gray-200/50"></div>
                        <SpecRow label="Số trang" value={book.specs.pages} />
                        <div className="border-b border-gray-200/50"></div>
                        <SpecRow label="Trọng lượng" value={book.specs.weight ? `${book.specs.weight} gr` : null} />
                        <div className="border-b border-gray-200/50"></div>
                        <SpecRow label="SKU" value={book.id.slice(-8).toUpperCase()} />
                     </div>
                 </div>
              </div>

              <div className="bg-white p-6 lg:p-8 rounded-3xl shadow-sm border">
                 <h3 className="text-xl font-bold text-gray-900 mb-6">Mô tả sản phẩm</h3>
                 <div className="text-gray-700 leading-8 whitespace-pre-line text-justify text-[15px]">
                    {book.description || <span className="text-gray-400 italic">Nội dung đang được cập nhật...</span>}
                 </div>
              </div>
              
              {/* Reviews */}
              <div className="bg-white p-6 lg:p-8 rounded-3xl shadow-sm border">
                 <ReviewSection bookId={book._id} />
              </div>
           </div>

           {/* Sidebar: Related Books */}
           <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-3xl shadow-sm border sticky top-24">
                 <h3 className="font-bold text-gray-900 mb-5 flex items-center justify-between">
                    Sách cùng thể loại
                    <Link to="/categories" className="text-xs font-normal text-blue-600 hover:underline">Xem thêm</Link>
                 </h3>
                 <div className="space-y-5">
                    {related.map(b => (
                        <Link 
                          key={b.id} 
                          to={`/books/${b.slug || b.id}`} 
                          className="flex gap-4 group items-start p-2 rounded-xl hover:bg-gray-50 transition"
                        >
                           <div className="w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden border bg-gray-100 shadow-sm">
                               <img src={b.image} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt="" />
                           </div>
                           <div className="flex-1 min-w-0 pt-1">
                              <div className="text-[14px] font-bold text-gray-800 leading-snug line-clamp-2 group-hover:text-blue-600 transition mb-1">
                                 {b.title}
                              </div>
                              <div className="text-xs text-gray-500 mb-2 line-clamp-1">{b.author}</div>
                              <div className="flex items-center gap-2">
                                  <span className="text-red-600 font-bold">{toVND(b.price)}</span>
                                  {b.originalPrice > b.price && (
                                    <span className="text-xs text-gray-400 line-through">{toVND(b.originalPrice)}</span>
                                  )}
                              </div>
                           </div>
                        </Link>
                    ))}
                    {related.length === 0 && <div className="text-sm text-gray-500 italic text-center py-4">Chưa có sách liên quan.</div>}
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

// --- ✅ ĐÃ THÊM COMPONENT 'SpecRow' và 'Stars' ---

function SpecRow({ label, value }) {
  const displayValue = (value === null || value === undefined || value === "") 
      ? <span className="text-gray-400 italic text-xs">Đang cập nhật...</span> 
      : <span className="text-gray-900 font-medium">{value}</span>;

  return (
    <div className="grid grid-cols-3 py-1">
      <div className="text-gray-500 col-span-1 font-medium">{label}</div>
      <div className="col-span-2">{displayValue}</div>
    </div>
  )
}

function Stars({ value = 0 }) {
  const rounded = Math.round(Number(value) * 2) / 2;
  return (
    <div className="flex text-yellow-400 text-sm gap-0.5">
       {'★'.repeat(Math.floor(rounded))}
       {rounded % 1 !== 0 && '½'}
       <span className="text-gray-200">{'★'.repeat(5 - Math.ceil(rounded))}</span>
    </div>
  );
}

function ReviewSection({ bookId }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [can, setCan] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 5;

  useEffect(() => {
    if (!bookId) return;
    (async () => {
        try {
            if (user) {
                const r = await ReviewAPI.canReview(bookId);
                setCan(!!r?.ok); 
            } else setCan(false);
        } catch { setCan(false); }
        await loadPage(0);
    })();
    // eslint-disable-next-line
  }, [bookId, user?._id]);

  async function loadPage(p = 0) {
    try {
      const r = await ReviewAPI.listReviews(bookId, { limit, skip: p * limit });
      setItems(r?.items || []);
      setPage(p);
    } catch {}
  }

  return (
    <section id="reviews">
      <div className="flex items-center justify-between mb-6">
         <h3 className="text-xl font-bold text-gray-900">Đánh giá từ khách hàng</h3>
         {can && (
            <Link to="/account/reviews" className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition">
               <Star size={16}/> Viết đánh giá
            </Link>
         )}
      </div>
      
      <div className="space-y-6">
        {items.length === 0 && (
            <div className="text-gray-500 text-center py-8 italic bg-gray-50 rounded-xl border border-dashed">
               Chưa có đánh giá nào cho sách này.
            </div>
        )}
        {items.map((rv) => (
          <div key={rv._id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-white shadow-sm flex items-center justify-center text-gray-400">
                {(rv.userId?.avatarUrl || rv.userId?.avatar) ? (
                    <img 
                      src={getImageUrl(rv.userId?.avatarUrl || rv.userId?.avatar)} 
                      className="w-full h-full object-cover" 
                      alt="User"
                      onError={(e) => { 
                          e.currentTarget.style.display = "none"; 
                      }}
                    />
                ) : (
                    <User size={20} />
                )}
                
                {/* Fallback Icon: Luôn nằm chìm bên dưới (hoặc hiện ra khi img bị ẩn) */}
                {(rv.userId?.avatarUrl || rv.userId?.avatar) && (
                    <User size={20} className="absolute z-[-1]" />
                )}
              </div>
              <div className="flex-1">
                  <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-bold text-gray-900">{rv.userId?.name || rv.userId?.email || "Người dùng"}</div>
                        <div className="flex items-center gap-2 mt-1">
                            <Stars value={rv.rating} />
                            {rv.verifiedPurchase && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                                <ShieldCheck size={10}/> Đã mua hàng
                            </span>
                            )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(rv.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  
                  {rv.title && <div className="mt-2 font-bold text-gray-800 text-sm">{rv.title}</div>}
                  {rv.content && <div className="mt-1 text-sm text-gray-600 leading-relaxed">{rv.content}</div>}
               </div>
            </div>
          </div>
        ))}

        {items.length > 0 && (
            <div className="flex justify-center gap-3 pt-4">
            <button className="px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 text-sm font-medium" disabled={page === 0} onClick={() => loadPage(page - 1)}>
                Trang trước
            </button>
            <button
                className="px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
                disabled={items.length < limit}
                onClick={() => loadPage(page + 1)}
            >
                Trang sau
            </button>
            </div>
        )}
      </div>
    </section>
  );
}