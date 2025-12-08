import React, { useEffect, useState, useMemo } from 'react';
import * as rmaService from '@/services/rma.js'; 
import { listShippers } from '@/services/admin';
import { 
    Search, RefreshCw, CheckCircle, XCircle, Eye, X, Package, 
    AlertTriangle, Truck, CreditCard, Filter, ChevronLeft, ChevronRight, User, Clock, ExternalLink
} from 'lucide-react';
import { api, getImageUrl } from '@/services/api';
import ImageUploader from '@/view/pages/admin/ImageUploader';

// --- CẤU HÌNH TRẠNG THÁI ---
const STATUS_CONFIG = {
  requested: { label: 'Mới yêu cầu', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: AlertTriangle },
  approved: { label: 'Đã duyệt', color: 'text-indigo-700 bg-indigo-50 border-indigo-200', icon: CheckCircle },
  assigned: { label: 'Chờ Shipper nhận', color: 'text-sky-700 bg-sky-50 border-sky-200', icon: User },
  picking: { label: 'Đang lấy hàng', color: 'text-orange-700 bg-orange-50 border-orange-200', icon: Truck },
  picked: { label: 'Đang giữ hàng', color: 'text-purple-700 bg-purple-50 border-purple-200', icon: Package },
  returned_to_warehouse: { label: 'Đã về kho', color: 'text-pink-700 bg-pink-50 border-pink-200', icon: RefreshCw },
  processed: { label: 'Hoàn tất', color: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle },
  rejected: { label: 'Đã từ chối', color: 'text-red-700 bg-red-50 border-red-200', icon: XCircle },
  cancelled: { label: 'Khách hủy', color: 'text-gray-600 bg-gray-100 border-gray-200', icon: X },
  refunded: { label: 'Đã hoàn tiền', color: 'text-green-800 bg-green-100 border-green-300', icon: CreditCard }
};

const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';

// Helper Format Mã Đơn (Đồng bộ với các trang khác)
const formatCode = (code, id) => {
    if (code) return `#${String(code).slice(-6)}`; // Lấy 6 ký tự cuối của mã code
    return `#${String(id).slice(-6)}`; // Fallback lấy 6 ký tự cuối của ID
};

