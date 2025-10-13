// File: src/view/pages/AboutUsPage.jsx (PHIÊN BẢN CUỐI CÙNG - KẾT NỐI MONGODB)

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Sparkles, Users, MapPin, Phone, Mail } from 'lucide-react';
import { fetchPageBySlug } from '../../services/public'; // Sử dụng lại service đã tạo

// Ánh xạ tên icon từ dữ liệu sang component Icon thật
const iconMap = {
  Heart: Heart,
  Sparkles: Sparkles,
  Users: Users,
};

const AboutUsPage = () => {
  const [pageData, setPageData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPage = async () => {
      try {
        const data = await fetchPageBySlug('about');
        setPageData(data);
        document.title = data?.title || "Về Chúng Tôi - BookStore";
      } catch (err) {
        console.error("Lỗi khi tải trang:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadPage();
  }, []);

  if (isLoading) {
    return <div className="text-center py-40">Đang tải dữ liệu...</div>;
  }

  if (!pageData) {
    return <div className="text-center py-40 text-red-600">Không thể tải được nội dung trang.</div>;
  }

  return (
    <div className="bg-white">
      {/* ===== 1. HERO SECTION (Lấy dữ liệu động) ===== */}
      <section 
        className="relative bg-cover bg-center text-white py-24 md:py-32" 
        style={{ backgroundImage: `url('${pageData.hero?.backgroundImage}')` }}
      >
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">{pageData.hero?.title}</h1>
          <p className="text-lg md:text-xl max-w-3xl mx-auto">{pageData.hero?.subtitle}</p>
        </div>
      </section>

      {/* ===== 2. OUR MISSION SECTION (Lấy dữ liệu động) ===== */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-4">{pageData.mission?.title}</h2>
            <p className="text-gray-600">{pageData.mission?.description}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {pageData.coreValues?.map((value, index) => {
              const IconComponent = iconMap[value.icon] || Sparkles; // Lấy component Icon
              return (
                <div key={index} className="p-6">
                  <IconComponent className="w-12 h-12 mx-auto text-blue-500 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      
      {/* ===== 3. CONTACT & CALL TO ACTION SECTION (Lấy dữ liệu động) ===== */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">{pageData.contact?.title}</h2>
              <p className="text-gray-600 mb-8">{pageData.contact?.description}</p>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <MapPin className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Địa chỉ văn phòng</h4>
                    <p className="text-gray-600">{pageData.contact?.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Phone className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Số điện thoại hỗ trợ</h4>
                    <a href={`tel:${pageData.contact?.phone}`} className="text-gray-600 hover:text-blue-600">{pageData.contact?.phone} <span className="text-sm">(Giờ hành chính, T2-T6)</span></a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Mail className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Email</h4>
                    <a href={`mailto:${pageData.contact?.email}`} className="text-gray-600 hover:text-blue-600">{pageData.contact?.email}</a>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-8 md:p-12 text-center shadow-2xl shadow-blue-200">
              <h3 className="text-3xl font-extrabold mb-4">Bạn đã sẵn sàng cho cuộc phiêu lưu tri thức tiếp theo?</h3>
              <p className="mb-8 max-w-md mx-auto">Hàng ngàn đầu sách hấp dẫn đang chờ bạn khám phá. Hãy bắt đầu hành trình của bạn ngay hôm nay!</p>
              <Link to="/categories" className="inline-block bg-white text-blue-600 font-bold text-lg px-10 py-4 rounded-full hover:bg-gray-100 transform hover:scale-105 transition-transform duration-300">
                Khám Phá Toàn Bộ Sách
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUsPage;