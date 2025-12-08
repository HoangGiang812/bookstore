import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import DealCard from './DealCard';
import SectionHeader from './SectionHeader';
import { useCart } from '../../store/useCart';
import { useAuth } from '../../store/useAuth';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../store/useUI';

export default function ProductRow({ title, groupType, limit = 10 }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  const cart = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const { showToast } = useUI();

  const handleAdd = (bk) => {
    if (bk.stock <= 0) {
       return showToast({ type: 'error', title: 'Hết hàng', msg: 'Sản phẩm này tạm thời hết hàng.' });
    }
    cart.add(bk, 1);
  };
  
  const handleBuy = (bk) => { 
    if (bk.stock <= 0) {
       return showToast({ type: 'error', title: 'Hết hàng', msg: 'Sản phẩm này tạm thời hết hàng.' });
    }
    cart.add(bk, 1); 
    if (!user) nav(`/login?next=${encodeURIComponent('/cart?buy=1')}`);
    else nav("/cart?buy=1");
  };
  

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sortMap = { new: 'latest', bestseller: 'bestseller', deals: 'price_asc' };
        const params = { limit, sort: sortMap[groupType] || 'latest' };
        if (groupType === 'deals') params.hasDiscount = true; 

        const res = await api.get('/books', { params });
        setBooks(res.items || res.data || res || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [groupType, limit]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === 'left' ? -current.offsetWidth : current.offsetWidth;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!loading && books.length === 0) return null;

  return (
    <section className="py-10 border-b border-gray-50 last:border-0">
      <div className="container mx-auto px-4 max-w-7xl">
        <SectionHeader title={title} to="/categories" />
        
        <div className="relative group/slider">
          <button 
            onClick={() => scroll('left')}
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center text-gray-600 opacity-0 group-hover/slider:opacity-100 transition-opacity hover:text-blue-600 disabled:opacity-0"
          >
            <ChevronLeft size={20}/>
          </button>

          <div 
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 scroll-smooth"
          >
            {loading ? (
               [...Array(5)].map((_, i) => (
                 <div key={i} className="min-w-[180px] w-[180px] h-[320px] bg-gray-100 rounded-xl animate-pulse"></div>
               ))
            ) : (
               books.map(book => (
                 <div key={book._id} className="min-w-[200px] w-[200px]">
                    <DealCard 
                        book={{
                            ...book, 
                            id: book._id,
                            image: book.coverUrl || book.image,
                            originalPrice: book.price / (1 - (book.discountPercent||0)/100),
                            stock: Number(book.stock || 0), 
                        }} 
                        onAdd={handleAdd} 
                        onBuy={handleBuy} 
                    />
                 </div>
               ))
            )}
          </div>

          <button 
            onClick={() => scroll('right')}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center text-gray-600 opacity-0 group-hover/slider:opacity-100 transition-opacity hover:text-blue-600"
          >
            <ChevronRight size={20}/>
          </button>
        </div>
      </div>
    </section>
  );
}