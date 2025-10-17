import React, { useEffect, useState } from 'react';
import {
  BookOpen, Users, ShoppingCart, DollarSign, TrendingUp, Search,
  Menu, X, Settings, CreditCard, BarChart3, Star, Gift, Bell, Eye, XCircle, RefreshCw, Crown,
  Home, LogOut
} from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/store/useAuth';
import ProductsPage from './ProductsPage';
import AuthorsPage from './AuthorsPage';
import PostsAdmin from './PostsAdmin';
const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n || 0));
const badge = (s) => ({
  available: 'text-green-600 bg-green-100',
  'low-stock': 'text-yellow-600 bg-yellow-100',
  'out-of-stock': 'text-red-600 bg-red-100',
  completed: 'text-green-600 bg-green-100',
  processing: 'text-blue-600 bg-blue-100',
  shipping: 'text-purple-600 bg-purple-100',
  pending: 'text-yellow-600 bg-yellow-100',
  canceled: 'text-red-600 bg-red-100',
  refunded: 'text-orange-600 bg-orange-100',
  paid: 'text-green-600 bg-green-100',
  unpaid: 'text-red-600 bg-red-100',
  active: 'text-green-600 bg-green-100',
  inactive: 'text-gray-600 bg-gray-100',
  admin: 'text-purple-600 bg-purple-100',
  staff: 'text-blue-600 bg-blue-100',
  user: 'text-gray-600 bg-gray-100',
}[s] || 'text-gray-600 bg-gray-100');

const t = (s) => ({
  available: 'Còn hàng', 'low-stock': 'Sắp hết', 'out-of-stock': 'Hết hàng',
  completed: 'Hoàn thành', processing: 'Đang xử lý', shipping: 'Đang giao', pending: 'Chờ xử lý',
  canceled: 'Đã hủy', refunded: 'Đã hoàn', paid: 'Đã thanh toán', unpaid: 'Chưa thanh toán',
  active: 'Hoạt động', inactive: 'Tạm khóa', admin: 'Quản trị', staff: 'Nhân viên', user: 'Khách hàng'
}[s] || s);

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timeFilter, setTimeFilter] = useState('month');
  const [searchTerm, setSearchTerm] = useState('');
  const { user, logout: authLogout, setUser } = useAuth();

  // --------- state từ API ---------
  const [kpi, setKpi] = useState({ status: {}, revenueByDay: [], topBooks: [], topCustomers: [], totals: {} });
  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // --------- loaders ----------
  const loadDashboard = async () => {
    try {
      const days = timeFilter === 'day' ? 1 : timeFilter === 'week' ? 7 : 30;
      const r = await api.get('/admin/dashboard', { params: { unit: timeFilter, days } });
      const revenueArray = r.revenueByDay || r.revenue || [];
      const revenueByDay = revenueArray.map(d => ({
        date: d._id || d.date,
        amount: Number(d.amount || d.sum || 0),
      }));
      const status = r.status || (Array.isArray(r.statusCounts)
        ? r.statusCounts.reduce((acc, cur) => { acc[cur._id] = cur.count || 0; return acc; }, {})
        : {});
      const topBooks = (r.topBooks || []).map(x => ({
        productId: x._id,
        title: x.title || x.bookTitle || String(x._id).slice(-6),
        qty: Number(x.qty || 0),
      }));
      const topCustomers = (r.topCustomers || []).map(x => ({
        customerId: x._id,
        name: x.name || x.customerName || String(x._id).slice(-6),
        email: x.email,
        spent: Number(x.amount || 0),
      }));
      setKpi({
        revenueByDay,
        status,
        topBooks,
        topCustomers,
        totals: r.totals || {
          totalBooks: r.totalBooks || 0,
          totalUsers: r.totalUsers || 0,
          totalOrders: r.totalOrders || 0,
        }
      });
    } catch (e) {
      console.error('dashboard error', e);
      setKpi({ status: {}, revenueByDay: [], topBooks: [], topCustomers: [], totals: {} });
    }
  };

  const loadOrders = async () => {
    try {
      let r;
      try { r = await api.get('/admin/orders'); }
      catch { r = await api.get('/orders'); }
      setOrders(r.items || r);
    } catch (e) {
      console.error('orders error', e);
      setOrders([]);
    }
  };

  const loadCoupons = async () => {
    try {
      const r = await api.get('/admin/coupons');
      setCoupons(r.items || r);
    } catch (e) {
      console.error('coupons error', e);
      setCoupons([]);
    }
  };

  const loadUsers = async () => {
    try {
      const r = await api.get('/admin/users');
      setUsers(r.items || r);
    } catch (e) {
      console.error('users error', e);
      setUsers([]);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadDashboard(), loadOrders(), loadCoupons(), loadUsers()]);
      } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => { loadDashboard(); }, [timeFilter]);

  // --------- actions ---------
  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status });
    } catch {
      await api.patch(`/orders/${orderId}/status`, { status });
    }
    await loadOrders(); await loadDashboard();
  };

  const addOrderNote = async (orderId, text) => {
    if (!text?.trim()) return;
    try {
      await api.post(`/admin/orders/${orderId}/notes`, { text });
    } catch {
      await api.post(`/orders/${orderId}/notes`, { text });
    }
    await loadOrders();
  };

  const refundOrder = async (orderId, amount, reason) => {
    try {
      await api.post(`/admin/orders/${orderId}/refund`, { amount, reason });
    } catch {
      await api.post(`/orders/${orderId}/refund`, { amount, reason });
    }
    await loadOrders(); await loadDashboard();
  };

