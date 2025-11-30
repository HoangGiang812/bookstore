import React, { useEffect, useState } from "react";
import api, { getImageUrl } from "../../services/api";
import PromoSlider from "../components/PromoSlider";
import HomeCollection from "../components/HomeCollection";
import ProductRow from "../components/ProductRow";
import SubBannerSection from "../components/SubBannerSection";
import FeaturedAuthors from "../components/FeaturedAuthors";

export default function Home() {
  const [layout, setLayout] = useState([]);
  const [heroBanners, setHeroBanners] = useState([]);
  const [subBanners, setSubBanners] = useState([]);
  const [stripBanners, setStripBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "BookStore - Nhà sách trực tuyến uy tín";
    
    const fetchData = async () => {
      try {
        const [layoutRes, bannerRes] = await Promise.all([
          api.get('/public/layout'),
          api.get('/api/public/banners'),
        ]);

        setLayout(layoutRes || []);
        
        // Lấy danh sách banner và lọc những cái đang Active (Hiển thị)
        const allBanners = bannerRes?.data || bannerRes || [];
        
        // Chuẩn hóa dữ liệu banner
        const normalizeBanner = (b) => ({
            id: b._id,
            imageUrl: getImageUrl(b.imageUrl),
            title: b.title,
            subtitle: b.subtitle,
            cta: b.ctaText,
            link: b.link,
            position: b.position,
            sort: b.sort || 0
        });

        const activeBanners = allBanners.filter(b => b.active).map(normalizeBanner);

        // --- PHÂN LOẠI BANNER VÀO TỪNG NHÓM ---
        setHeroBanners(activeBanners.filter(b => b.position === 'home-hero').sort((a,b) => a.sort - b.sort));
        setSubBanners(activeBanners.filter(b => b.position === 'home-sub').sort((a,b) => a.sort - b.sort));
        setStripBanners(activeBanners.filter(b => b.position === 'home-strip').sort((a,b) => a.sort - b.sort));

      } catch (e) {
        console.error("Home data error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Helpers để lấy banner quảng cáo tiếp theo (tránh lặp lại nếu có nhiều khối quảng cáo)
  let subBannerIndex = 0;
  let stripBannerIndex = 0;

  const getNextSubBanners = () => {
      if (subBanners.length === 0) return [];
      const pair = subBanners.slice(subBannerIndex, subBannerIndex + 2);
      subBannerIndex += 2;
      if (subBannerIndex >= subBanners.length) subBannerIndex = 0; 
      return pair;
  };

  const getNextStripBanner = () => {
      if (stripBanners.length === 0) return null;
      const banner = stripBanners[stripBannerIndex];
      stripBannerIndex = (stripBannerIndex + 1) % stripBanners.length;
      return banner;
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-20 space-y-12 md:space-y-16"> {/* Tăng khoảng cách chung */}
      
      {layout.map((block, index) => {
        const key = block.id || `block-${index}`;

        switch (block.type) {
          case 'banner':
            return heroBanners.length > 0 ? (
                // Bỏ margin bottom ở đây vì đã có space-y-16 ở cha
                <div key={key} className="animate-fade-in container mx-auto max-w-[1920px] px-0 md:px-4 mt-4">
                    <PromoSlider items={heroBanners} />
                </div>
            ) : null;

          case 'sub-banners':
            const pair = getNextSubBanners();
            return pair.length > 0 ? <SubBannerSection key={key} banners={pair} /> : null;

          case 'strip-banner':
            const strip = getNextStripBanner();
            return strip ? (
                <div key={key} className="container mx-auto px-4 max-w-7xl py-10 animate-fade-in">
                    <a href={strip.link || '#'} className="block rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition group relative">
                        <img 
                            src={strip.imageUrl} 
                            alt={strip.title} 
                            className="w-full h-[120px] md:h-[160px] object-cover transition duration-700 group-hover:scale-105"
                        />
                        {/* Hiệu ứng quét sáng nhẹ qua banner */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                    </a>
                </div>
            ) : null;

          case 'collection':
            return <HomeCollection key={key} slug={block.slug} title={block.title} />;

          case 'special-list':
            return <ProductRow key={key} title={block.title} groupType={block.groupType} />;

          case 'authors':
            return <FeaturedAuthors key={key} title={block.title} />;

          default: return null;
        }
      })}
      
      {/* ĐÃ XÓA BANNER NEWSLETTER XẤU XI Ở ĐÂY */}
      
      <style>{`
        @keyframes shimmer { 100% { transform: translateX(100%); } }
      `}</style>
    </div>
  );
}