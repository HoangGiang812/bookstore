import React, { useEffect, useState } from 'react';
import api, { getImageUrl } from '@/services/api'
import { 
  DollarSign, ShoppingBag, Users, Box, Download, TrendingUp, 
  Calendar, AlertTriangle, ArrowUpRight, Package, Clock, ChevronRight, Wallet, CheckCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, ReferenceLine
} from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n || 0));

const STATUS_MAP = {
  pending: 'Chờ duyệt',
  confirmed: 'Đã xác nhận',
  processing: 'Đang đóng gói',
  ready_to_pick: 'Chờ lấy hàng',
  shipping: 'Đang giao',
  delivered: 'Giao thành công',
  completed: 'Hoàn tất',
  
  // Hủy & Hoàn
  cancelled: 'Đã hủy',
  canceled: 'Đã hủy', 
  cancel_requested: 'Yêu cầu hủy',
  
  // Lỗi & Trả
  delivery_failed: 'Giao thất bại',
  returned: 'Hoàn về kho',
  refunded: 'Đã hoàn tiền',
  
  // RMA (Nếu muốn hiện cả trạng thái RMA)
  picking: 'Shipper đang lấy hoàn',
  picked: 'Shipper đã lấy hoàn',
  returned_to_warehouse: 'Đã trả kho (RMA)'
};