const handleLogout = async () => {
  try {
    await api.post('/auth/logout', {});
  } catch (e) {
    console.warn('logout api failed (ignored):', e?.message);
  }
  try {
    const removeKeys = [
      'accessToken',
      'refreshToken',
      'auth',
      'auth_tokens',
      'tokens',
      'user',
      'persist:root',
      'bookstore_data_v1',
    ];
    removeKeys.forEach((k) => {
      try { localStorage.removeItem(k); } catch {}
    });
    try {
      const wrap = JSON.parse(localStorage.getItem('bookstore_data_v1') || '{}');
      if (wrap && typeof wrap === 'object') {
        delete wrap.tokens;
        localStorage.setItem('bookstore_data_v1', JSON.stringify(wrap));
      }
    } catch {}

    // Xoá session
    try { sessionStorage.clear(); } catch {}

    // Xoá cookie (nếu BE từng set httpOnly sẽ do server xoá; còn cookie thường thì tự xoá)
    try {
      document.cookie.split(';').forEach((c) => {
        const name = c.split('=')[0].trim();
        if (!name) return;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
    } catch {}
  } catch {}

  // Reset state trong store
  try { authLogout?.(); } catch {}
  try { setUser?.(null); } catch {}

  // Điều hướng + hard reload để chắc chắn UI không giữ cache state
  try { window.location.replace('/login'); } catch {}
  setTimeout(() => { try { window.location.reload(); } catch {} }, 50);
};

  // --------- Overview ---------
  const stats = {
    totalBooks: kpi?.totals?.totalBooks || 0,
    totalUsers: kpi?.totals?.totalUsers || 0,
    totalOrders: kpi?.totals?.totalOrders || 0,
    monthlyRevenue: (kpi.revenueByDay || []).reduce((s, r) => s + Number(r.amount || 0), 0)
  };
  const orderStatuses = { pending: 0, processing: 0, shipping: 0, completed: 0, canceled: 0, refunded: 0, ...(kpi.status || {}) };

  const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="w-4 h-4 mr-1" />
              {trendValue}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  const OverviewTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Tổng quan</h2>
        <div className="flex gap-2">
          {[
            { key: 'day', label: 'Hôm nay' },
            { key: 'week', label: 'Tuần' },
            { key: 'month', label: 'Tháng' }
          ].map(filter => (
            <button key={filter.key}
              onClick={() => setTimeFilter(filter.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timeFilter === filter.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Doanh thu" value={fmt(stats.monthlyRevenue)} icon={DollarSign} color="bg-green-500" trend="up" trendValue="+12%" />
        <StatCard title="Tổng đơn hàng" value={stats.totalOrders.toLocaleString()} icon={ShoppingCart} color="bg-blue-500" trend="up" trendValue="+8%" />
        <StatCard title="Sản phẩm" value={stats.totalBooks.toLocaleString()} icon={BookOpen} color="bg-purple-500" />
        <StatCard title="Khách hàng" value={stats.totalUsers.toLocaleString()} icon={Users} color="bg-orange-500" trend="up" trendValue="+15%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Sách bán chạy</h3>
            <Crown className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="space-y-3">
            {(kpi.topBooks || []).map((book, i) => (
              <div key={book.productId || i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">#{i + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900">{book.title}</p>
                    <p className="text-sm text-gray-600">{book.qty} bán</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Khách hàng VIP</h3>
            <Star className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="space-y-3">
            {(kpi.topCustomers || []).map((c, i) => (
              <div key={c.customerId || i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">#{i + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-sm text-gray-600">{c.email}</p>
                  </div>
                </div>
                <p className="font-medium text-gray-900">{fmt(c.spent)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // --------- Orders Tab (giữ nguyên khung) ---------
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const nextStatus = (s) => ({ pending: 'processing', processing: 'shipping', shipping: 'completed' }[s] || s);

  const AddNote = ({ onAdd }) => {
    const [note, setNote] = useState('');
    return (
      <div className="flex gap-2">
        <input value={note} onChange={(e) => setNote(e.target.value)} className="flex-1 border rounded-lg px-3 py-2" placeholder="Thêm ghi chú..." />
        <button onClick={() => { if (note.trim()) onAdd(note.trim()); setNote(''); }} className="px-3 py-2 bg-blue-600 text-white rounded-lg">Thêm</button>
      </div>
    );
  };

  const RefundBox = ({ onRefund }) => {
    const [amount, setAmount] = useState(0); const [reason, setReason] = useState('');
    return (
      <div className="mt-4 border-t pt-4">
        <div className="text-sm font-medium mb-2">Hoàn tiền</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input type="number" min={0} className="border rounded-lg px-3 py-2" value={amount} onChange={(e) => setAmount(Number(e.target.value))} placeholder="Số tiền" />
          <input className="border rounded-lg px-3 py-2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do" />
          <button onClick={() => onRefund(amount, reason)} className="px-3 py-2 bg-orange-600 text-white rounded-lg">Tạo hoàn tiền</button>
        </div>
      </div>
    );
  };

  const OrdersTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {Object.entries(orderStatuses).map(([s, c]) => (
          <div key={s} className="bg-white rounded-lg border p-4 text-center">
            <div className={`inline-flex p-2 rounded-full mb-2 ${badge(s)}`} />
            <p className="text-xl font-bold text-gray-900">{c}</p>
            <p className="text-xs text-gray-600">{t(s)}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn hàng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổng tiền</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái đơn</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thanh toán</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày đặt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((o) => (
                <tr key={o._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">#{String(o._id).slice(-6)}</p>
                      <p className="text-sm text-gray-600">{o.items?.length} sản phẩm</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{o.customer?.name || o.customerName || o.shippingAddress?.name}</p>
                      <p className="text-sm text-gray-600">{o.customer?.email || o.shippingAddress?.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{fmt(o.total?.grand ?? o.total ?? 0)}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${badge(o.status)}`}>{t(o.status)}</span></td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${badge(o.paymentStatus)}`}>{t(o.paymentStatus)}</span></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-800" onClick={() => { setSelectedOrder(o); setShowModal(true); }}>
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-800" onClick={() => updateOrderStatus(o._id, nextStatus(o.status))}>
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      {o.status !== 'canceled' && (
                        <button className="text-red-600 hover:text-red-800" onClick={() => updateOrderStatus(o._id, 'canceled')}>
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">Chưa có dữ liệu đơn hàng.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setShowModal(false); setSelectedOrder(null); }}>
          <div className="bg-white rounded-xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Đơn #{selectedOrder._id}</h3>
              <button onClick={() => { setShowModal(false); setSelectedOrder(null); }}><X className="w-5 h-5" /></button>
            </div>
            {/* ... nội dung chi tiết đơn hàng, ghi chú, hoàn tiền ... */}
          </div>
        </div>
      )}
    </div>
  );

  const CouponsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Khuyến mãi & Mã giảm giá</h2>
      </div>
      {/* ... bảng mã giảm giá ... */}
    </div>
  );

  const UsersTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Người dùng & Phân quyền</h2>
      {/* ... bảng người dùng ... */}
    </div>
  );

  const ContentTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Nội dung & Cấu hình</h2>
      <div className="text-gray-600">Trang này đã sẵn sàng để nối vào API Banner/Pages/Settings.</div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />;
      case 'products': return <ProductsPage />; 
      case 'orders': return <OrdersTab />;
      case 'authors': return <AuthorsPage />;
      case 'posts': return <PostsAdmin />;
      case 'payments': return <div className="text-gray-600">Tham chiếu Orders + Dashboard (nếu có Transactions API thì hiển thị tại đây).</div>;
      case 'coupons': return <CouponsTab />;
      case 'users': return <UsersTab />;
      case 'content': return <ContentTab />;
      default: return <OverviewTab />;
    }
  };

  if (loading) return <div className="p-6">Đang tải dữ liệu…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0`}>
        <div className="flex items-center justify-between h-16 px-6 bg-blue-600 text-white">
          <h1 className="text-xl font-bold">BookStore Admin</h1>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden"><X className="w-6 h-6" /></button>
        </div>
        <nav className="mt-8">
          <div className="px-4 space-y-2">
            {[
              ['overview', 'Tổng quan', BarChart3],
              ['products', 'Quản lý sản phẩm', BookOpen],
              ['authors', 'Tác giả', Users], 
              ['posts', 'Bài viết', BookOpen],
              ['orders', 'Quản lý đơn hàng', ShoppingCart],
              ['payments', 'Thanh toán & Hoàn tiền', CreditCard],
              ['coupons', 'Khuyến mãi & Mã giảm giá', Gift],
              ['users', 'Người dùng & Phân quyền', Users],
              ['content', 'Nội dung & Cấu hình', Settings],
            ].map(([k, label, Icon]) => (
              <button key={k} onClick={() => setActiveTab(k)}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${activeTab === k ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Icon className="w-5 h-5 mr-3" />{label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Main */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-gray-600 hover:text-gray-900"><Menu className="w-6 h-6" /></button>
            <div className="hidden md:block flex-1 max-w-md mx-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Tìm kiếm..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>

            {/* RIGHT cluster: Về trang chủ + Thông tin + Đăng xuất */}
              <div className="flex items-center gap-2">
                <a
                  href="/"
                  className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border hover:bg-gray-50"
                >
                  <Home className="w-4 h-4" /> Về trang chính
                </a>

                <div className="hidden sm:flex flex-col items-end mr-2">
                  <p className="text-sm font-medium text-gray-900">{user?.name || 'Admin'}</p>
                  <p className="text-xs text-gray-500">{(user?.roles || [user?.role]).filter(Boolean).join(', ')}</p>
                </div>
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                  {(user?.name || 'A')[0]}
                </div>

                <button
                  onClick={handleLogout}
                  className="ml-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" /> Đăng xuất
                </button>

                {/* chuông thông báo giữ nguyên bên phải nếu muốn */}
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
