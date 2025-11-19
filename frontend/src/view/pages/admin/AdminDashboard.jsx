import React, { useEffect, useState } from 'react';
import { BookOpen, Users, ShoppingCart, CreditCard, BarChart3, Gift, Bell, Search, Menu, X, Home, LogOut, Tag, LayoutGrid, RotateCcw } from 'lucide-react';
import api, { getImageUrl } from '@/services/api';
import { useAuth } from '@/store/useAuth';

// Tabs cùng cấp
import OverviewTab from './Overview.jsx';
import OrdersTab from './Orders.jsx';
import CouponsTab from './Coupons.jsx';
import UsersTab from './Users.jsx';
import ContentTab from './Content.jsx';

// Các trang bạn đã có
import ProductsPage from './ProductsPage';
import AuthorsPage from './AuthorsPage';
import PostsAdmin from './PostsAdmin';
import CategoryPage from './CategoryPage.jsx';
import CollectionsTab from './CollectionsTab.jsx';
import PaymentsTab from './PaymentsTab.jsx';
import RMAList from '../../admin/rma/RMAList.jsx';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timeFilter, setTimeFilter] = useState('month');
  const { user, logout: authLogout, setUser } = useAuth();
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [kpi, setKpi] = useState({ status:{}, revenueByDay:[], topBooks:[], topCustomers:[], totals:{} });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const isAdmin = user?.roles?.includes('admin');
  const loadDashboard = async () => {
    try {
      const days = timeFilter === 'day' ? 1 : timeFilter === 'week' ? 7 : 30;
      const r = await api.get('/admin/dashboard', { params: { unit: timeFilter, days } });
      const revenueArray = r.revenueByDay || r.revenue || [];
      const revenueByDay = revenueArray.map(d => ({ date: d._id || d.date, amount: Number(d.amount || d.sum || 0) }));
      const status = r.status || (Array.isArray(r.statusCounts)
        ? r.statusCounts.reduce((a,c)=>{a[c._id]=c.count||0;return a;}, {})
        : {});
      setKpi({
        revenueByDay,
        status,
        topBooks: r.topBooks || [],
        topCustomers: r.topCustomers || [],
        totals: r.totals || { totalBooks:r.totalBooks||0, totalUsers:r.totalUsers||0, totalOrders:r.totalOrders||0 }
      });
    } catch (e) {
      console.error('dashboard error', e);
      setKpi({ status:{}, revenueByDay:[], topBooks:[], topCustomers:[], totals:{} });
    }
  };

  const loadOrders = async () => {
    try {
      const r = await api.get('/admin/orders').catch(()=>api.get('/orders'));
      setOrders(r.items || r);
    } catch (e) {
      console.error('orders error', e);
      setOrders([]);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { await Promise.all([loadDashboard(), loadOrders()]); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => { loadDashboard(); }, [timeFilter]);

  const handleLogout = async () => {
    try { await api.post('/auth/logout', {}); } catch {}
    try {
      ['accessToken','refreshToken','auth','auth_tokens','tokens','user','persist:root','bookstore_data_v1']
        .forEach(k => { try { localStorage.removeItem(k); } catch {} });
      sessionStorage.clear?.();
      document.cookie.split(';').forEach((c) => {
        const name = c.split('=')[0].trim();
        if (name) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
    } catch {}
    try { authLogout?.(); } catch {}
    try { setUser?.(null); } catch {}
    try { window.location.replace('/login'); } catch {}
    setTimeout(() => { try { window.location.reload(); } catch {} }, 50);
  };

  const orderStatuses = {
    pending:0, processing:0, shipping:0, completed:0, canceled:0, refunded:0, cancel_requested:0,
    ...(kpi.status || {})
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab kpi={kpi} timeFilter={timeFilter} setTimeFilter={setTimeFilter} />;
      case 'products':
        return <ProductsPage searchTerm={globalSearchTerm} />;
      case 'categories':
        return <CategoryPage searchTerm={globalSearchTerm} />;
      case 'orders':
        return (
          <OrdersTab
            orders={orders}
            orderStatuses={orderStatuses}
            reloadOrders={loadOrders}
            reloadKpis={loadDashboard}
            searchTerm={globalSearchTerm}
          />
        );
      case 'authors':
        return <AuthorsPage searchTerm={globalSearchTerm} />;
      case 'posts':
        return <PostsAdmin searchTerm={globalSearchTerm} />;
      case 'payments':
        return <PaymentsTab searchTerm={globalSearchTerm} />;
      case 'rma':
        return <RMAList searchTerm={globalSearchTerm} />;
      case 'coupons':
        return <CouponsTab searchTerm={globalSearchTerm} />
      case 'users':
        return <UsersTab searchTerm={globalSearchTerm} />;
      case 'collections':
        return <CollectionsTab searchTerm={globalSearchTerm} />
      case 'content':
        return <ContentTab />;
      default:
        return <OverviewTab kpi={kpi} timeFilter={timeFilter} setTimeFilter={setTimeFilter} />;
    }
  };

  if (loading) return <div className="p-6">Đang tải dữ liệu…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col h-screen`}>
        
        <div className="flex items-center justify-between h-16 px-6 bg-blue-600 text-white flex-shrink-0">
          <h1 className="text-xl font-bold">BookStore Admin</h1>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden"><X className="w-6 h-6" /></button>
        </div>
        
        <nav className="mt-8 flex-1 overflow-y-auto pb-8">
          <div className="px-4 space-y-2">
            {[
              ['overview','Tổng quan',BarChart3, false],
              ['products','Quản lý sản phẩm',BookOpen, false],
              ['categories', 'Quản lý Danh mục', Tag, false],
              ['collections','Bộ sưu tập', LayoutGrid, true],
              ['authors','Tác giả',Users, false],
              ['posts','Bài viết',BookOpen, false],
              ['orders','Quản lý đơn hàng',ShoppingCart, false],
              ['payments','Thanh toán & Hoàn tiền',CreditCard, false],
              ['rma', 'Quản lý Đổi/Trả', RotateCcw, true],
              ['coupons','Khuyến mãi & Mã giảm giá',Gift, false],
              ['users','Người dùng & Phân quyền',Users, true], 
              ['content','Nội dung & Cấu hình',BookOpen, true],
            ].map(([k, label, Icon, adminOnly]) => {
              if (adminOnly && !isAdmin) {
                return null;
              }
              return (
                <button
                  key={k}
                  onClick={() => setActiveTab(k)}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === k ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />{label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Main */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-gray-600 hover:text-gray-900">
              <Menu className="w-6 h-6" />
            </button>

            <div className="hidden md:block flex-1 max-w-md mx-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm..." 
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={globalSearchTerm}
                  onChange={(e) => setGlobalSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a href="/" className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border hover:bg-gray-50">
                <Home className="w-4 h-4" /> Về trang chính
              </a>
              <div className="hidden sm:flex flex-col items-end mr-2">
                <p className="text-sm font-medium">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-500">{(user?.roles || [user?.role]).filter(Boolean).join(', ')}</p>
              </div>
              <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-300 bg-blue-500 flex items-center justify-center shrink-0">
                {(user?.avatarUrl || user?.avatar) ? (
                  <img
                    src={getImageUrl(user.avatarUrl || user.avatar)}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }} // Nếu lỗi ảnh thì ẩn đi để hiện chữ cái bên dưới
                  />
                ) : null}
                
                {/* Fallback: Nếu không có ảnh hoặc ảnh lỗi, hiển thị chữ cái đầu */}
                <span className={`text-white font-medium ${(user?.avatarUrl || user?.avatar) ? 'hidden' : 'block'}`}>
                  {(user?.name || 'A')[0]}
                </span>
              </div>
              <button onClick={handleLogout} className="ml-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200" title="Đăng xuất">
                <LogOut className="w-4 h-4" /> Đăng xuất
              </button>
              <button className="ml-1 text-gray-600 hover:text-gray-900 relative">
                <Bell className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">3</span>
              </button>
            </div>
          </div>
        </header>

        <main className="p-6">{renderActiveTab()}</main>
      </div>
    </div>
  );
}
