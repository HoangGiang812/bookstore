import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Grid, List, ArrowUpDown, Search, Layers } from 'lucide-react';
import api, { getImageUrl } from '../../services/api';
import DealCard from '../components/DealCard';
import { useCart } from '../../store/useCart';
import { useAuth } from '../../store/useAuth';
import { useUI } from '../../store/useUI';

export default function CollectionDetail() {
  const { slug } = useParams();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('default'); 
  const [viewMode, setViewMode] = useState('grid');
  const [keyword, setKeyword] = useState('');

  const cart = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const { showToast } = useUI();
  
 const handleAdd = (bk) => {
      if (bk.stock <= 0) return showToast({ type: 'error', title: 'Hết hàng', msg: 'Sản phẩm tạm hết hàng.' });
      cart.add(bk, 1);
  };
  const handleBuy = (bk) => { 
      if (bk.stock <= 0) return showToast({ type: 'error', title: 'Hết hàng', msg: 'Sản phẩm tạm hết hàng.' });
      cart.add(bk, 1); 
      user ? nav("/cart") : nav("/login?next=/cart"); 
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    api.get(`/public/collections/${slug}`)
       .then(res => {
           setCollection(res);
           document.title = `${res.name} - Bộ sưu tập sách`;
       })
       .catch(err => console.error(err))
       .finally(() => setLoading(false));
  }, [slug]);

  // Logic Lọc & Sắp xếp
  const processedBooks = useMemo(() => {
    if (!collection?.books) return [];
    let items = [...collection.books];

    // 1. Lọc theo từ khóa
    if (keyword.trim()) {
        const lower = keyword.toLowerCase();
        items = items.filter(b => b.title.toLowerCase().includes(lower));
    }
    
    // 2. Sắp xếp
    switch (sort) {
      case 'price-asc': return items.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price-desc': return items.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'name-asc': return items.sort((a, b) => a.title.localeCompare(b.title));
      default: return items; 
    }
  }, [collection, sort, keyword]);

  const normalize = (b) => ({
    id: b._id || b.id,
    title: b.title,
    slug: b.slug,
    image: getImageUrl(b.coverUrl || b.image),
    price: b.price,
    originalPrice: b.price / (1 - (b.discountPercent||0)/100),
    discountPercent: b.discountPercent,
    author: b.author,
    stock: Number(b.stock || 0)
  });

  if (loading) return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-20 px-4">
          <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
              <div className="h-64 bg-gray-200 rounded-3xl w-full"></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[...Array(8)].map((_,i) => <div key={i} className="h-80 bg-gray-200 rounded-2xl"></div>)}
              </div>
          </div>
      </div>
  );
  
  if (!collection) return <div className="py-40 text-center text-gray-500">Không tìm thấy bộ sưu tập.</div>;

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-20">
      
      {/* --- HERO BANNER --- */}
      <div className="relative w-full h-[200px] md:h-[280px] flex items-end overflow-hidden bg-gray-900 group">
         <div 
            className="absolute inset-0 bg-cover bg-center opacity-70 transition-transform duration-[20s] ease-linear group-hover:scale-105"
            style={{ backgroundImage: `url(${getImageUrl(collection.banner || '/placeholder-banner.jpg')})` }}
         ></div>
         <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>

         <div className="container mx-auto px-4 max-w-7xl relative z-10 pb-8">
            <Link to="/collections" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-3 text-xs font-bold uppercase tracking-wider transition hover:translate-x-[-4px]">
               <ChevronLeft size={14}/> Bộ sưu tập
            </Link>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 tracking-tight drop-shadow-md">
                {collection.name}
            </h1>
            {collection.description && (
                <p className="text-white/80 max-w-3xl text-sm md:text-base line-clamp-2 font-light">
                    {collection.description}
                </p>
            )}
         </div>
      </div>

      {/* --- TOOLBAR --- */}
      <div className="container mx-auto px-4 max-w-7xl -mt-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Left: Search & Count */}
            <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-sm outline-none"
                        placeholder="Tìm sách trong bộ sưu tập..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                </div>
                <div className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
                    <Layers size={16} className="text-blue-600"/> 
                    <span>{processedBooks.length}</span>
                </div>
            </div>

            {/* Right: Sort & View */}
            <div className="flex items-center gap-3 self-end lg:self-auto">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition ${viewMode==='grid' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><Grid size={18}/></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition ${viewMode==='list' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><List size={18}/></button>
                </div>

                <div className="relative min-w-[160px]">
                    <select 
                        className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium cursor-pointer hover:border-blue-300 transition"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                    >
                        <option value="default">Mặc định</option>
                        <option value="price-asc">Giá: Thấp đến Cao</option>
                        <option value="price-desc">Giá: Cao đến Thấp</option>
                        <option value="name-asc">Tên: A-Z</option>
                    </select>
                    <ArrowUpDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                </div>
            </div>
        </div>

        {/* --- CONTENT --- */}
        {processedBooks.length > 0 ? (
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1 md:grid-cols-2'}`}>
                {processedBooks.map(book => (
                    <div key={book._id} className={viewMode === 'list' ? 'flex bg-white rounded-xl border p-4 gap-4 hover:shadow-md transition' : ''}>
                        {viewMode === 'list' ? (
                            // LIST MODE CARD
                            <>
                                <Link to={`/books/${book.slug || book._id}`} className="w-24 h-36 flex-shrink-0 block overflow-hidden rounded-lg border bg-gray-100">
                                    <img src={getImageUrl(book.coverUrl || book.image)} className="w-full h-full object-cover" alt=""/>
                                </Link>
                                <div className="flex-1 flex flex-col">
                                    <Link to={`/books/${book.slug || book._id}`} className="font-bold text-gray-900 text-lg hover:text-blue-600 transition line-clamp-2 mb-1">{book.title}</Link>
                                    <div className="text-sm text-gray-500 mb-2">{book.author}</div>
                                    <div className="mt-auto flex items-center justify-between">
                                        <span className="text-red-600 font-bold text-lg">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(book.price)}
                                        </span>
                                        <button onClick={() => handleAdd(normalize(book))} className="px-4 py-2 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg hover:bg-blue-100 transition">
                                            Thêm giỏ hàng
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            // GRID MODE CARD (Dùng DealCard có sẵn)
                            <DealCard 
                                book={normalize(book)} 
                                onAdd={handleAdd}
                                onBuy={handleBuy}
                            />
                        )}
                    </div>
                ))}
            </div>
        ) : (
            <div className="bg-white rounded-2xl p-16 text-center border border-dashed shadow-sm">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <Search size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Không tìm thấy sách phù hợp</h3>
                <p className="text-gray-500 mb-6">Hãy thử thay đổi từ khóa tìm kiếm.</p>
                <button onClick={() => setKeyword('')} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-200">
                    Xóa bộ lọc
                </button>
            </div>
        )}
      </div>
    </div>
  );
}