// --- MODAL CHI TIẾT (GIỮ NGUYÊN LOGIC, CHỈ COPY LẠI ĐỂ FILE HOÀN CHỈNH) ---
// --- COMPONENT MODAL CHI TIẾT (PHIÊN BẢN NÂNG CẤP) ---
const RMADetailModal = ({ rma, onClose, onUpdateStatus }) => {
  const [shipperList, setShipperList] = useState([]);
  const [selectedShipper, setSelectedShipper] = useState('');
  const [refundProof, setRefundProof] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // [MỚI] State quản lý Modal Từ Chối
  const [showRejectForm, setShowRejectForm] = useState(false); 
  const [rejectReason, setRejectReason] = useState(''); 

  useEffect(() => {
    // Gọi endpoint lấy shipper có load
    api.get('/admin/shippers/load').then(res => setShipperList(res.items || res || [])).catch(()=>{});
    }, []);

  if (!rma) return null;
  const orderTotal = rma.orderId?.total?.grand ?? rma.orderId?.pricing?.grandTotal ?? 0;

  const handleAction = async (status) => {
      setErrorMsg('');
      
      // Validation
      if (status === 'processed' && !refundProof) { setErrorMsg("⚠️ Cần ảnh bằng chứng chuyển khoản!"); return; }
      if (status === 'approved' && !selectedShipper) { setErrorMsg("⚠️ Vui lòng chọn Shipper!"); return; }
      
      // Nếu là REJECTED -> Mở Modal nhập lý do (thay vì prompt)
      if (status === 'rejected' && !showRejectForm) {
          setShowRejectForm(true);
          return;
      }

      setSubmitting(true);
      try {
          let payload = { status };
          if (status === 'approved') payload.shipperId = selectedShipper;
          if (status === 'processed') payload.refundProof = refundProof;
          
          // [MỚI] Gửi lý do từ chối từ form
          if (status === 'rejected') {
              if (!rejectReason.trim()) throw new Error("Vui lòng nhập lý do từ chối!");
              payload.reason = rejectReason;
          }

          await onUpdateStatus(rma._id, payload);
          setShowRejectForm(false); // Đóng form reject nếu thành công
      } catch (e) { setErrorMsg(e.message); } 
      finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Yêu cầu Đổi / Trả</h3>
            <p className="text-sm text-gray-500 mt-1">Đơn hàng: <span className="font-mono font-bold text-blue-600">{formatCode(rma.orderId?.code, rma.orderId?._id)}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={24} className="text-gray-400"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white p-5 rounded-xl border shadow-sm">
                 <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2"><CreditCard size={14}/> Thông tin nhận tiền</h4>
                 {rma.bankInfo ? (
                     <div className="space-y-3">
                         <div className="flex justify-between border-b border-dashed pb-2"><span className="text-gray-500 text-sm">Ngân hàng</span><span className="font-bold text-gray-800">{rma.bankInfo.bankName}</span></div>
                         <div className="flex justify-between border-b border-dashed pb-2"><span className="text-gray-500 text-sm">Số tài khoản</span><span className="font-mono font-bold text-blue-600 text-lg">{rma.bankInfo.accountNo}</span></div>
                         <div className="flex justify-between"><span className="text-gray-500 text-sm">Chủ tài khoản</span><span className="font-bold uppercase text-gray-800">{rma.bankInfo.accountName}</span></div>
                     </div>
                 ) : <p className="text-gray-400 italic text-sm">Khách chưa cung cấp thông tin.</p>}
             </div>

             <div className="bg-white p-5 rounded-xl border shadow-sm">
                 <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2"><Package size={14}/> Sản phẩm trả lại</h4>
                 <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                     {rma.items?.map((item, idx) => (
                         <div key={idx} className="flex justify-between text-sm border-b border-gray-100 pb-2 last:border-0">
                             <span className="font-medium text-gray-800 line-clamp-1 w-2/3" title={item.title}>{item.title}</span>
                             <span className="font-bold text-gray-600 bg-gray-100 px-2 rounded">x{item.qty}</span>
                         </div>
                     ))}
                 </div>
                 <div className="mt-3 pt-3 border-t flex justify-between font-bold text-gray-900 text-sm">
                     <span>Giá trị đơn hàng:</span><span className="text-blue-600">{money(orderTotal)}</span>
                 </div>
             </div>
          </div>

          <div className="bg-white p-5 rounded-xl border shadow-sm">
              <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Lý do & Hình ảnh</h4>
              <div className="mb-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200 italic">"{rma.customerNote || 'Không có ghi chú'}"</div>
              {rma.images?.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                      {rma.images.map((img, i) => (
                          <a key={i} href={getImageUrl(img)} target="_blank" className="block w-20 h-20 rounded-lg border overflow-hidden shrink-0 hover:opacity-80 transition">
                              <img src={getImageUrl(img)} className="w-full h-full object-cover"/>
                          </a>
                      ))}
                  </div>
              ) : <p className="text-xs text-gray-400">Không có ảnh đính kèm.</p>}
          </div>
          
          {/* --- ACTION ZONE --- */}
          <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 relative overflow-hidden">
              <h4 className="text-sm font-bold text-indigo-900 mb-4 uppercase tracking-wider flex items-center justify-between relative z-10">
                  <span>Xử lý yêu cầu</span>
              </h4>
              
              {errorMsg && <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-lg border border-red-200 flex items-center gap-2 animate-pulse relative z-10"><AlertTriangle size={16}/> {errorMsg}</div>}

              <div className="relative z-10">
                  {rma.status === 'requested' && (
                    <div className="space-y-4">
                        <label className="block text-xs font-bold text-indigo-800 mb-1 uppercase">Chọn Shipper đi lấy:</label>
                        
                        {/* VÙNG CHỌN SHIPPER MỚI */}
                        <div className="max-h-[200px] overflow-y-auto border rounded-xl bg-white p-2 space-y-1 custom-scrollbar">
                            {shipperList.map(s => (
                                <div 
                                    key={s._id}
                                    onClick={() => setSelectedShipper(s._id)}
                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-all ${selectedShipper === s._id ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-transparent hover:bg-gray-50'}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                        {s.avatarUrl ? <img src={getImageUrl(s.avatarUrl)} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center h-full text-xs font-bold">{s.name[0]}</span>}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-gray-800">{s.name}</div>
                                        <div className="flex gap-2 text-xs">
                                            <span className="text-gray-500">{s.phone}</span>
                                            {/* Badge Bận/Rảnh */}
                                            {s.status === 'busy' 
                                                ? <span className="text-red-600 font-bold bg-red-50 px-1.5 rounded">Bận ({s.taskCount})</span>
                                                : <span className="text-green-600 font-bold bg-green-50 px-1.5 rounded">Rảnh ({s.taskCount})</span>
                                            }
                                        </div>
                                    </div>
                                    {selectedShipper === s._id && <CheckCircle size={16} className="text-indigo-600"/>}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={()=>handleAction('approved')} disabled={submitting} className="btn bg-indigo-600 text-white hover:bg-indigo-700 shadow-md flex-1">
                                {submitting ? 'Processing...' : 'Gán & Duyệt'}
                            </button>
                            <button onClick={()=>handleAction('rejected')} disabled={submitting} className="btn bg-white border border-red-200 text-red-600 hover:bg-red-50 flex-1">Từ chối</button>
                        </div>
                    </div>
                    )}
                  {['approved', 'picking', 'picked'].includes(rma.status) && (
                      <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-indigo-100 shadow-sm">
                          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full"><Truck size={24}/></div>
                          <div>
                              <p className="font-bold text-indigo-900 text-sm">Đang vận chuyển hoàn về</p>
                              <p className="text-xs text-gray-500 mt-1">
                                  Shipper: <span className="font-bold text-gray-700">{shipperList.find(s=>s._id===rma.returnShipperId)?.name || '...'}</span> đang xử lý.
                              </p>
                          </div>
                      </div>
                  )}

                  {rma.status === 'returned_to_warehouse' && (
                      <div className="space-y-4">
                          <div className="flex items-center gap-2 text-green-800 font-medium bg-green-100 px-4 py-3 rounded-xl border border-green-200 mb-4">
                              <Package size={20}/> Hàng đã về kho. Vui lòng kiểm tra và hoàn tiền.
                          </div>
                          <div className="pt-4 border-t border-indigo-200">
                              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Ảnh bằng chứng chuyển khoản (UNC):</label>
                              <div className="w-full bg-white p-3 rounded-xl border border-dashed border-gray-300 hover:border-indigo-400 transition cursor-pointer">
                                  <ImageUploader value={refundProof} onChange={setRefundProof} />
                              </div>
                              <button onClick={()=>handleAction('processed')} disabled={submitting} className="mt-4 w-full btn bg-green-600 text-white hover:bg-green-700 shadow-lg flex items-center justify-center gap-2 py-3 rounded-xl font-bold">
                                  <CreditCard size={18}/> Xác nhận Đã Hoàn Tiền
                              </button>
                          </div>
                      </div>
                  )}

                  {rma.status === 'processed' && (
                      <div className="text-green-700 font-bold flex items-center gap-2 bg-green-50 p-4 rounded-xl border border-green-200 justify-center">
                          <CheckCircle size={24}/> Quy trình hoàn tất thành công.
                      </div>
                  )}
                  {rma.status === 'rejected' && (
                      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-red-200 text-center">
                          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3">
                              <XCircle size={24}/>
                          </div>
                          <h4 className="text-lg font-bold text-red-700">Yêu cầu đã bị từ chối</h4>
                          <p className="text-gray-500 text-sm mt-1">Lý do: "{rma.adminNote || 'Không có lý do cụ thể'}"</p>
                          <p className="text-xs text-gray-400 mt-4">Quy trình đã kết thúc.</p>
                      </div>
                  )}

                  {/* [MỚI] HIỂN THỊ KHI ĐÃ HỦY */}
                  {rma.status === 'cancelled' && (
                      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-gray-200 text-center opacity-70">
                          <X size={32} className="text-gray-400 mb-2"/>
                          <h4 className="text-lg font-bold text-gray-600">Yêu cầu đã bị hủy</h4>
                          <p className="text-sm text-gray-500">Khách hàng hoặc hệ thống đã hủy yêu cầu này.</p>
                      </div>
                  )}
                  
                  {/* [MỚI] HIỂN THỊ KHI ĐÃ HOÀN TIỀN (REFUNDED) */}
                  {rma.status === 'refunded' && (
                      <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-xl border border-green-200 text-center">
                          <div className="w-12 h-12 bg-white text-green-600 rounded-full flex items-center justify-center mb-3 shadow-sm">
                              <CreditCard size={24}/>
                          </div>
                          <h4 className="text-lg font-bold text-green-800">Đã hoàn tiền thành công</h4>
                          <p className="text-green-700 text-sm mt-1">Giao dịch hoàn tất.</p>
                          {rma.refundProof && (
                              <a href={getImageUrl(rma.refundProof)} target="_blank" className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1">
                                  <ExternalLink size={12}/> Xem bằng chứng chuyển khoản
                              </a>
                          )}
                      </div>
                  )}
              </div>
          </div>
        </div>

        {/* --- [MỚI] MODAL NHẬP LÝ DO TỪ CHỐI (ĐÈ LÊN TRÊN) --- */}
        {showRejectForm && (
            <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center p-6 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 animate-in zoom-in-95">
                    <h4 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
                        <XCircle size={20}/> Xác nhận Từ chối
                    </h4>
                    <p className="text-sm text-gray-500 mb-4">Vui lòng nhập lý do từ chối để khách hàng biết.</p>
                    
                    <textarea 
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm min-h-[100px]"
                        placeholder="VD: Sản phẩm không còn nguyên tem mác..."
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        autoFocus
                    />
                    
                    <div className="flex gap-3 mt-4 justify-end">
                        <button onClick={()=>setShowRejectForm(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition">Hủy</button>
                        <button onClick={()=>handleAction('rejected')} disabled={submitting} className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition">
                            {submitting ? 'Đang xử lý...' : 'Xác nhận Từ chối'}
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

// --- COMPONENT CHÍNH ---
export default function RMAList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRMA, setSelectedRMA] = useState(null);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 7;

  const load = async () => {
    setLoading(true);
    try {
      const res = await rmaService.list({ status: statusFilter });
      setRows(res.items || []);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  // Filter & Pagination Logic
  const filteredRows = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return rows;

    return rows.filter(r => {
      // Tìm trong nhiều trường thông tin
      const code = String(r.orderId?.code || r._id).toLowerCase();
      const email = String(r.userId?.email || '').toLowerCase();
      const name = String(r.userId?.name || '').toLowerCase();
      const phone = String(r.userId?.phone || '').toLowerCase();
      
      return code.includes(term) || 
             email.includes(term) || 
             name.includes(term) || 
             phone.includes(term);
    });
  }, [rows, searchTerm]);
  const totalPages = Math.ceil(filteredRows.length / ITEMS_PER_PAGE);
  const paginatedRows = filteredRows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleUpdateStatus = async (id, payload) => {
      try {
          await rmaService.update(id, payload); 
          load();
          setSelectedRMA(null);
      } catch(e) { alert(e.message); }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
               <RefreshCw className="text-indigo-600" /> Quản lý Đổi/Trả
            </h2>
            <p className="text-sm text-gray-500 mt-1">Xử lý yêu cầu hoàn hàng từ khách</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input 
                  className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64 transition"
                  placeholder="Tìm theo mã đơn, email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
              />
          </div>

          {/* Status Filter */}
          <div className="relative">
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <select 
                className="pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-white transition appearance-none" 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="requested">Mới yêu cầu</option>
                <option value="approved">Đã duyệt</option>
                <option value="picking">Đang đi lấy</option>
                <option value="picked">Đang giữ hàng</option>
                <option value="returned_to_warehouse">Đã về kho</option>
                <option value="processed">Hoàn tất</option>
                <option value="rejected">Từ chối</option>
              </select>
          </div>
          
          <button onClick={load} className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition shadow-sm border border-gray-200">
              <RefreshCw size={18}/>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
                <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Mã đơn hàng</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Loại yêu cầu</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
                {loading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">Đang tải dữ liệu...</td></tr>
                ) : paginatedRows.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="p-12">
                            <div className="flex flex-col items-center justify-center text-center text-gray-400">
                                <Package size={48} className="opacity-20 mb-2"/>
                                <p className="font-medium">Không tìm thấy yêu cầu nào.</p>
                            </div>
                        </td>
                    </tr>
                ) : (
                    paginatedRows.map((r) => {
                        const conf = STATUS_CONFIG[r.status] || { label: r.status, color: 'text-gray-600 bg-gray-100' };
                        const Icon = conf.icon || Package;
                        const orderCode = formatCode(r.orderId?.code, r.orderId?._id); // Format chuẩn xx-xxx

                        return (
                        <tr key={r._id} className="hover:bg-indigo-50/30 transition-colors group cursor-default">
                            <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-900 text-sm font-mono">{orderCode}</span>
                                <span className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                    <Clock size={10}/> {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                                </span>
                            </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs overflow-hidden border border-gray-200 shrink-0">
                                      {r.userId?.avatarUrl || r.userId?.avatar ? (
                                        <img src={getImageUrl(r.userId.avatarUrl || r.userId.avatar)} className="w-full h-full object-cover" alt=""/>
                                        ):(
                                        <span>{r.userId?.name?.[0]?.toUpperCase() || 'U'}</span>
                                      )}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-800">{r.userId?.name || 'Unknown'}</div>
                                        <div className="text-xs text-gray-500">{r.userId?.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${r.type==='return'?'bg-red-50 text-red-600 border-red-100':'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                    {r.type === 'return' ? 'Trả hàng' : 'Đổi hàng'}
                                </span>
                                <span className="text-xs text-gray-500 font-medium">x{r.items?.length} SP</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1 max-w-[180px] truncate pl-1 border-l-2 border-gray-200">
                                {r.items?.[0]?.reason}
                            </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-bold rounded-full border ${conf.color}`}>
                                <Icon size={12}/> {conf.label}
                            </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button 
                                onClick={() => setSelectedRMA(r)}
                                className="text-gray-400 hover:text-indigo-600 bg-white border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 p-2 rounded-lg transition-all shadow-sm active:scale-95"
                                title="Xem chi tiết"
                            >
                                <Eye size={18} />
                            </button>
                            </td>
                        </tr>
                        );
                    })
                )}
            </tbody>
            </table>
        </div>

        {/* Pagination */}
        {filteredRows.length > ITEMS_PER_PAGE && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                    Hiển thị {((page - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(page * ITEMS_PER_PAGE, filteredRows.length)} trong tổng số {filteredRows.length} yêu cầu
                </div>
                <div className="flex gap-2">
                    <button 
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="p-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        <ChevronLeft size={16}/>
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setPage(i + 1)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition ${page === i+1 ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
                        >
                            {i + 1}
                        </button>
                    ))}
                    <button 
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="p-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        <ChevronRight size={16}/>
                    </button>
                </div>
            </div>
        )}
      </div>

      {selectedRMA && (
        <RMADetailModal 
          rma={selectedRMA} 
          onClose={() => setSelectedRMA(null)} 
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
}