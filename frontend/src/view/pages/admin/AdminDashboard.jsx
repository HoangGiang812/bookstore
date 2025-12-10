import React, { useEffect, useState, useRef } from 'react';
import { 
  BookOpen, Users, ShoppingCart, CreditCard, BarChart3, Gift, 
  Menu, X, Home, LogOut, Tag, LayoutGrid, RotateCcw, Truck, ChevronDown, User, Bell
} from 'lucide-react';
import api, { getImageUrl } from '@/services/api';
import { useAuth } from '@/store/useAuth';

// Tabs Components
import OverviewTab from './Overview';
import OrdersTab from './Orders';
import CouponsTab from './Coupons';
import UsersTab from './Users';
import ContentTab from './Content';
import ProductsPage from './ProductsPage';
import AuthorsPage from './AuthorsPage';
import PostsAdmin from './PostsAdmin';
import CategoryPage from './CategoryPage';
import CollectionsTab from './CollectionsTab';
import PaymentsTab from './PaymentsTab';
import RMAList from '../../admin/rma/RMAList';
import ShipperTab from './ShipperTab';

// CẤU HÌNH MENU
const MENU_CONFIG = [
  { key: 'overview',    label: 'Tổng quan',           icon: BarChart3,   roles: ['admin', 'staff'] },
  { key: 'orders',      label: 'Quản lý Đơn hàng',    icon: ShoppingCart,roles: ['admin', 'staff'] },
  { key: 'products',    label: 'Sản phẩm',            icon: BookOpen,    roles: ['admin', 'staff'] },
  { key: 'categories',  label: 'Danh mục',            icon: Tag,         roles: ['admin', 'staff'] },
  { key: 'collections', label: 'Bộ sưu tập',          icon: LayoutGrid,  roles: ['admin', 'staff'] },
  { key: 'authors',     label: 'Tác giả',             icon: Users,       roles: ['admin', 'staff'] },
  { key: 'posts',       label: 'Blog / Bài viết',     icon: BookOpen,    roles: ['admin', 'staff'] },
  { key: 'shipper',     label: 'Giao hàng',           icon: Truck,       roles: ['shipper'] },
  { key: 'payments',    label: 'Tài chính',           icon: CreditCard,  roles: ['admin', 'staff'] },
  { key: 'rma',         label: 'Đổi / Trả hàng',      icon: RotateCcw,   roles: ['admin', 'staff'] },
  { key: 'coupons',     label: 'Khuyến mãi',          icon: Gift,        roles: ['admin', 'staff'] },
  { key: 'users',       label: 'Phân quyền',          icon: Users,       roles: ['admin'] },
  { key: 'content',     label: 'Cấu hình Web',        icon: BookOpen,    roles: ['admin'] },
];

const getRoleDisplay = (roles = []) => {
  if (roles.includes('admin')) return { label: 'Quản trị viên', color: 'bg-purple-100 text-purple-700' };
  if (roles.includes('staff')) return { label: 'Nhân viên', color: 'bg-blue-100 text-blue-700' };
  if (roles.includes('shipper')) return { label: 'Shipper', color: 'bg-orange-100 text-orange-700' };
  return { label: 'Thành viên', color: 'bg-gray-100 text-gray-600' };
};

