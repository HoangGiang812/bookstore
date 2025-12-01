import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SectionHeader from './SectionHeader';
import api, { getImageUrl } from '../../services/api';
import { User } from 'lucide-react';

export default function FeaturedAuthors({ title = "Tác giả nổi bật" }) {
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Gọi API (Lưu ý: Backend phải hỗ trợ sort='popular' hoặc 'random')
    api.get('/authors', { params: { limit: 8, sort: 'popular' } })
       .then(res => {
           const list = Array.isArray(res) ? res : (res.items || []);
           setAuthors(list);
       })
       .catch(err => console.error("Lỗi tải tác giả:", err))
       .finally(() => setLoading(false));
  }, []);

  if (!loading && authors.length === 0) return null;

  return (
    <section className="py-12 border-t border-gray-50 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 max-w-7xl">
            <SectionHeader title={title} to="/authors" />
            
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 mt-8">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-3 animate-pulse">
                            <div className="w-24 h-24 rounded-full bg-gray-200"></div>
                            <div className="h-4 w-20 bg-gray-200 rounded"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-8 gap-x-6 mt-8">
                    {authors.map((a, index) => (
                        <Link 
                            key={a._id || index} 
                            to={`/authors/${a.slug || a._id}`} 
                            className="group flex flex-col items-center text-center hover:-translate-y-1 transition-transform duration-300"
                        >
                            {/* Avatar Tác Giả */}
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white shadow-md group-hover:shadow-lg group-hover:border-blue-100 transition-all mb-3 relative bg-gray-100">
                                {a.image || a.avatar ? (
                                    <img 
                                        src={getImageUrl(a.image || a.avatar)} 
                                        alt={a.name} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        onError={(e) => {e.target.style.display='none'; e.target.nextSibling.style.display='flex'}}
                                    />
                                ) : null}
                                {/* Fallback icon nếu ảnh lỗi */}
                                <div className={`absolute inset-0 flex items-center justify-center bg-indigo-50 text-indigo-400 ${a.image || a.avatar ? 'hidden' : 'flex'}`}>
                                    <User size={32} />
                                </div>
                            </div>
                            
                            {/* Tên Tác Giả */}
                            <h3 className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors line-clamp-2 text-sm sm:text-base px-1">
                                {a.name}
                            </h3>
                            
                            {/* Số lượng sách (Nếu có) */}
                            {a.bookCount > 0 && (
                                <span className="text-xs text-gray-500 mt-1">{a.bookCount} tác phẩm</span>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
      </section>
  );
}