export default function Overview({ setActiveTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/overview', { params: { range } });
        setData(res);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [range]);

  const handleExport = () => {
      if (!data) return;
      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(data.chart || []);
      XLSX.utils.book_append_sheet(wb, ws1, "Doanh Thu");
      const ws2 = XLSX.utils.json_to_sheet(data.topProducts || []);
      XLSX.utils.book_append_sheet(wb, ws2, "Top San Pham");
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([buffer], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), `Report_${Date.now()}.xlsx`);
  };

  const COLORS = [
    '#3b82f6', // Blue (Chờ duyệt)
    '#8b5cf6', // Purple (Đang giao)
    '#10b981', // Green (Thành công)
    '#f59e0b', // Yellow (Đang đóng gói)
    '#ef4444', // Red (Đã hủy - QUAN TRỌNG)
    '#f97316', // Orange (Hoàn trả)
    '#6b7280', // Gray (Khác)
  ];
  const pieData = React.useMemo(() => {
      const raw = data?.pie || [];
      const group = {};
      
      raw.forEach(item => {
          // Chuẩn hóa tên (gộp cancelled/canceled)
          let name = item.name;
          if (name === 'canceled') name = 'cancelled'; // Gộp về 1 key chuẩn
          
          const label = STATUS_MAP[name] || name;
          
          if (!group[label]) group[label] = 0;
          group[label] += item.value;
      });

      return Object.keys(group).map(key => ({ name: key, value: group[key] }));
  }, [data]);

  if (loading) return (
    <div className="min-h-[600px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
          <TrendingUp className="w-8 h-8 text-indigo-600 animate-bounce"/>
        </div>
        <p className="text-gray-400 font-medium">Đang phân tích dữ liệu kinh doanh...</p>
      </div>
    </div>
  );

  if (!data) return <div className="p-20 text-center text-red-500">Không thể tải dữ liệu.</div>;

  return (
    <div className="space-y-8 pb-20 font-sans text-gray-900">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <span className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-200">
                <Wallet size={24} strokeWidth={2.5}/>
              </span>
              Tổng quan
            </h1>
            <p className="text-gray-500 mt-2 font-medium ml-1">
              Chào mừng trở lại! Dưới đây là hiệu suất kinh doanh {range === 'today' ? 'hôm nay' : range === '7d' ? '7 ngày qua' : range === 'year' ? 'năm nay' : '30 ngày qua'}.
            </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200/60">
            <select 
                className="bg-transparent font-bold text-sm py-2 pl-3 pr-8 rounded-xl text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-gray-50 transition"
                value={range} onChange={e => setRange(e.target.value)}
            >
                <option value="today">Hôm nay</option>
                <option value="7d">7 ngày qua</option>
                <option value="30d">30 ngày qua</option>
                <option value="year">Năm nay</option>
            </select>
            <div className="w-px h-6 bg-gray-200"></div>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition shadow-md active:scale-95">
                <Download size={16}/> Xuất báo cáo
            </button>
        </div>
      </div>

      {/* --- KPI GRID (HERO SECTION) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <HeroCard 
            title="Tổng Doanh Thu" 
            value={fmt(data.stats.totalRevenue)} 
            icon={DollarSign} 
            color="emerald" 
            trend="+12.5%" 
            sub="So với kỳ trước"
          />
          <HeroCard 
            title="Đơn Hàng" 
            value={data.stats.totalOrders} 
            icon={ShoppingBag} 
            color="blue" 
            trend="+5.2%" 
            sub="Tổng đơn đặt hàng"
          />
          <HeroCard 
            title="Khách Hàng" 
            value={data.stats.totalUsers} 
            icon={Users} 
            color="purple" 
            trend="+8.1%" 
            sub="Người dùng đăng ký"
          />
          <HeroCard 
            title="Sản Phẩm" 
            value={data.stats.totalBooks} 
            icon={Box} 
            color="orange" 
            trend="Active" 
            sub="Đang kinh doanh"
          />
      </div>

      {/* --- MAIN CHARTS ROW --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Doanh thu (Area Chart) - Chiếm 2/3 */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-[420px]">
              <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                      <TrendingUp className="text-indigo-600" size={20}/> Xu hướng Doanh thu
                    </h3>
                    <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-wide">Biểu đồ tăng trưởng</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div> Live Data
                  </div>
              </div>
              
              <div className="flex-1 w-full -ml-2">
                  <ResponsiveContainer>
                    <AreaChart data={data.chart}>
                        <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#9ca3af'}} dy={10}/>
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#9ca3af'}} tickFormatter={val=>val>=1000000?`${val/1000000}M`:`${val/1000}k`}/>
                        <Tooltip 
                            contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 20px -5px rgba(0,0,0,0.1)'}} 
                            formatter={(v)=>[fmt(v), 'Lợi nhuận thực']} // Đổi label cho đúng nghĩa
                        />
                        {/* Thêm reference line số 0 để thấy rõ lỗ lãi */}
                        <ReferenceLine y={0} stroke="#000" /> 
                        <Area 
                            type="monotone" 
                            dataKey="sales" 
                            stroke="#4f46e5" 
                            strokeWidth={3} 
                            fill="url(#colorSales)" 
                        />
                    </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Trạng thái đơn (Pie Chart) - Chiếm 1/3 */}
          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[420px] flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03]"><Package size={180} className="rotate-12"/></div>
              
              <div className="mb-4 relative z-10">
                  <h3 className="font-bold text-gray-900 text-lg">Phân bổ Đơn hàng</h3>
                  <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-wide">Tỷ lệ trạng thái xử lý</p>
              </div>

              <div className="flex-1 relative z-10">
                  <ResponsiveContainer>
                      <PieChart>
                          <Pie 
                            data={pieData} 
                            innerRadius={70} 
                            outerRadius={90} 
                            paddingAngle={4} 
                            dataKey="value"
                            cornerRadius={6}
                            
                            // ✅ TẮT HOÀN TOÀN TƯƠNG TÁC CLICK GÂY RA HÌNH VUÔNG
                            isAnimationActive={true} 
                            activeShape={null}       // Không vẽ shape active
                            activeIndex={-1}         // Không có index nào active
                            onMouseEnter={null}      // Tắt sự kiện chuột mặc định nếu cần
                          >
                              {pieData.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={COLORS[index % COLORS.length]} 
                                    strokeWidth={0} // Không viền
                                    
                                    // ✅ CỰC KỲ QUAN TRỌNG: CSS outline: none
                                    style={{ 
                                      outline: 'none', 
                                      filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))', // Đổ bóng nhẹ cho từng miếng cho đẹp
                                      cursor: 'pointer'
                                    }} 
                                    // Hack nhỏ để xóa outline focus của trình duyệt
                                    tabIndex={-1}
                                  />
                              ))}
                          </Pie>
                          
                          {/* ✅ TOOLTIP NÂNG CẤP: Hiện cả Số lượng và Phần trăm */}
                          <Tooltip 
                            // Cho phép Tooltip hiển thị tràn ra ngoài khung chứa nếu cần
                            allowEscapeViewBox={{ x: true, y: true }} 
                            contentStyle={{
                                zIndex: 9999, // ✅ Lớp cao nhất để không bị đè
                                borderRadius: '12px', 
                                border: '1px solid #e5e7eb', 
                                backgroundColor: 'rgba(255, 255, 255, 0.98)', // Trắng đục
                                boxShadow: '0 4px 20px -2px rgba(0,0,0,0.15)', // Bóng đổ đậm hơn
                                padding: '10px 16px'
                            }}
                            itemStyle={{ 
                                color: '#1f2937', // Chữ màu đen xám đậm
                                fontWeight: '700', // Chữ đậm
                                fontSize: '14px'
                            }}
                            formatter={(val, name) => {
                                const total = data.stats.totalOrders || 1;
                                const percent = ((val / total) * 100).toFixed(1);
                                return [
                                  <span key="val" className="text-gray-700">
                                      {val} đơn <span className="text-indigo-600 font-extrabold ml-1">({percent}%)</span>
                                  </span>, 
                                  <span key="name" className="text-gray-500 font-medium mb-1 block border-b pb-1">{name}</span>
                                ];
                            }}
                          />
                          
                          <Legend 
                            verticalAlign="bottom" 
                            height={36} 
                            iconType="circle" 
                            formatter={(val) => <span className="text-xs font-bold text-gray-600 ml-1">{val}</span>}
                          />
                      </PieChart>
                  </ResponsiveContainer>
                  {/* Center Label */}
                  <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <p className="text-4xl font-black text-gray-900">{data.stats.totalOrders}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Tổng Đơn</p>
                  </div>
              </div>
          </div>
      </div>

      {/* --- BOTTOM SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* TOP PRODUCTS */}
          <div className="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
              <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-white">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Sản phẩm bán chạy</h3>
                    <p className="text-xs text-gray-400 font-bold uppercase mt-1 tracking-wide">Top performers</p>
                  </div>
                  <button 
                      onClick={() => setActiveTab('products')} // ✅ Thêm dòng này để chuyển tab
                      className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition cursor-pointer"
                  >
                      Xem tất cả
                  </button>
              </div>
              <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase tracking-wider font-bold">
                          <tr>
                              <th className="px-8 py-4">Sản phẩm</th>
                              <th className="px-6 py-4 text-right">Đã bán</th>
                              <th className="px-8 py-4 text-right">Doanh thu</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {data.topProducts.map((p, i) => (
                              <tr key={i} className="hover:bg-indigo-50/30 transition group cursor-default">
                                  <td className="px-8 py-4 font-bold text-gray-800 flex items-center gap-3">
                                      <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] ${i===0?'bg-yellow-100 text-yellow-700':i===1?'bg-gray-200 text-gray-700':i===2?'bg-orange-100 text-orange-700':'bg-gray-100 text-gray-500'}`}>
                                          #{i+1}
                                      </span>
                                      <span className="line-clamp-1 group-hover:text-indigo-600 transition">{p.name}</span>
                                  </td>
                                  <td className="px-6 py-4 text-right font-bold text-indigo-600 bg-indigo-50/0 group-hover:bg-indigo-50/50 transition rounded-lg">{p.sold}</td>
                                  <td className="px-8 py-4 text-right text-gray-600 font-mono">{fmt(p.revenue)}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* ALERTS & RECENT */}
          <div className="space-y-6">
              {/* Recent Orders List */}
              <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                  <div className="p-6 border-b border-gray-50">
                      <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                          <Clock size={18} className="text-gray-400"/> Đơn mới nhất
                      </h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                      {data.recentOrders.map(o => (
                          <div key={o._id} className="p-5 flex justify-between items-center hover:bg-gray-50 transition group cursor-pointer">
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs shadow-sm group-hover:scale-110 transition-transform">
                                      {o.code.slice(-2)}
                                  </div>
                                  <div>
                                      <p className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition">{o.userId?.name || 'Khách lẻ'}</p>
                                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-wide">{o.status}</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <p className="font-black text-sm text-gray-800">{fmt(o.total.grand)}</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">{new Date(o.createdAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</p>
                              </div>
                          </div>
                      ))}
                  </div>
                  <button 
                      onClick={() => setActiveTab('orders')}
                      className="w-full py-3 text-xs font-bold text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition flex items-center justify-center gap-1"
                  >
                      Xem tất cả đơn hàng <ChevronRight size={14}/>
                  </button>
              </div>

              {/* Low Stock Warning */}
              {data.lowStock.length > 0 && (
                <div className="bg-red-50 rounded-[32px] border border-red-100 overflow-hidden flex flex-col">
                    {/* Header có thể Click được */}
                    <div className="p-6 flex justify-between items-center border-b border-red-100/50">
                        <div className="flex items-center gap-3 text-red-800">
                            <div className="p-2 bg-white rounded-full shadow-sm"><AlertTriangle size={18} className="text-red-600"/></div>
                            <div>
                                <h3 className="font-bold text-lg">Cảnh báo tồn kho</h3>
                                <p className="text-xs text-red-600/80 font-medium mt-0.5">Cần nhập hàng gấp</p>
                            </div>
                        </div>
                        
                        {/* Nút chuyển hướng sang trang Sản phẩm */}
                        <button 
                            onClick={() => setActiveTab('products')}
                            className="px-3 py-1.5 bg-white text-red-600 text-xs font-bold rounded-lg border border-red-200 shadow-sm hover:bg-red-600 hover:text-white transition cursor-pointer flex items-center gap-1"
                        >
                            Quản lý kho <ChevronRight size={14}/>
                        </button>
                    </div>

                    <div className="p-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                        {data.lowStock.map(b => (
                            <div key={b._id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-red-100/50 shadow-sm hover:shadow-md transition group cursor-pointer">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                        <img 
                                          src={getImageUrl(b.image || b.coverUrl)} 
                                          className="w-full h-full object-cover" 
                                          alt=""
                                          onError={(e) => e.target.src = 'https://placehold.co/40x40?text=No+Img'}
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-gray-800 truncate group-hover:text-red-600 transition">{b.title}</span>
                                </div>
                                <span className="text-[10px] font-black bg-red-100 text-red-600 px-2.5 py-1 rounded-full shadow-sm shrink-0">
                                    Còn {b.stock}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
              )}
          </div>
      </div>
    </div>
  );
}

const HeroCard = ({ title, value, icon: Icon, color, trend, sub }) => {
    const styles = {
        emerald: { text: 'text-emerald-600', bg: 'bg-emerald-100', sub: 'text-emerald-700' },
        blue:    { text: 'text-blue-600', bg: 'bg-blue-100', sub: 'text-blue-700' },
        purple:  { text: 'text-purple-600', bg: 'bg-purple-100', sub: 'text-purple-700' },
        orange:  { text: 'text-orange-600', bg: 'bg-orange-100', sub: 'text-orange-700' }
    }[color];

    return (
        <div className="bg-white p-7 rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
            {/* Decor Circle */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${styles.bg} opacity-50 group-hover:scale-150 transition-transform duration-500`}></div>
            
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
                    <h3 className={`text-4xl font-black ${styles.text} tracking-tight`}>{value}</h3>
                    
                    <div className="flex items-center gap-2 mt-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${styles.bg} ${styles.sub}`}>
                            {trend.includes('+') ? <ArrowUpRight size={10}/> : <CheckCircle size={10}/>} {trend}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">{sub}</span>
                    </div>
                </div>
                <div className={`p-4 rounded-2xl ${styles.bg} ${styles.text} shadow-sm group-hover:rotate-12 transition-transform`}>
                    <Icon size={28} strokeWidth={2.5}/>
                </div>
            </div>
        </div>
    );
};