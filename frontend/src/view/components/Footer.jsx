import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Facebook, Instagram, Youtube, Twitter,
  Mail, Phone, MapPin, Send, BookOpen, 
  ShieldCheck, HelpCircle, FileText, ArrowRight 
} from 'lucide-react';
import { useUI } from '../../store/useUI'; // Giả sử bạn có store UI để show toast

export default function Footer() {
  const { showToast } = useUI(); // Hoặc dùng alert nếu chưa có store
  const [email, setEmail] = useState("");

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
        // Fallback nếu không có showToast
        if(typeof showToast === 'function') showToast({ type: 'error', title: 'Email không hợp lệ' });
        else alert("Vui lòng nhập email hợp lệ");
        return;
    }
    
    // Giả lập call API
    if(typeof showToast === 'function') showToast({ type: 'success', title: 'Đăng ký thành công!', message: 'Cảm ơn bạn đã quan tâm.' });
    else alert("Đăng ký thành công! Cảm ơn bạn.");
    
    setEmail("");
  };

  return (
    <footer className="bg-slate-950 text-slate-400 text-sm border-t border-slate-900 relative overflow-hidden">
        
      {/* Decorative Top Gradient Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

      <div className="container mx-auto px-4 pt-16 pb-8">
        
        {/* --- TOP SECTION: NEWSLETTER & BRAND --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16 border-b border-slate-800 pb-12">
           
           {/* Brand Intro */}
           <div className="lg:col-span-5 space-y-4">
              <Link to="/" className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-8 h-8 text-indigo-500" />
                  <span className="text-2xl font-black text-white tracking-tight">BookStore</span>
              </Link>
              <p className="leading-relaxed text-slate-400 max-w-md">
                 Nền tảng thương mại điện tử sách hàng đầu. Chúng tôi tin rằng mỗi cuốn sách là một món quà vô giá, mang tri thức và cảm xúc đến mọi người.
              </p>
              <div className="flex gap-3 pt-2">
                 <SocialBtn icon={Facebook} color="hover:bg-[#1877F2]" />
                 <SocialBtn icon={Instagram} color="hover:bg-[#E4405F]" />
                 <SocialBtn icon={Youtube} color="hover:bg-[#FF0000]" />
                 <SocialBtn icon={Twitter} color="hover:bg-[#1DA1F2]" />
              </div>
           </div>

           {/* Newsletter Form */}
           <div className="lg:col-span-7 bg-slate-900/50 p-8 rounded-2xl border border-slate-800 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-indigo-500/20 transition duration-1000"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
                  <div className="flex-1 text-center md:text-left">
                      <h3 className="text-xl font-bold text-white mb-2">Đăng ký nhận bản tin</h3>
                      <p className="text-slate-400 text-xs">Nhận mã giảm giá 10% cho đơn hàng đầu tiên và thông tin sách mới.</p>
                  </div>
                  <form onSubmit={handleSubscribe} className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
                      <input 
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Nhập email của bạn..." 
                        className="bg-slate-950 border border-slate-700 text-white px-4 py-3 rounded-xl w-full md:w-64 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition placeholder-slate-600" 
                      />
                      <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-indigo-900/20">
                         <Send size={18}/> Đăng ký
                      </button>
                  </form>
              </div>
           </div>
        </div>

        {/* --- MAIN LINKS --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-16">
           
           {/* Cột 1: Khám phá */}
           <div className="space-y-4">
              <h4 className="text-white font-bold text-base">Khám phá</h4>
              <ul className="space-y-2">
                 <FooterLink to="/categories">Sách mới phát hành</FooterLink>
                 <FooterLink to="/collections/sach-ban-chay">Sách bán chạy nhất</FooterLink>
                 <FooterLink to="/authors">Tác giả nổi bật</FooterLink>
                 <FooterLink to="/collections/sach-giao-khoa">Sách giáo khoa</FooterLink>
              </ul>
           </div>

           {/* Cột 2: Chính sách (Quan trọng cho Trust) */}
           <div className="space-y-4">
              <h4 className="text-white font-bold text-base">Chính sách</h4>
              <ul className="space-y-2">
                 <FooterLink to="/policy/return">Chính sách đổi trả</FooterLink>
                 <FooterLink to="/policy/shipping">Chính sách vận chuyển</FooterLink>
                 <FooterLink to="/policy/privacy">Bảo mật thông tin</FooterLink>
                 <FooterLink to="/policy/payment">Phương thức thanh toán</FooterLink>
              </ul>
           </div>

           {/* Cột 3: Hỗ trợ */}
           <div className="space-y-4">
              <h4 className="text-white font-bold text-base">Hỗ trợ khách hàng</h4>
              <ul className="space-y-2">
                 <FooterLink to="/account/orders">Tra cứu đơn hàng</FooterLink>
                 <FooterLink to="/account/info">Tài khoản của tôi</FooterLink>
                 <FooterLink to="/contact">Liên hệ góp ý</FooterLink>
                 <FooterLink to="/faq">Câu hỏi thường gặp</FooterLink>
              </ul>
           </div>

           {/* Cột 4: Liên hệ */}
           <div className="space-y-4">
              <h4 className="text-white font-bold text-base">Văn phòng</h4>
              <ul className="space-y-4">
                 <li className="flex items-start gap-3">
                    <MapPin size={20} className="text-indigo-500 shrink-0 mt-0.5"/>
                    <span>Tầng 3, Tòa nhà BookTower, 123 Đường Sách, Q.1, TP.HCM</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <Phone size={20} className="text-indigo-500 shrink-0"/>
                    <a href="tel:1900123456" className="hover:text-white transition">1900 123 456</a>
                 </li>
                 <li className="flex items-center gap-3">
                    <Mail size={20} className="text-indigo-500 shrink-0"/>
                    <a href="mailto:support@bookstore.vn" className="hover:text-white transition">support@bookstore.vn</a>
                 </li>
              </ul>
           </div>
        </div>

        {/* --- BOTTOM BAR --- */}
        <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="text-slate-500 text-xs text-center md:text-left">
              <p>&copy; 2025 BookStore Vietnam. All rights reserved.</p>
              <p className="mt-1">Giấy chứng nhận ĐKKD số: 0312345678 do Sở KH & ĐT TP.HCM cấp.</p>
           </div>

           {/* Payment Icons (Styled Container) */}
           <div className="flex gap-2">
              {['Visa', 'Mastercard', 'MoMo', 'ZaloPay'].map((pm, i) => (
                  <div key={i} className="h-8 w-12 bg-white rounded flex items-center justify-center overflow-hidden opacity-80 hover:opacity-100 transition cursor-pointer" title={pm}>
                      {/* Placeholder ảnh, bạn có thể thay bằng icon thật */}
                      <span className="text-[10px] font-bold text-slate-800">{pm}</span> 
                  </div>
              ))}
           </div>
        </div>
      </div>
    </footer>
  );
}

// Helper Components để code gọn hơn
const SocialBtn = ({ icon: Icon, color }) => (
    <a 
      href="#" 
      className={`w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 transition-all duration-300 hover:text-white hover:-translate-y-1 ${color}`}
    >
        <Icon size={18}/>
    </a>
);

const FooterLink = ({ to, children }) => (
    <li>
        <Link to={to} className="flex items-center gap-2 hover:text-white hover:translate-x-1 transition-all duration-200 group">
            <ArrowRight size={12} className="opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 transition-all text-indigo-500" />
            {children}
        </Link>
    </li>
);