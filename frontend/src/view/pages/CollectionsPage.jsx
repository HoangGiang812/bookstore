import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api, { getImageUrl } from '../../services/api';
import { Layers, ArrowRight, Book, ChevronRight } from 'lucide-react';

// Component Card thông minh: Hover để xem trước sách
const CollectionCard = ({ col }) => {
  const [activeImgIndex, setActiveImgIndex] = useState(-1); // -1: Hiện banner gốc
  const intervalRef = useRef(null);
  
  const images = [col.banner, ...(col.previewImages || [])].filter(Boolean);

  const handleMouseEnter = () => {
    if (images.length <= 1) return;
    // Bắt đầu slideshow
    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % images.length;
      setActiveImgIndex(idx);
    }, 1200); // Chuyển ảnh mỗi 1.2s
  };

  const handleMouseLeave = () => {
    clearInterval(intervalRef.current);
    setActiveImgIndex(-1); // Reset về banner gốc
  };

  // Ảnh đang hiển thị
  const currentImage = activeImgIndex === -1 
      ? col.banner 
      : images[activeImgIndex];

  return (
    <Link 
      to={`/collections/${col.slug}`}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 flex flex-col h-full relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Banner Ảnh (Có hiệu ứng chuyển đổi) */}
      <div className="h-48 overflow-hidden relative bg-gray-100">
          {currentImage ? (
            <img 
              key={currentImage} // Key thay đổi để kích hoạt animation fade
              src={getImageUrl(currentImage)} 
              alt={col.name} 
              className="w-full h-full object-cover animate-fade-in"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
              <Layers size={40} opacity={0.5}/>
            </div>
          )}
          
          {/* Overlay gradient nhẹ khi hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>

          {/* Badge số lượng sách */}
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur text-gray-800 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1.5">
            <Book size={12} className="text-blue-600"/> {col.bookCount}
          </div>
          
          {/* Chỉ báo đang xem preview (Dots) */}
          {activeImgIndex !== -1 && images.length > 1 && (
             <div className="absolute bottom-3 left-3 flex gap-1">
                {images.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImgIndex ? 'bg-white w-3' : 'bg-white/50'}`}></div>
                ))}
             </div>
          )}
      </div>

      {/* Nội dung */}
      <div className="p-5 flex flex-col flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
            {col.name}
          </h3>
          <p className="text-gray-500 text-xs md:text-sm line-clamp-2 mb-4 flex-1 leading-relaxed">
            {col.description || "Khám phá ngay những tựa sách hấp dẫn trong bộ sưu tập này."}
          </p>
          <div className="flex items-center text-blue-600 font-bold text-xs uppercase tracking-wide mt-auto">
            Khám phá <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform"/>
          </div>
      </div>
      
      <style>{`
        @keyframes fadeInImg { from { opacity: 0.8; transform: scale(1.05); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fadeInImg 0.4s ease-out forwards; }
      `}</style>
    </Link>
  );
};

export default function CollectionsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Bộ sưu tập sách - BookStore";
    api.get('/public/collections')
       .then(res => setList(res || []))
       .catch(console.error)
       .finally(() => setLoading(false));
  }, []);

  if (loading) return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
             {[1,2,3].map(i => <div key={i} className="h-80 bg-gray-200 rounded-2xl animate-pulse"></div>)}
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header Banner */}
      <div className="bg-white border-b pt-16 pb-12 mb-10">
        <div className="container mx-auto px-4 text-center max-w-2xl">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider mb-4">
              <Layers size={14}/> Thư viện tuyển chọn
           </div>
           <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Khám Phá Bộ Sưu Tập</h1>
           <p className="text-gray-500 text-base md:text-lg font-light">
             Tuyển tập những cuốn sách hay nhất theo từng chủ đề, được biên soạn kỹ lưỡng bởi đội ngũ BookStore.
           </p>
        </div>
      </div>

      {/* Grid Collections */}
      <div className="container mx-auto px-4 max-w-7xl">
        {list.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {list.map(col => (
              <CollectionCard key={col._id} col={col} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
             <img src="/empty-box.png" className="w-24 opacity-30 mx-auto mb-4" alt=""/>
             <div className="text-gray-400">Chưa có bộ sưu tập nào được tạo.</div>
          </div>
        )}
      </div>
    </div>
  );
}