import React, { useState, useEffect, useMemo } from 'react';
import api, { getImageUrl } from '@/services/api';
import { 
    ArrowUpRight, ArrowDownLeft, DollarSign, Wallet, 
    CreditCard, Search, TrendingUp, TrendingDown, Download, Calendar, 
    RefreshCw, ChevronLeft, ChevronRight, Filter, FileSpreadsheet, PieChart
} from 'lucide-react';
import { 
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const fmtMoney = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n || 0));
const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const TIME_RANGES = [
    { key: 'today', label: 'Hôm nay' },
    { key: 'week', label: 'Tuần này' },
    { key: 'month', label: 'Tháng này' },
    { key: 'year', label: 'Năm nay' },
    { key: 'all', label: 'Toàn bộ lịch sử' }
];

const ITEMS_PER_PAGE = 10;

export default function PaymentsTab() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter States
  const [timeRange, setTimeRange] = useState('month'); 
  const [customYear, setCustomYear] = useState(new Date().getFullYear()); // [MỚI] Chọn năm
  const [filterType, setFilterType] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  // Load Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/transactions');
        // Sort: Mới nhất lên đầu
        const list = (res.items || res || []).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        setTransactions(list);
      } catch (err) { setError(err.message); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  useEffect(() => { setPage(1); }, [timeRange, filterType, searchTerm, customYear]);

  // --- LOGIC LỌC THỜI GIAN NÂNG CAO ---
  const filteredByTime = useMemo(() => {
      const now = new Date();
      return transactions.filter(t => {
          const d = new Date(t.createdAt);
          
          if (timeRange === 'all') return true;
          if (timeRange === 'today') return d.toDateString() === now.toDateString();
          if (timeRange === 'week') {
              const startOfWeek = new Date(now);
              startOfWeek.setDate(now.getDate() - now.getDay()); // Chủ nhật đầu tuần
              startOfWeek.setHours(0,0,0,0);
              return d >= startOfWeek;
          }
          if (timeRange === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          if (timeRange === 'year') return d.getFullYear() === now.getFullYear();
          
          // [MỚI] Logic lọc theo Custom Year (Nếu cần mở rộng sau này)
          return true;
      });
  }, [transactions, timeRange]);

  // --- THỐNG KÊ KPI ---
  const stats = useMemo(() => {
      return filteredByTime.reduce((acc, t) => {
          const amt = Number(t.amount || 0);
          if (t.type === 'charge') acc.revenue += amt;
          if (t.type === 'refund') acc.refund += amt;
          return acc;
      }, { revenue: 0, refund: 0 });
  }, [filteredByTime]);

  // --- DỮ LIỆU BIỂU ĐỒ THÔNG MINH (Auto Grouping) ---
  const chartData = useMemo(() => {
      // Đảo ngược để cũ nhất lên đầu
      const sorted = [...filteredByTime].sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
      const group = {};

      // Nếu xem "Toàn bộ" hoặc "Năm nay" -> Group theo THÁNG
      // Nếu xem "Tháng này" hoặc "Tuần này" -> Group theo NGÀY
      const isLongTerm = timeRange === 'all' || timeRange === 'year';

      sorted.forEach(t => {
          const d = new Date(t.createdAt);
          // Key nhóm: Tháng (MM/YYYY) hoặc Ngày (DD/MM)
          const key = isLongTerm 
              ? `${d.getMonth()+1}/${d.getFullYear()}` 
              : `${d.getDate()}/${d.getMonth()+1}`;
          
          if (!group[key]) group[key] = { name: key, thu: 0, chi: 0, rawDate: d };
          
          const amt = Number(t.amount || 0);
          if (t.type === 'charge') group[key].thu += amt;
          if (t.type === 'refund') group[key].chi += amt;
      });

      return Object.values(group);
  }, [filteredByTime, timeRange]);

  // --- DỮ LIỆU BẢNG (Search + Pagination) ---
  const tableData = useMemo(() => {
      let data = filteredByTime;
      if (filterType !== 'all') data = data.filter(t => t.type === filterType);
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          data = data.filter(t => 
              (t.orderId?.code || '').toLowerCase().includes(lower) ||
              (t.userId?.name || '').toLowerCase().includes(lower) ||
              (t.userId?.email || '').toLowerCase().includes(lower)
          );
      }
      return data;
  }, [filteredByTime, filterType, searchTerm]);

  const totalPages = Math.ceil(tableData.length / ITEMS_PER_PAGE);
  const paginatedData = tableData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // --- EXPORT EXCEL ---
  const handleExport = () => {
      const exportData = tableData.map(t => ({
          'Mã GD': t._id,
          'Mã Đơn': t.orderId?.code || 'N/A',
          'Loại': t.type === 'charge' ? 'Thu' : 'Chi',
          'Số tiền': t.amount,
          'Khách hàng': t.userId?.name || 'Khách lẻ',
          'Email': t.userId?.email || '',
          'Ngày tạo': new Date(t.createdAt).toLocaleString('vi-VN'),
          'Ghi chú': t.reason
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Finance");
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'});
      saveAs(data, `FinanceReport_${timeRange}_${Date.now()}.xlsx`);
  };

  // --- SUB-COMPONENT: STAT CARD ---
  const StatCard = ({ title, value, sub, icon: Icon, color, bg }) => (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-all hover:-translate-y-1">
          <div>
              <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">{title}</p>
              <h3 className={`text-2xl font-black ${color} tracking-tight`}>{value}</h3>
              <p className="text-[11px] text-gray-400 mt-2 font-medium bg-gray-50 inline-block px-2 py-0.5 rounded">{sub}</p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bg} ${color} shadow-sm`}>
              <Icon size={24}/>
          </div>
      </div>
  );

  if (loading) return <div className="p-20 text-center text-gray-400 flex flex-col items-center"><RefreshCw className="animate-spin mb-2"/> Đang tải dữ liệu...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">Lỗi: {error}</div>;

  return (
    <div className="space-y-8 pb-20 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
              <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200"><Wallet size={24}/></div>
                  Tài chính & Dòng tiền
              </h2>
              <p className="text-sm text-gray-500 mt-2 font-medium ml-1">Quản lý thu chi và lợi nhuận.</p>
          </div>
          
          <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-xl w-fit">
              {TIME_RANGES.map(r => (
                  <button key={r.key} onClick={()=>setTimeRange(r.key)} 
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${timeRange===r.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      {r.label}
                  </button>
              ))}
          </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Tổng Doanh Thu" value={fmtMoney(stats.revenue)} sub="Tổng tiền thu vào" icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-50"/>
          <StatCard title="Tổng Hoàn Tiền" value={fmtMoney(stats.refund)} sub="Tổng tiền chi ra (RMA)" icon={TrendingDown} color="text-rose-600" bg="bg-rose-50"/>
          <StatCard title="Lợi Nhuận Ròng" value={fmtMoney(stats.revenue - stats.refund)} sub="Doanh thu - Hoàn tiền" icon={DollarSign} color="text-blue-600" bg="bg-blue-50"/>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-[380px] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><Calendar size={18} className="text-gray-400"/> Biểu đồ dòng tiền</h3>
                  <div className="flex gap-4 text-xs font-bold">
                      <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Thu</span>
                      <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div> Chi</span>
                  </div>
              </div>
              
              <div className="flex-1 w-full">
                  {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorThu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                            <linearGradient id="colorChi" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#9ca3af'}} dy={10} interval="preserveStartEnd"/>
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#9ca3af'}} tickFormatter={(val)=> val >= 1000000 ? `${val/1000000}M` : `${val/1000}k`}/>
                          <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px -5px rgb(0 0 0 / 0.1)'}} formatter={(value) => fmtMoney(value)}/>
                          <Area type="monotone" dataKey="thu" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorThu)" activeDot={{r: 6}} />
                          <Area type="monotone" dataKey="chi" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorChi)" activeDot={{r: 6}} />
                        </AreaChart>
                      </ResponsiveContainer>
                  ) : (
                      <div className="h-full flex items-center justify-center text-gray-300 text-sm">Chưa có dữ liệu biểu đồ</div>
                  )}
              </div>
          </div>

          {/* Quick Stats & Export */}
          <div className="bg-indigo-900 p-8 rounded-3xl shadow-xl text-white flex flex-col justify-between relative overflow-hidden h-[380px]">
              <div className="absolute top-0 right-0 p-8 opacity-10"><PieChart size={150}/></div>
              
              <div>
                  <p className="text-indigo-200 text-xs font-bold uppercase mb-2 tracking-widest">Hiệu suất tài chính</p>
                  <h3 className="text-4xl font-black tracking-tight">{fmtMoney(stats.revenue - stats.refund)}</h3>
                  <p className="text-indigo-300 text-sm mt-1">Số dư ròng khả dụng</p>
              </div>

              <div className="space-y-6 relative z-10">
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                    <div className="flex justify-between text-sm mb-2 font-medium">
                        {/* SỬA TẠI ĐÂY: Đổi "Tỷ lệ thu hồi" thành tên hợp lý hơn */}
                        <span className="text-indigo-200">Hiệu suất dòng tiền</span> 
                        
                        {/* Công thức giữ nguyên là đúng */}
                        <span>{stats.revenue > 0 ? Math.round(((stats.revenue - stats.refund) / stats.revenue) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-indigo-950 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full transition-all duration-1000" style={{width: `${stats.revenue > 0 ? ((stats.revenue - stats.refund) / stats.revenue) * 100 : 0}%`}}></div>
                    </div>
                </div>
                  
                  <button onClick={handleExport} className="w-full py-3.5 bg-white text-indigo-900 rounded-xl font-bold text-sm hover:bg-indigo-50 transition shadow-lg flex items-center justify-center gap-2 active:scale-95">
                      <FileSpreadsheet size={18}/> Xuất Báo Cáo Excel
                  </button>
              </div>
          </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2"><Search size={18} className="text-indigo-600"/> Chi tiết giao dịch</h3>
              <div className="flex gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                      <input className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition"
                          placeholder="Tìm mã, khách hàng..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                  </div>
                  <div className="relative">
                      <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                      <select className="pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 outline-none cursor-pointer hover:bg-gray-100 appearance-none"
                          value={filterType} onChange={e => setFilterType(e.target.value)}>
                          <option value="all">Tất cả loại</option>
                          <option value="charge">Thu tiền (+)</option>
                          <option value="refund">Hoàn tiền (-)</option>
                      </select>
                  </div>
              </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
                <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Mã GD</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Loại</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Số tiền</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Thời gian</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ghi chú</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
                {paginatedData.length === 0 ? (
                    <tr><td colSpan={6} className="p-16 text-center text-gray-400 font-medium">Không có dữ liệu phù hợp.</td></tr>
                ) : paginatedData.map((t) => {
                    const isCharge = t.type === 'charge';
                    return (
                        <tr key={t._id} className="hover:bg-indigo-50/30 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-bold text-gray-900 text-sm font-mono">{t._id.slice(-8).toUpperCase()}</span>
                                <div className="text-[10px] text-gray-400 mt-0.5 font-medium">Order: <span className="text-indigo-600">#{t.orderId?.code || String(t.orderId).slice(-6)}</span></div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                                    isCharge ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                                }`}>
                                    {isCharge ? <ArrowUpRight size={12}/> : <ArrowDownLeft size={12}/>}
                                    {isCharge ? 'Thu tiền' : 'Hoàn tiền'}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`text-sm font-bold ${isCharge ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isCharge ? '+' : '-'}{fmtMoney(t.amount)}
                                </span>
                            </td>
                            {/* CỘT KHÁCH HÀNG (ĐÃ FIX AVATAR) */}
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-200 overflow-hidden shrink-0">
                                        {t.userId?.avatarUrl || t.userId?.avatar ? (
                                            <img src={getImageUrl(t.userId.avatarUrl || t.userId.avatar)} className="w-full h-full object-cover"/>
                                        ) : (
                                            <span>{t.userId?.name?.[0]?.toUpperCase() || 'U'}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{t.userId?.name || 'Khách lẻ'}</div>
                                        <div className="text-xs text-gray-500">{t.userId?.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                                {fmtDate(t.createdAt)} <span className="text-xs text-gray-400 ml-1">{new Date(t.createdAt).toLocaleTimeString('vi-VN')}</span>
                            </td>
                            <td className="px-6 py-4 text-right text-xs text-gray-500 italic max-w-[200px] truncate" title={t.reason}>
                                {t.reason || (isCharge ? 'Thanh toán đơn hàng' : 'Hoàn trả RMA')}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
              <div className="p-4 border-t bg-gray-50/50 flex justify-center gap-2">
                  <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="p-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"><ChevronLeft size={16}/></button>
                  <span className="px-4 py-2 text-sm font-bold text-gray-600 bg-white rounded-lg border">Trang {page} / {totalPages}</span>
                  <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="p-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"><ChevronRight size={16}/></button>
              </div>
          )}
      </div>
    </div>
  );
}