import React, { useState, useEffect, useMemo} from 'react';
import { 
    Truck, MapPin, Phone, Package, RefreshCw, X, RotateCcw, 
    ArchiveRestore, Check, AlertCircle, Calendar, User, Wallet, ChevronLeft, ChevronRight, ShoppingBag, Search
} from 'lucide-react';
import ImageUploader from './ImageUploader';
import { useUI } from '@/store/useUI';
import * as shipperService from '@/services/shipper';
import api from '@/services/api';

const normalizeStr = (str) => String(str || '').toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const FAIL_REASONS = [
    "Khách không nghe máy", "Sai địa chỉ / Không tìm thấy", 
    "Khách hẹn giao lại sau", "Khách từ chối nhận hàng (Boom)"
];

const ITEMS_PER_PAGE = 5;

export default function ShipperTab() {
  const { showToast } = useUI();
  const [activeTab, setActiveTab] = useState('pool');
  const [deliveryTasks, setDeliveryTasks] = useState([]);
  const [rmaTasks, setRmaTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  
  const [modal, setModal] = useState(null); 
  const [failReason, setFailReason] = useState(FAIL_REASONS[0]);
  const [proofImage, setProofImage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pool, setPool] = useState({ delivery: [], rma: [] });
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [resDel, resRMA, resPool] = await Promise.all([
        shipperService.getTasks(), 
        shipperService.getRMATasks(),
        api.get('/shipper/pool')
      ]);
      setDeliveryTasks(resDel || []);
      setRmaTasks(resRMA || []);
      setPool(resPool || { delivery: [], rma: [] });
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const handleClaim = async (id, type) => {
      try {
          await api.post('/shipper/claim', { id, type });
          showToast({ type: 'success', title: 'Nhận đơn thành công! Đi lấy hàng ngay nào.' });
          loadData(); // Reload để mất đơn trong chợ, hiện đơn trong tab Giao hàng
      } catch (e) {
          showToast({ type: 'error', title: 'Thất bại', message: e.response?.data?.message || e.message });
          loadData(); // Reload vì có thể đơn đã bị người khác lấy
      }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setPage(1); }, [activeTab]);



  const replyTask = async (id, action) => {
    try {
        await api.post(`/shipper/tasks/${id}/reply`, { action }); // Gọi API replyAssignment
        showToast({ type: 'success', title: action === 'accept' ? 'Đã nhận đơn' : 'Đã từ chối' });
        loadData(); // Tải lại danh sách
    } catch (e) { alert(e.message); }
  };
  const deliveryList = useMemo(() => 
    deliveryTasks.filter(t => ['assigned', 'ready_to_pick', 'shipping', 'delivery_failed', 'returned'].includes(t.status)), [deliveryTasks]);
  const rmaList = useMemo(() => 
    rmaTasks.filter(t => ['assigned', 'approved', 'picking', 'picked'].includes(t.status)), 
    [rmaTasks]);
  const historyList = useMemo(() => {
      // Đơn GIAO đã xong
      const doneDel = deliveryTasks.filter(t => ['delivered', 'completed', 'cancelled', 'refunded'].includes(t.status));
      
      const doneRMA = rmaTasks.filter(t => ['returned_to_warehouse', 'processed', 'refunded'].includes(t.status));
      
      const fmtRMA = doneRMA.map(r => ({ 
          ...r, 
          isRMA: true, 
          // Fallback mã code nếu r.orderId null
          code: r.orderId?.code || r._id, 
          status: r.status === 'returned_to_warehouse' ? 'Đã trả kho' : r.status 
      }));

      // Gộp và sắp xếp
      return [...doneDel, ...fmtRMA].sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [deliveryTasks, rmaTasks]);

    const poolList = useMemo(() => {
      // Map đơn delivery
      const dels = pool.delivery.map(d => ({ 
          ...d, 
          isPool: true, 
          type: 'delivery',
          // 🔥 Ưu tiên lấy createdAt nếu không có updatedAt (để tránh Invalid Date)
          timeDisplay: d.createdAt || d.updatedAt 
      }));
      
      // Map đơn RMA
      const rmas = pool.rma.map(r => ({ 
          ...r, 
          isPool: true, 
          type: 'rma', 
          isRMA: true,
          timeDisplay: r.createdAt || r.updatedAt
      }));

      // Gộp và SẮP XẾP: Mới nhất lên đầu (descending)
      return [...dels, ...rmas].sort((a, b) => new Date(b.timeDisplay) - new Date(a.timeDisplay));
    }, [pool]);

    const baseList = activeTab === 'pool' ? poolList
            : activeTab === 'delivery' ? deliveryList 
            : activeTab === 'rma' ? rmaList 
            : historyList;

    // LOGIC TÌM KIẾM
    const currentList = useMemo(() => {
        if (!searchTerm.trim()) return baseList;
        
        // Chuẩn hóa từ khóa người dùng nhập (bỏ dấu, chữ thường)
        const term = normalizeStr(searchTerm);
        
        return baseList.filter(item => {
            // 1. Lấy dữ liệu thô từ đơn hàng
            const code = item.code || item.orderId?.code || item._id;
            
            let name = '', phone = '', address = '';

            // Logic lấy thông tin giống hệt hiển thị trên Card
            if (item.isRMA || item.type === 'rma') {
                const user = item.userId;
                const orderShip = item.orderId?.shippingAddress;
                const pickup = item.pickupAddress;

                name = user?.name || orderShip?.receiver || '';
                phone = user?.phone || orderShip?.phone || '';
                
                // Gộp tất cả thông tin địa chỉ lại để tìm
                const addrObj = pickup || orderShip;
                if (addrObj) address = `${addrObj.detail} ${addrObj.ward} ${addrObj.district} ${addrObj.province}`;
                else if (user?.address) address = user.address;

            } else {
                const sa = item.shippingAddress;
                name = sa?.receiver || '';
                phone = sa?.phone || '';
                if (sa) address = `${sa.detail} ${sa.ward} ${sa.district} ${sa.province}`;
            }

            // 2. So sánh chuỗi đã chuẩn hóa
            // Cho phép tìm theo: Mã đơn, Tên, SĐT, hoặc Địa chỉ (Quận, Phường...)
            return normalizeStr(code).includes(term) || 
                   normalizeStr(name).includes(term) || 
                   normalizeStr(phone).includes(term) ||
                   normalizeStr(address).includes(term); 
        });
    }, [baseList, searchTerm]);
  
    const totalPages = Math.ceil(currentList.length / ITEMS_PER_PAGE);
    const paginatedList = currentList.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const replyRMA = async (id, action) => {
        try {
            await api.post(`/shipper/rma-tasks/${id}/reply`, { action });
            showToast({ type: 'success', title: action === 'accept' ? 'Đã nhận đơn trả' : 'Đã từ chối' });
            loadData();
        } catch (e) { alert(e.message); }
    };

  const confirmAction = async () => {
      if (!modal) return;
      const { type, id } = modal;
      setSubmitting(true);
      try {
          if (type === 'pickup') await shipperService.pickupOrder(id);
          else if (type === 'success') {
              if (!proofImage) throw new Error("Cần chụp ảnh bằng chứng giao hàng");
              await shipperService.completeOrder(id, { proofImage });
          } 
          else if (type === 'fail') await shipperService.failOrder(id, { reason: failReason });
          else if (type === 'retry') await shipperService.retryOrder(id);
          else if (type === 'return_warehouse') await shipperService.returnWarehouse(id);
          
          else if (type === 'pickup_rma') await shipperService.pickupRMA(id);
          else if (type === 'dropoff_rma') await shipperService.dropoffRMA(id);

          showToast({ type: 'success', title: 'Thao tác thành công!' });
          setModal(null); setProofImage(''); loadData();
      } catch (e) { showToast({ type: 'error', title: 'Lỗi', message: e.message }); } 
      finally { setSubmitting(false); }
  };

  

  const Card = ({ item, isRMA }) => {
    const isPool = item.isPool;
    let name, phone, address;
      
      if (isRMA) {
          // RMA: Ưu tiên lấy từ pickupAddress lưu trong RMA
          // Nếu không có, lấy từ ShippingAddress của đơn gốc
          // Cuối cùng mới lấy từ User Profile
          const orderShip = item.orderId?.shippingAddress;
          const user = item.userId;
          
          name = user?.name || orderShip?.receiver || 'Khách hàng';
          phone = user?.phone || orderShip?.phone || '';
          
          if (item.pickupAddress) {
              address = `${item.pickupAddress.detail}, ${item.pickupAddress.ward}, ${item.pickupAddress.district}`;
          } else if (orderShip) {
              address = `${orderShip.detail}, ${orderShip.ward}, ${orderShip.district}`;
          } else {
              address = user?.address || 'Vui lòng liên hệ khách để hỏi địa chỉ';
          }
      } else {
          // DELIVERY
          const sa = item.shippingAddress;
          name = sa?.receiver;
          phone = sa?.phone;
          address = sa ? `${sa.detail}, ${sa.ward}, ${sa.district}` : 'Chưa cập nhật địa chỉ';
      }

    const isCod = !isRMA && item.payment?.method === 'cod' && item.payment?.status === 'unpaid';
    const total = isCod ? (item.total?.grand || 0) : 0;
    const code = isRMA ? item.orderId?.code : (item.code || item._id);
    const province = isRMA
        ? item.pickupAddress?.province || item.orderId?.shippingAddress?.province
        : item.shippingAddress?.province;
      
      const district = isRMA 
        ? item.pickupAddress?.district || item.orderId?.shippingAddress?.district 
        : item.shippingAddress?.district;


      return (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4 relative overflow-hidden group">
              {/* Thanh màu bên trái */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isRMA ? 'bg-orange-500' : 'bg-indigo-600'}`}></div>
              
              {/* Header */}
              <div className="flex justify-between items-start mb-4 pl-3">
                  <div>
                      <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded text-white ${isRMA ? 'bg-orange-500' : 'bg-indigo-600'}`}>
                              {isRMA ? 'THU HỒI' : 'GIAO'}
                          </span>
                          <span className="font-black text-gray-800 text-lg tracking-tight">#{String(code).slice(-6)}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-1 font-medium">
                          <Calendar size={12}/> {new Date(item.timeDisplay || item.createdAt || item.updatedAt).toLocaleString('vi-VN')}
                      </div>
                  </div>
                  <div className="flex flex-col items-end">
                      <span className={`text-base font-black ${isCod ? 'text-red-600' : 'text-gray-400'}`}>
                          {isCod ? new Intl.NumberFormat('vi-VN').format(total) + 'đ' : '0đ'}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{isCod ? 'THU HỘ' : 'ĐÃ TT'}</span>
                  </div>
              </div>

                {item.isUrgent && item.isPool && (
                    <div className="mx-3 mb-3 bg-red-100 border border-red-200 p-2 rounded-lg flex items-center justify-center gap-2 animate-pulse">
                        <AlertCircle size={16} className="text-red-600"/>
                        <span className="text-xs font-black text-red-700 uppercase">Đơn gấp - Cần giao ngay!</span>
                    </div>
                )}

              <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl mb-3 flex items-center gap-3">
                  <div className="p-2 bg-white rounded-full text-blue-600 shadow-sm"><MapPin size={20}/></div>
                  <div>
                      <p className="text-xs text-blue-500 font-bold uppercase">Khu vực giao:</p>
                      <p className="text-base font-black text-blue-900 leading-tight">
                          {district}, {province}
                      </p>
                  </div>
              </div>

              {/* Info Box */}
              <div className="bg-gray-50 rounded-xl p-3 ml-3 border border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-gray-500">
                          <User size={16}/>
                      </div>
                      <div>
                          <p className="font-bold text-gray-900 text-sm leading-none">{name}</p>
                          <a href={`tel:${phone}`} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 mt-1">
                              <Phone size={12}/> {phone}
                          </a>
                      </div>
                  </div>
                  <div className="flex gap-2 items-start border-t border-gray-200 pt-2">
                      <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5"/>
                      <p className="text-sm text-gray-600 font-medium leading-snug">{address}</p>
                  </div>
                {/* 1. NẾU LÀ ĐƠN GIAO HÀNG (!isRMA) -> Hiện "Chi tiết đơn hàng" */}
                {!isRMA && item.items && item.items.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-200">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                            <Package size={10}/> Chi tiết đơn hàng:
                        </p>
                        {item.items.map((prod, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-gray-700 mb-1">
                                <span className="truncate w-3/4 font-medium">
                                    {prod.title || prod.bookId?.title || 'Sản phẩm'}
                                </span>
                                <span className="font-bold">x{prod.qty}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* 2. NẾU LÀ ĐƠN THU HỒI (isRMA) -> Chỉ hiện "Sản phẩm thu hồi" */}
                {isRMA && item.items && (
                    <div className="mt-3 pt-2 border-t border-gray-200">
                        <p className="text-[10px] font-bold text-orange-600 uppercase mb-1 flex items-center gap-1">
                            <RotateCcw size={10}/> Sản phẩm thu hồi:
                        </p>
                        {item.items.map((prod, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-gray-700 mb-1">
                                <span className="truncate w-4/5 font-medium">{prod.title}</span>
                                <span className="font-bold text-orange-600">x{prod.qty}</span>
                            </div>
                        ))}
                    </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 pl-3 grid grid-cols-2 gap-2">
                    {isPool && (
                        <button 
                            onClick={() => handleClaim(item._id, item.type || (isRMA ? 'rma' : 'delivery'))}
                            className={`col-span-2 py-3 text-white font-bold rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition flex items-center justify-center gap-2 ${
                                isRMA 
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 shadow-orange-200' // Màu Cam cho Thu hồi
                                : 'bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-200' // Màu Xanh cho Giao hàng
                            }`}
                        >
                            {isRMA ? <RotateCcw size={18}/> : <ShoppingBag size={18}/>} 
                            {isRMA ? 'NHẬN ĐƠN HOÀN TRẢ' : 'NHẬN ĐƠN GIAO HÀNG'}
                        </button>
                    )}
                    {!isRMA && item.status === 'assigned' && (
                        <>
                            <Btn onClick={() => replyTask(item._id, 'accept')} text="Nhận đơn" color="indigo" icon={Check}/>
                            <Btn onClick={() => replyTask(item._id, 'reject')} text="Từ chối" color="white" icon={X}/>
                        </>
                    )}
                    {!isRMA && item.status === 'ready_to_pick' && <Btn onClick={()=>setModal({type:'pickup', id:item._id})} text="Lấy hàng" color="indigo" icon={Package}/>}
                    {!isRMA && item.status === 'shipping' && (
                      <>
                        <Btn onClick={()=>setModal({type:'fail', id:item._id})} text="Thất bại" color="white"/>
                        <Btn onClick={()=>setModal({type:'success', id:item._id})} text="Giao xong" color="green" icon={Check}/>
                      </>
                    )}
                    {!isRMA && item.status === 'delivery_failed' && <Btn onClick={()=>setModal({type:'retry', id:item._id})} text="Giao lại" color="orange" icon={RotateCcw}/>}
                    {!isRMA && item.status === 'returned' && <Btn onClick={()=>setModal({type:'return_warehouse', id:item._id})} text="Trả kho" color="red" icon={ArchiveRestore}/>}
                    {isRMA && item.status === 'assigned' && (
                        <>
                            <Btn onClick={() => replyRMA(item._id, 'accept')} text="Nhận đơn trả" color="indigo" icon={Check}/>
                            <Btn onClick={() => replyRMA(item._id, 'reject')} text="Từ chối" color="white" icon={X}/>
                        </>
                    )}
                    {isRMA && item.status === 'picking' && <Btn onClick={()=>setModal({type:'pickup_rma', id:item._id})} text="Đã lấy hàng" color="orange" icon={Package}/>}
                    {isRMA && item.status === 'picked' && <Btn onClick={()=>setModal({type:'dropoff_rma', id:item._id})} text="Trả kho" color="red" icon={ArchiveRestore}/>}
                </div>
          </div>
      );
  };

  const Btn = ({ onClick, text, color, icon: Icon }) => {
      const cls = {
          indigo: 'bg-indigo-600 text-white shadow-indigo-200',
          green: 'bg-emerald-600 text-white shadow-emerald-200',
          orange: 'bg-orange-500 text-white shadow-orange-200',
          red: 'bg-red-600 text-white shadow-red-200',
          white: 'bg-white border border-gray-300 text-gray-600'
      }[color];
      return (
          <button onClick={onClick} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold shadow-md active:scale-95 transition ${cls}`}>
              {Icon && <Icon size={14}/>} {text}
          </button>
      );
  };

    return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* --- KHỐI HEADER CỐ ĐỊNH (Gồm Title + Search + Tabs) --- */}
      <div className="bg-white shadow-sm z-20 shrink-0">
          
          {/* 1. Header Title */}
          <div className="px-4 pt-3 pb-2 flex justify-between items-center">
              <div className="font-extrabold text-gray-800 flex items-center gap-2 text-xl tracking-tight">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-indigo-200 shadow-md">
                      <Truck size={20} strokeWidth={2.5}/>
                  </div>
                  Shipper Hub
              </div>
              <button onClick={loadData} className={`p-2.5 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 hover:text-indigo-600 transition active:scale-95 ${loading?'animate-spin':''}`}>
                  <RefreshCw size={18}/>
              </button>
          </div>

          {/* 2. Thanh Tìm Kiếm (Đẹp & Hiện đại) */}
          <div className="px-4 py-2">
              <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                      <Search size={18}/>
                  </div>
                  <input 
                      className="w-full pl-10 pr-9 py-2.5 bg-gray-100 border-transparent border-2 rounded-xl text-sm font-medium text-gray-700 placeholder-gray-400 outline-none focus:bg-white focus:border-indigo-600 focus:shadow-sm transition-all"
                      placeholder="Tìm mã đơn, tên khách, SĐT..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                      <button 
                          onClick={() => setSearchTerm('')} 
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 bg-gray-200 rounded-full hover:bg-gray-300 transition"
                      >
                          <X size={12}/>
                      </button>
                  )}
              </div>
          </div>

          {/* 3. Tabs Navigation (Dạng trượt ngang) */}
          <div className="px-2 flex gap-1 overflow-x-auto no-scrollbar pb-0 mt-1 border-b border-gray-100">
            <button onClick={() => setActiveTab('pool')} 
                  className={`flex-1 min-w-[100px] py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                      activeTab==='pool' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                  Săn đơn <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab==='pool' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{poolList.length}</span>
            </button>
              {[
                  { id: 'delivery', label: 'Giao hàng', count: deliveryList.length }, 
                  { id: 'rma', label: 'Thu hồi', count: rmaList.length },
                  { id: 'history', label: 'Lịch sử', count: historyList.length }
              ].map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)} 
                      className={`flex-1 min-w-[90px] py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                          activeTab === t.id 
                          ? 'border-indigo-600 text-indigo-700' 
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                  >
                      {t.label} <span className="text-xs opacity-70 ml-0.5">({t.count})</span>
                  </button>
              ))}
          </div>
      </div>

      {/* --- DANH SÁCH CUỘN --- */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/50">
        {paginatedList.length > 0 ? (
            paginatedList.map(item => (
                <Card 
                    key={item._id} 
                    item={item} 
                    isRMA={item.isRMA || activeTab === 'rma'} 
                />
            ))
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 pb-20 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <Search size={40} className="text-gray-300"/>
                </div>
                <p className="font-bold text-gray-500">Không tìm thấy đơn hàng</p>
                <p className="text-xs text-gray-400 mt-1">Thử tìm bằng từ khóa khác xem sao</p>
                {searchTerm && (
                    <button onClick={()=>setSearchTerm('')} className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 text-sm font-bold rounded-lg hover:bg-indigo-100 transition">
                        Xóa bộ lọc
                    </button>
                )}
            </div>
        )}
      </div>

      {/* --- PHÂN TRANG --- */}
      {totalPages > 1 && (
            <div className="p-3 bg-white border-t shrink-0 flex justify-center gap-4 items-center z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button 
                    disabled={page === 1} 
                    onClick={() => setPage(p => p - 1)} 
                    className="p-2.5 rounded-xl border bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                    <ChevronLeft size={20}/>
                </button>
                <span className="text-sm font-bold text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">
                    Trang {page} / {totalPages}
                </span>
                <button 
                    disabled={page === totalPages} 
                    onClick={() => setPage(p => p + 1)} 
                    className="p-2.5 rounded-xl border bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                    <ChevronRight size={20}/>
                </button>
            </div>
        )}

      {/* Modal Confirm (Giữ nguyên phần này) */}
      {modal && (
         <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm" onClick={()=>setModal(null)}>
            <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-6 animate-in slide-in-from-bottom-10" onClick={e=>e.stopPropagation()}>
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden"></div>
                <h3 className="font-bold text-xl text-gray-900 mb-2">Xác nhận hành động</h3>
                <p className="text-gray-500 text-sm mb-6">Bạn chắc chắn muốn thực hiện thao tác này?</p>
                
                {modal.type === 'success' && <div className="mb-6 border-2 border-dashed border-gray-300 rounded-xl p-4 text-center bg-gray-50"><ImageUploader value={proofImage} onChange={setProofImage}/></div>}
                
                {modal.type === 'fail' && (
                    <div className="mb-6">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Lý do thất bại</label>
                        <select className="input w-full p-3 rounded-xl border bg-gray-50 font-medium" value={failReason} onChange={e=>setFailReason(e.target.value)}>
                            {FAIL_REASONS.map(r=><option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                )}

                <div className="flex gap-3">
                    <button onClick={()=>setModal(null)} className="flex-1 py-3.5 bg-gray-100 rounded-xl font-bold text-gray-600">Hủy</button>
                    <button onClick={confirmAction} disabled={submitting} className={`flex-1 py-3.5 rounded-xl font-bold text-white shadow-xl ${modal.type.includes('fail')||modal.type.includes('dropoff')?'bg-red-600':'bg-indigo-600'}`}>
                        {submitting ? '...' : 'Xác nhận'}
                    </button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
}

const Empty = ({text}) => <div className="py-20 text-center text-gray-300"><Package size={48} className="mx-auto mb-3 opacity-30"/><p>{text}</p></div>;