import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Thêm useNavigate
import { ArrowRight, Layers } from 'lucide-react';
import api, { getImageUrl } from '../../services/api';
import DealCard from './DealCard';
import { useCart } from '../../store/useCart'; // Import useCart
import { useAuth } from '../../store/useAuth'; // Import useAuth

export default function HomeCollection({ slug, title, subtitle }) {
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- THÊM ĐOẠN HOOKS NÀY ---
  const cart = useCart();
  const { user } = useAuth();
  const nav = useNavigate();

  const handleAdd = (bk) => cart.add(bk, 1);
  
  const handleBuy = (bk) => { 
    cart.add(bk, 1); 
    // Nếu chưa đăng nhập -> Login rồi quay lại Cart
    if (!user) nav(`/login?next=${encodeURIComponent('/cart?buy=1')}`);
    else nav("/cart?buy=1");
  };
  // ---------------------------

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await api.get(`/public/collections/${slug}`);
        setCollection(res);
      } catch (error) {
        // im lặng nếu lỗi
      } finally {
        setLoading(false);
      }
    };
    if (slug) loadData();
  }, [slug]);

  if (loading || !collection || !collection.books?.length) return null;

  const normalize = (b) => ({
    id: b._id || b.id,
    title: b.title,
    slug: b.slug,
    image: getImageUrl(b.coverUrl || b.image),
    price: b.price,
    originalPrice: b.price / (1 - (b.discountPercent||0)/100),
    discountPercent: b.discountPercent,
    author: b.author
  });

  return (
    <section className="py-10 border-b border-gray-100 last:border-0">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-[var(--brand)] font-bold uppercase tracking-wider text-xs mb-1">
               <Layers size={14} /> Bộ sưu tập
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">
              {title || collection.name}
            </h2>
            <p className="text-gray-500 mt-1 text-sm md:text-base">
              {subtitle || collection.description}
            </p>
          </div>
          
          <Link 
            to={`/collections/${slug}`} 
            className="group flex items-center gap-1 text-blue-600 font-semibold hover:bg-blue-50 px-3 py-2 rounded-lg transition"
          >
            Xem tất cả <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {collection.books.slice(0, 5).map(book => (
            <DealCard 
                key={book._id} 
                book={normalize(book)} 
                // --- TRUYỀN HÀM VÀO DEALCARD ---
                onAdd={handleAdd}
                onBuy={handleBuy}
                // -------------------------------
            />
          ))}
        </div>
      </div>
    </section>
  );
}