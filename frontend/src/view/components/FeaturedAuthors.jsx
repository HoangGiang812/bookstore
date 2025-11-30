import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SectionHeader from './SectionHeader';
import api, { getImageUrl } from '../../services/api';

export default function FeaturedAuthors({ title = "Tác giả nổi bật" }) {
  const [authors, setAuthors] = useState([]);

  useEffect(() => {
    // Lấy random 8 tác giả
    api.get('/authors', { params: { limit: 8, sort: 'random' } })
       .then(res => setAuthors(res.items || res || []))
       .catch(() => {});
  }, []);

  if (authors.length === 0) return null;

  return (
    <section className="py-10 border-t border-gray-50 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 max-w-7xl">
            <SectionHeader title={title} to="/authors" />
            
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 mt-6">
                {authors.map((a, index) => ( // Thêm index để fallback
                    <Link 
                        // Sửa key: dùng a._id hoặc index nếu id lỗi
                        key={a._id || index} 
                        to={`/authors/${a.slug || a._id}`} 
                        className="group flex flex-col items-center text-center"
                    >
                        {/* ... nội dung giữ nguyên ... */}
                    </Link>
                ))}
                </div>
        </div>
      </section>
  );
}