export default function AdminDashboard() {
  const { user, logout: authLogout, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false); // Dropdown user
  
  const userMenuRef = useRef(null);

  // Close user menu click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Role Logic
  const userRoles = user?.roles || [user?.role] || [];
  
  useEffect(() => {
    if (!activeTab && userRoles.length > 0) {
      if (userRoles.includes('shipper') && !userRoles.includes('admin')) {
        setActiveTab('shipper');
      } else {
        setActiveTab('overview');
      }
    }
  }, [userRoles]);

  useEffect(() => {
    const syncUser = () => {
        try {
            const storeData = JSON.parse(localStorage.getItem('bookstore_data_v1') || '{}');
            if (storeData.state?.user) {
                // Kiểm tra nếu avatar khác thì mới set để tránh render thừa
                if (JSON.stringify(storeData.state.user) !== JSON.stringify(user)) {
                    setUser(storeData.state.user);
                }
            }
        } catch {}
    };

    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, [user, setUser]);

  const handleLogout = async () => {
    try { await api.post('/auth/logout', {}); } catch {}
    localStorage.clear();
    try { authLogout?.(); } catch {}
    window.location.replace('/login');
  };

  const renderActiveTab = () => {
    // Truyền prop searchTerm rỗng vì đã xóa thanh search global
    const props = { searchTerm: '' };
    switch (activeTab) {
      case 'overview':    return <OverviewTab setActiveTab={setActiveTab} />;
      case 'products':    return <ProductsPage {...props} />;
      case 'categories':  return <CategoryPage {...props} />;
      case 'orders':      return <OrdersTab {...props} />;
      case 'authors':     return <AuthorsPage {...props} />;
      case 'posts':       return <PostsAdmin {...props} />;
      case 'payments':    return <PaymentsTab {...props} />;
      case 'rma':         return <RMAList {...props} />;
      case 'coupons':     return <CouponsTab {...props} />;
      case 'users':       return <UsersTab {...props} />;
      case 'collections': return <CollectionsTab {...props} />;
      case 'content':     return <ContentTab />;
      case 'shipper':     return <ShipperTab />;
      default:            return <div className="p-10 text-center text-gray-400">Chọn một mục từ menu</div>;
    }
  };

  const availableMenu = MENU_CONFIG.filter(item => 
    item.roles.some(r => userRoles.includes(r))
  );

  const currentTabLabel = MENU_CONFIG.find(i => i.key === activeTab)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      
      {/* --- SIDEBAR (Thanh bên trái) --- */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl lg:shadow-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="h-20 flex items-center px-8 border-b border-gray-100">
          <div className="flex items-center gap-3 text-blue-700">
             <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <BookOpen size={24} strokeWidth={2.5} />
             </div>
             <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight leading-none">BookStore</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Admin Panel</span>
             </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-4">Menu Chính</div>
          {availableMenu.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { setActiveTab(item.key); if(window.innerWidth<1024) setSidebarOpen(false); }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                `}
              >
                <item.icon size={20} className={`transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'}`} />
                {item.label}
                {isActive && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>}
              </button>
            )
          })}
        </nav>

        {/* Footer Sidebar (Version info) */}
        <div className="p-6 text-center text-xs text-gray-400 border-t border-gray-100">
           &copy; 2025 BookStore System<br/>Version 2.0.0
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-gray-50/50">
        
        {/* HEADER (Thanh trên cùng) */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 h-20 flex items-center justify-between px-6 sticky top-0 z-40">
           
           {/* Left: Toggle & Title */}
           <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                 <Menu size={24}/>
              </button>
              <h2 className="text-xl font-bold text-gray-800 hidden sm:block">
                 {currentTabLabel}
              </h2>
           </div>

           {/* Right: User Profile & Actions */}
           <div className="flex items-center gap-4">
              
              {/* Notification (Demo) */}
              <button className="p-2.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition relative">
                 <Bell size={20} />
                 <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>

              <div className="h-8 w-px bg-gray-200 mx-2 hidden sm:block"></div>

              {/* User Dropdown */}
              <div className="relative" ref={userMenuRef}>
                 <button 
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-gray-100 transition border border-transparent hover:border-gray-200"
                 >
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                        {user?.avatarUrl || user?.avatar ? (
                            <img src={getImageUrl(user.avatarUrl || user.avatar)} className="w-full h-full object-cover" alt=""/>
                        ) : (
                            <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                {(user?.name || 'U')[0]}
                            </div>
                        )}
                    </div>
                    <div className="hidden md:flex flex-col items-start">
                        <span className="text-sm font-bold text-gray-900 leading-tight">{user?.name || 'Admin'}</span>
                        
                        {/* LOGIC HIỂN THỊ ROLE MỚI */}
                        {(() => {
                           const { label, color } = getRoleDisplay(userRoles);
                           return (
                             <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-1 ${color}`}>
                                {label}
                             </span>
                           );
                        })()}
                    </div>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                 </button>

                 {/* Dropdown Menu */}
                 {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                        <div className="px-4 py-3 border-b border-gray-100 mb-1">
                            <p className="text-sm font-bold text-gray-900">Tài khoản</p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                        
                        <a href="/" target="_blank" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition mx-2 rounded-lg">
                            <Home size={16}/> Xem trang web
                        </a>
                        {/* Bạn có thể thêm link "Hồ sơ cá nhân" ở đây nếu muốn */}
                        
                        <div className="border-t border-gray-100 my-1"></div>
                        
                        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition mx-2 rounded-lg mb-1">
                            <LogOut size={16}/> Đăng xuất
                        </button>
                    </div>
                 )}
              </div>
           </div>
        </header>

        {/* Content Body (Scrollable) */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
           <div className="max-w-7xl mx-auto animate-fade-in pb-10">
              {renderActiveTab()}
           </div>
        </main>

      </div>
      
      {/* CSS Scrollbar nhỏ đẹp */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}