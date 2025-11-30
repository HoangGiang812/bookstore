import React from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../../services/api';
import { ArrowRight } from 'lucide-react';

export default function SubBannerSection({ banners }) {
  if (!banners || banners.length === 0) return null;

  // Tùy biến grid dựa trên số lượng banner (1 cái thì full, 2 cái thì chia đôi, 3 cái chia ba)
  const gridCols = banners.length === 1 ? 'grid-cols-1' : (banners.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3');

  return (
    <section className="py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className={`grid ${gridCols} gap-6`}>
          {banners.map(b => (
            <Link 
              key={b.id} 
              to={b.link || '#'} 
              className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 aspect-[3/1] md:aspect-[2.5/1]"
            >
              <img 
                src={b.imageUrl} 
                alt={b.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Overlay Text */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex flex-col justify-center p-8">
                 <h3 className="text-xl md:text-2xl font-bold text-white mb-2 drop-shadow-md max-w-[70%]">{b.title}</h3>
                 {b.subtitle && <p className="text-white/90 text-sm mb-4 line-clamp-2 max-w-[60%]">{b.subtitle}</p>}
                 {b.cta && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-white text-black px-4 py-2 rounded-full w-fit group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {b.cta} <ArrowRight size={12}/>
                    </span>
                 )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}