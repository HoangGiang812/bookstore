import React, { useState, useEffect, useMemo} from 'react';
import { 
    Truck, MapPin, Phone, Package, RefreshCw, X, RotateCcw, 
    ArchiveRestore, Check, AlertCircle, Calendar, User, Wallet, ChevronLeft, ChevronRight, ShoppingBag
} from 'lucide-react';
import ImageUploader from './ImageUploader';
import { useUI } from '@/store/useUI';
import * as shipperService from '@/services/shipper';
import api from '@/services/api';

const FAIL_REASONS = [
    "Khách không nghe máy", "Sai địa chỉ / Không tìm thấy", 
    "Khách hẹn giao lại sau", "Khách từ chối nhận hàng (Boom)"
];

const ITEMS_PER_PAGE = 5;

export default function ShipperTab() {
  const { showToast } = useUI();
  const [activeTab, setActiveTab] = useState('delivery'); 
  const [deliveryTasks, setDeliveryTasks] = useState([]);
  const [rmaTasks, setRmaTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  
  const [modal, setModal] = useState(null); 
  const [failReason, setFailReason] = useState(FAIL_REASONS[0]);
  const [proofImage, setProofImage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resDel, resRMA] = await Promise.all([
        shipperService.getTasks(), 
        shipperService.getRMATasks()
      ]);
      setDeliveryTasks(resDel || []);
      setRmaTasks(resRMA || []);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
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

    const currentList = activeTab === 'delivery' ? deliveryList 
                    : activeTab === 'rma' ? rmaList 
                    : historyList;
  
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
      // LOGIC THÔNG MINH ĐỂ LẤY ĐỊA CHỈ & THÔNG TIN
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
                          <Calendar size={12}/> {new Date(item.updatedAt).toLocaleString('vi-VN')}
                      </div>
                  </div>
                  <div className="flex flex-col items-end">
                      <span className={`text-base font-black ${isCod ? 'text-red-600' : 'text-gray-400'}`}>
                          {isCod ? new Intl.NumberFormat('vi-VN').format(total) + 'đ' : '0đ'}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{isCod ? 'THU HỘ' : 'ĐÃ TT'}</span>
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
      <div className="bg-white px-4 py-3 border-b flex justify-between items-center z-10 shadow-sm shrink-0">
          <div className="font-bold text-gray-800 flex items-center gap-2 text-lg"><Truck className="text-indigo-600"/> Shipper Hub</div>
          <button onClick={loadData} className={`p-2 bg-gray-100 rounded-full hover:bg-gray-200 ${loading?'animate-spin':''}`}><RefreshCw size={20}/></button>
      </div>
      
      <div className="p-2 bg-white border-b flex gap-2 shrink-0">
          {[
              { id: 'delivery', label: 'Giao hàng', count: deliveryList.length }, 
              { id: 'rma', label: 'Thu hồi', count: rmaList.length },
              { id: 'history', label: 'Lịch sử', count: historyList.length } // ✅ Đã có count cho lịch sử
          ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} 
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                      activeTab === t.id 
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
              >
                  {t.label} <span className="text-xs opacity-70 ml-1">({t.count})</span>
              </button>
          ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {paginatedList.length > 0 ? (
            paginatedList.map(item => (
                <Card 
                    key={item._id} 
                    item={item} 
                    isRMA={activeTab === 'rma' || (activeTab === 'history' && item.isRMA)} 
                />
            ))
        ) : (
            <Empty text="Không có đơn hàng nào."/>
        )}
      </div>

        {totalPages > 1 && (
            <div className="p-3 bg-white border-t shrink-0 flex justify-center gap-4 items-center z-10">
                <button 
                    disabled={page === 1} 
                    onClick={() => setPage(p => p - 1)} 
                    className="p-2 rounded-lg border bg-gray-50 hover:bg-gray-100 disabled:opacity-30 transition"
                >
                    <ChevronLeft size={20}/>
                </button>
                <span className="text-sm font-bold text-gray-600">
                    Trang {page} / {totalPages}
                </span>
                <button 
                    disabled={page === totalPages} 
                    onClick={() => setPage(p => p + 1)} 
                    className="p-2 rounded-lg border bg-gray-50 hover:bg-gray-100 disabled:opacity-30 transition"
                >
                    <ChevronRight size={20}/>
                </button>
            </div>
        )}

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