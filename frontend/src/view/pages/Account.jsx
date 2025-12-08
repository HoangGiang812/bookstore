import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/useAuth';
import { getImageUrl } from '../../services/api';
import { 
  User, MapPin, ShoppingBag, Star, MessageSquare, LogOut, 
  ChevronRight, Camera 
} from 'lucide-react';
import api from '../../services/api';

export default function Account() {
  const { user, logoutAll } = useAuth();
  const location = useLocation();
  const nav = useNavigate();

  // Hàm kiểm tra link active để tô màu
  const isActive = (path) => location.pathname.includes(path);

  const handleLogout = async () => {
      try { await api.post('/auth/logout'); } catch {}
      logoutAll();
      nav('/login');
  };

  const MENU = [
      { path: '/account/info', label: 'Thông tin tài khoản', icon: User },
      { path: '/account/orders', label: 'Quản lý đơn hàng', icon: ShoppingBag },
      { path: '/account/addresses', label: 'Sổ địa chỉ', icon: MapPin },
      { path: '/account/reviews', label: 'Đánh giá sản phẩm', icon: Star },
      { path: '/account/comments', label: 'Nhận xét của tôi', icon: MessageSquare },
  ];

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      
      {/* Breadcrumb */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-30">
          <div className="container mx-auto px-4 max-w-6xl h-14 flex items-center text-sm text-gray-500">
            <Link to="/" className="hover:text-blue-600 hover:underline">Trang chủ</Link>
            <ChevronRight size={14} className="mx-2"/>
            <span className="text-gray-800 font-bold">Tài khoản</span>
          </div>
      </div>

      <div className="container mx-auto px-4 max-w-6xl py-8 grid lg:grid-cols-[280px,1fr] gap-8 items-start">
        
        {/* --- SIDEBAR DÙNG CHUNG --- */}
        <aside className="bg-white rounded-2xl border border-gray-200 shadow-sm sticky top-20 overflow-hidden">
          
          {/* User Info Card */}
          <div className="p-6 border-b border-gray-100 flex flex-col items-center text-center bg-gradient-to-b from-blue-50/50 to-white">
            <div className="relative mb-3">
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-200">
                    {user?.avatarUrl || user?.avatar ? (
                        <img src={getImageUrl(user.avatarUrl || user.avatar)} className="w-full h-full object-cover"/>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400 bg-gray-100">
                            {(user?.name || 'U')[0]}
                        </div>
                    )}
                </div>
            </div>
            <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{user?.name || 'Khách hàng'}</h3>
            <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1">
            {MENU.map((item) => {
                const active = isActive(item.path);
                return (
                    <Link 
                        key={item.path} 
                        to={item.path} 
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                            active 
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                            : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                        }`}
                    >
                        <item.icon size={18} className={active ? 'text-white' : 'text-gray-400'}/>
                        {item.label}
                    </Link>
                )
            })}

            <div className="border-t border-gray-100 my-2 pt-2">
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                >
                    <LogOut size={18}/> Đăng xuất
                </button>
            </div>
          </nav>
        </aside>

        {/* --- VÙNG HIỂN THỊ TRANG CON (Outlet) --- */}
        <main className="min-w-0">
             {/* Đây là nơi Orders, Info, Address... sẽ hiện ra */}
             <Outlet /> 
        </main>

      </div>
    </div>
  );
}