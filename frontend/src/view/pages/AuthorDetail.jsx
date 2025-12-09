import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../services/api";
import {
  BookOpen, Star, Share2, Check, ArrowRight, Filter, Grid, List
} from "lucide-react";
import BookCard from "../components/BookCard";

// Helper avatar
const initials = (name = "") =>
  name.trim().split(/\s+/).slice(-2).map(w => w[0]).join("").toUpperCase();

export default function AuthorDetail() {
  const { slug, id } = useParams();
  const authorKey = slug ?? id;

  const [author, setAuthor] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("books"); // 'books' | 'bio'

  // Load Data
  useEffect(() => {
    if (!authorKey) return;
    (async () => {
      try {
        setLoading(true);
        // 1. Get Author
        let aRes = await api.get(`/authors/${encodeURIComponent(authorKey)}`).catch(() => null) 
                   || await api.get(`/authors/id/${encodeURIComponent(authorKey)}`).catch(() => null);
        
        const aData = aRes?.data || aRes;
        setAuthor(aData);

        if (aData) {
          // 2. Get Books
          const bRes = await api.get("/books", { params: { author: aData.slug || aData.name, limit: 100 } }).catch(() => ({ items: [] }));
          const bData = bRes?.data || bRes;
          setBooks(Array.isArray(bData.items) ? bData.items : (Array.isArray(bData) ? bData : []));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [authorKey]);

  // Sắp xếp sách: Bán chạy nhất lên đầu
  const sortedBooks = useMemo(() => [...books].sort((a,b) => (b.soldCount||0) - (a.soldCount||0)), [books]);
  
  // Logic lấy Best Seller
  const bestSeller = sortedBooks[0]; 
  
  // Logic tính giá Best Seller
  const bestSellerPrice = useMemo(() => {
      if (!bestSeller) return {};
      const original = Number(bestSeller.price || 0);
      const percent = Number(bestSeller.discountPercent || 0);
      const sale = percent > 0 ? original * (1 - percent / 100) : original;
      return { original, sale, percent };
  }, [bestSeller]);

  if (loading) return <AuthorSkeleton />;
  if (!author) return <div className="p-20 text-center text-gray-400">Không tìm thấy tác giả.</div>;

  return (
    <div className="min-h-screen bg-[#F8F9FC] font-sans text-slate-800">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-indigo-50 to-transparent pointer-events-none"></div>

      <div className="container mx-auto px-4 py-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* --- LEFT COLUMN: PROFILE CARD (TINH GỌN) --- */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-24">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
                
                {/* Avatar */}
                <div className="relative mx-auto w-32 h-32 mb-4">
                  <div className="w-full h-full rounded-full p-1 bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg">
                    <div className="w-full h-full rounded-full border-4 border-white overflow-hidden bg-white">
                      {author.avatar ? (
                        <img src={author.avatar} alt={author.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-3xl font-bold">
                          {initials(author.name)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-1 right-1 bg-blue-500 text-white p-1 rounded-full border-2 border-white shadow-sm" title="Tác giả">
                    <Check size={14} strokeWidth={3} />
                  </div>
                </div>

                {/* Name */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-black text-slate-900">{author.name}</h1>
                  <p className="text-sm text-slate-500 font-medium mt-1">Tác giả</p>
                </div>

                {/* Info Card (Số lượng tác phẩm) */}
                <div className="bg-slate-50 rounded-2xl p-4 mb-4 flex items-center justify-between border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm"><BookOpen size={20}/></div>
                        <span className="text-sm font-bold text-slate-600">Tác phẩm</span>
                    </div>
                    <span className="text-xl font-black text-slate-900">{books.length}</span>
                </div>

                {/* Nút Chia sẻ (Giữ lại nút này cho đẹp layout, chức năng tính sau) */}
                <button className="w-full py-3 rounded-xl font-bold text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  <Share2 size={16}/> Chia sẻ hồ sơ
                </button>

              </div>
            </div>
          </div>

          {/* --- RIGHT COLUMN: CONTENT --- */}
          <div className="lg:col-span-8 xl:col-span-9">
            
            {/* SPOTLIGHT BOOK (ĐÃ SỬA GIÁ & LINK) */}
            {bestSeller && (
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row gap-8 items-center md:items-start relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 px-4 bg-amber-400 text-white font-bold text-[10px] uppercase tracking-wider rounded-bl-2xl shadow-sm z-10">
                    Tác phẩm nổi bật
                </div>
                
                {/* Book Cover */}
                <Link to={`/books/${bestSeller.slug || bestSeller._id}`} className="w-32 md:w-40 shrink-0 shadow-lg rounded-lg overflow-hidden transform group-hover:scale-105 transition-transform duration-500 cursor-pointer">
                  <img 
                    src={bestSeller.image || bestSeller.coverUrl} 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = '/placeholder.jpg' }}
                    alt={bestSeller.title}
                  />
                </Link>

                {/* Info */}
                <div className="flex-1 text-center md:text-left">
                  <Link to={`/books/${bestSeller.slug || bestSeller._id}`} className="hover:text-indigo-600 transition-colors">
                      <h3 className="text-2xl font-black text-slate-900 mb-2">{bestSeller.title}</h3>
                  </Link>
                  
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-xs font-bold border border-slate-200">
                        {bestSeller.category?.name || "Sách"}
                    </span>
                    {/* Chỉ hiện rating nếu có */}
                    {(bestSeller.ratingAvg > 0) && (
                        <div className="flex items-center text-amber-500 gap-1 text-sm font-bold">
                            <Star size={14} fill="currentColor"/> {bestSeller.ratingAvg.toFixed(1)}
                        </div>
                    )}
                  </div>

                  <p className="text-slate-500 text-sm line-clamp-3 mb-6 leading-relaxed">
                    {bestSeller.description || "Tác phẩm tiêu biểu nhất của tác giả..."}
                  </p>
                  
                  {/* PHẦN GIÁ (ĐÃ SỬA) */}
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-red-600">
                            {bestSellerPrice.sale.toLocaleString('vi-VN')}đ
                        </span>
                        {bestSellerPrice.percent > 0 && (
                            <>
                                <span className="text-sm text-slate-400 line-through mb-1">
                                    {bestSellerPrice.original.toLocaleString('vi-VN')}đ
                                </span>
                                <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded mb-1">
                                    -{bestSellerPrice.percent}%
                                </span>
                            </>
                        )}
                    </div>

                    <Link 
                        to={`/books/${bestSeller.slug || bestSeller._id}`} 
                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition flex items-center gap-2 shadow-lg shadow-slate-200"
                    >
                      Xem chi tiết <ArrowRight size={16}/>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs & List */}
            <div className="flex items-center gap-6 border-b border-slate-200 mb-6">
              <button 
                onClick={() => setActiveTab("books")}
                className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "books" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              >
                Tác phẩm ({books.length})
              </button>
              <button 
                onClick={() => setActiveTab("bio")}
                className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === "bio" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              >
                Tiểu sử
              </button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === "books" ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800">Danh sách sách</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <Filter size={14}/> <span>Mới nhất</span>
                  </div>
                </div>
                
                {books.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {sortedBooks.map(b => (
                      <BookCard key={b.id || b._id} book={b} />
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                    Chưa có sách nào.
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <BookOpen className="text-indigo-600"/> Giới thiệu tác giả
                </h3>
                <div className="prose prose-slate max-w-none text-slate-600 leading-loose">
                  {author.bio ? (
                    author.bio.split('\n').map((line, i) => <p key={i} className="mb-4">{line}</p>)
                  ) : (
                    <p className="italic text-slate-400">Đang cập nhật thông tin tiểu sử...</p>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton (Giữ nguyên cho đẹp)
const AuthorSkeleton = () => (
  <div className="min-h-screen bg-gray-50 container mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
    <div className="lg:col-span-3">
      <div className="bg-white h-80 rounded-3xl animate-pulse"></div>
    </div>
    <div className="lg:col-span-9 space-y-6">
      <div className="bg-white h-64 rounded-3xl animate-pulse"></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <div key={i} className="bg-white h-80 rounded-xl animate-pulse"></div>)}
      </div>
    </div>
  </div>
);