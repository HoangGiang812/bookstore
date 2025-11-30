import { DollarSign, ShoppingCart, BookOpen, Users, Star, Crown } from 'lucide-react';
import StatCard from './StatCard.jsx';

const fmt = (n) => new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(Number(n||0));

export default function Overview({ kpi, timeFilter, setTimeFilter }) {
  // --- SỬA LỖI TẠI ĐÂY: Khởi tạo giá trị mặc định nếu kpi chưa có ---
  const data = kpi || { revenueByDay: [], status: {}, topBooks: [], topCustomers: [], totals: {} };
  const stats = {
    totalBooks: data.totals?.totalBooks || 0,
    totalUsers: data.totals?.totalUsers || 0,
    totalOrders: data.totals?.totalOrders || 0,
    monthlyRevenue: (data.revenueByDay || []).reduce((s, r) => s + Number(r.amount || 0), 0)
  };
  // ------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Tổng quan</h2>
        <div className="flex gap-2">
          {[
            { key: 'day', label: 'Hôm nay' },
            { key: 'week', label: 'Tuần' },
            { key: 'month', label: 'Tháng' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setTimeFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeFilter === f.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.label}
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
            {(data.topBooks || []).map((b, i) => (
              <div key={b.productId || i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">#{i + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900">{b.title}</p>
                    <p className="text-sm text-gray-600">{b.qty} bán</p>
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
            {(data.topCustomers || []).map((c, i) => (
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
}