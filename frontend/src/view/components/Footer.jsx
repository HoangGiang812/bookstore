import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, Mail, Phone, MapPin, Send } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-16 pb-8">
      <div className="container mx-auto px-4">
        
        {/* Top Section: Newsletter */}
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-gray-800 pb-10 mb-10 gap-6">
           <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold text-white mb-2">Đăng ký nhận tin</h3>
              <p className="text-sm text-gray-400">Nhận thông báo về sách mới và ưu đãi đặc biệt sớm nhất.</p>
           </div>
           <div className="flex w-full md:w-auto gap-2">
              <input 
                placeholder="Email của bạn..." 
                className="bg-gray-800 border-none text-white px-4 py-3 rounded-lg w-full md:w-80 focus:ring-2 focus:ring-blue-600 outline-none" 
              />
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2">
                 <Send size={18}/> <span className="hidden sm:inline">Đăng ký</span>
              </button>
           </div>
        </div>

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
           {/* Cột 1: Thông tin */}
           <div>
              <h4 className="text-white font-bold text-lg mb-4">Về BookStore</h4>
              <p className="text-sm leading-relaxed mb-4">
                 Nhà sách trực tuyến uy tín hàng đầu. Nơi lan tỏa văn hóa đọc với hàng ngàn đầu sách chọn lọc.
              </p>
              <div className="flex gap-4">
                 <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 hover:text-white transition"><Facebook size={20}/></a>
                 <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-pink-600 hover:text-white transition"><Instagram size={20}/></a>
                 <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-red-600 hover:text-white transition"><Youtube size={20}/></a>
              </div>
           </div>

           {/* Cột 2: Liên kết nhanh */}
           <div>
              <h4 className="text-white font-bold text-lg mb-4">Khám phá</h4>
              <ul className="space-y-2 text-sm">
                 <li><Link to="/categories" className="hover:text-blue-500 transition">Sách mới phát hành</Link></li>
                 <li><Link to="/collections/sach-ban-chay" className="hover:text-blue-500 transition">Sách bán chạy</Link></li>
                 <li><Link to="/promotions" className="hover:text-blue-500 transition">Khuyến mãi & Ưu đãi</Link></li>
                 <li><Link to="/authors" className="hover:text-blue-500 transition">Tác giả nổi bật</Link></li>
              </ul>
           </div>

           {/* Cột 3: Hỗ trợ */}
           <div>
              <h4 className="text-white font-bold text-lg mb-4">Hỗ trợ khách hàng</h4>
              <ul className="space-y-2 text-sm">
                 <li><Link to="/support" className="hover:text-blue-500 transition">Trung tâm trợ giúp</Link></li>
                 <li><Link to="/about" className="hover:text-blue-500 transition">Về chúng tôi</Link></li>
                 <li><Link to="#" className="hover:text-blue-500 transition">Chính sách đổi trả</Link></li>
                 <li><Link to="#" className="hover:text-blue-500 transition">Chính sách bảo mật</Link></li>
              </ul>
           </div>

           {/* Cột 4: Liên hệ */}
           <div>
              <h4 className="text-white font-bold text-lg mb-4">Liên hệ</h4>
              <ul className="space-y-3 text-sm">
                 <li className="flex items-start gap-3">
                    <MapPin size={18} className="text-blue-500 shrink-0 mt-0.5"/>
                    <span>123 Đường Sách, Quận 1, TP. Hồ Chí Minh</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <Phone size={18} className="text-blue-500 shrink-0"/>
                    <span>1900 123 456</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <Mail size={18} className="text-blue-500 shrink-0"/>
                    <span>hotro@bookstore.vn</span>
                 </li>
              </ul>
           </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
           <p>&copy; 2025 BookStore. All rights reserved.</p>
           <div className="flex gap-4 mt-4 md:mt-0">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" className="h-4 opacity-50 grayscale hover:grayscale-0 transition" alt="Visa"/>
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/MasterCard_Logo.svg/2560px-MasterCard_Logo.svg.png" className="h-4 opacity-50 grayscale hover:grayscale-0 transition" alt="Mastercard"/>
              <img src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png" className="h-4 opacity-50 grayscale hover:grayscale-0 transition" alt="Momo"/>
           </div>
        </div>
      </div>
    </footer>
  );
}