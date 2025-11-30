import React, { useEffect, useState, useMemo } from 'react';
import * as rmaService from '@/services/rma.js'; 
import { listShippers } from '@/services/admin';
import { Search, RefreshCw, CheckCircle, XCircle, Eye, X, ExternalLink, Package, AlertTriangle, Truck, CreditCard, Upload } from 'lucide-react';
import { getImageUrl } from '@/services/api';
import ImageUploader from '@/view/pages/admin/ImageUploader';

const STATUS_COLORS = {
  requested: 'text-blue-600 bg-blue-50 border-blue-200',
  approved: 'text-orange-600 bg-orange-50 border-orange-200',
  picking: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  rejected: 'text-red-600 bg-red-50 border-red-200',
  processed: 'text-green-600 bg-green-50 border-green-200',
  cancelled: 'text-gray-500 bg-gray-100 border-gray-200',
  refunded: 'text-green-700 bg-green-100 border-green-300'
};
const STATUS_LABELS = {
  requested: 'Mới yêu cầu',
  approved: 'Đã duyệt (Chờ gán Shipper)',
  picking: 'Shipper đang lấy hàng',
  rejected: 'Đã từ chối',
  processed: 'Đã hoàn tất',
  refunded: 'Đã hoàn tiền',
  cancelled: 'Đã huỷ',
};

const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';

// --- MODAL CHI TIẾT ---
const RMADetailModal = ({ rma, onClose, onUpdateStatus }) => {
  const [shipperList, setShipperList] = useState([]);
  const [selectedShipper, setSelectedShipper] = useState('');
  const [refundProof, setRefundProof] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load danh sách shipper khi modal mở
  useEffect(() => {
      listShippers().then(res => setShipperList(res.items || res || [])).catch(()=>{});
  }, []);

  if (!rma) return null;
  const orderTotal = rma.orderId?.total?.grand ?? rma.orderId?.pricing?.grandTotal ?? 0;

  const handleAction = async (status) => {
      setSubmitting(true);
      try {
          let payload = { status };
          
          if (status === 'approved' && selectedShipper) {
              payload.shipperId = selectedShipper; // Gán shipper
          }
          if (status === 'processed') {
              if (!refundProof) { alert("Vui lòng upload ảnh bằng chứng chuyển khoản!"); setSubmitting(false); return; }
              payload.refundProof = refundProof; // Gửi ảnh UNC
          }
          
          await onUpdateStatus(rma._id, payload);
      } catch (e) { alert(e.message); } 
      finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Yêu cầu Đổi / Trả #{rma._id.slice(-6)}</h3>
            <p className="text-sm text-gray-500">Đơn hàng: <span className="font-mono font-bold text-blue-600">#{rma.orderId?.code}</span></p>
          </div>
          <button onClick={onClose}><X size={24} className="text-gray-400 hover:text-gray-600"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
          {/* Thông tin chính */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Cột 1: Thông tin Ngân hàng (MỚI) */}
             <div className="bg-white p-4 rounded-xl border shadow-sm">
                 <h4 className="text-sm font-bold text-gray-500 mb-3 uppercase flex items-center gap-2">
                     <CreditCard size={16}/> Thông tin nhận tiền (Khách)
                 </h4>
                 {rma.bankInfo ? (
                     <div className="space-y-2 text-sm">
                         <div className="flex justify-between border-b border-dashed pb-2">
                             <span className="text-gray-500">Ngân hàng:</span>
                             <span className="font-bold">{rma.bankInfo.bankName}</span>
                         </div>
                         <div className="flex justify-between border-b border-dashed pb-2">
                             <span className="text-gray-500">Số tài khoản:</span>
                             <span className="font-bold font-mono text-blue-600 text-lg">{rma.bankInfo.accountNo}</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-gray-500">Chủ tài khoản:</span>
                             <span className="font-bold uppercase">{rma.bankInfo.accountName}</span>
                         </div>
                     </div>
                 ) : (
                     <p className="text-gray-400 italic">Khách không cung cấp thông tin ngân hàng.</p>
                 )}
             </div>

             {/* Cột 2: Sản phẩm */}
             <div className="bg-white p-4 rounded-xl border shadow-sm">
                 <h4 className="text-sm font-bold text-gray-500 mb-3 uppercase flex items-center gap-2">
                     <Package size={16}/> Sản phẩm trả lại
                 </h4>
                 <div className="space-y-2 max-h-[150px] overflow-y-auto">
                     {rma.items?.map((item, idx) => (
                         <div key={idx} className="flex justify-between text-sm border-b border-gray-100 pb-2">
                             <span className="font-medium text-gray-800">{item.title}</span>
                             <span className="font-mono text-gray-500">x{item.qty}</span>
                         </div>
                     ))}
                 </div>
                 <div className="mt-3 pt-2 border-t flex justify-between font-bold text-gray-900">
                     <span>Số tiền cần hoàn (dự kiến):</span>
                     <span className="text-blue-600">{money(orderTotal)}</span>
                 </div>
             </div>
          </div>

          {/* Hình ảnh bằng chứng */}
          <div className="bg-white p-4 rounded-xl border shadow-sm">
              <h4 className="text-sm font-bold text-gray-500 mb-3 uppercase">Hình ảnh / Lý do lỗi</h4>
              <div className="mb-2 text-sm text-gray-700 bg-gray-50 p-2 rounded border italic">"{rma.customerNote}"</div>
              <div className="flex gap-2 overflow-x-auto">
                  {rma.images?.map((img, i) => (
                      <a key={i} href={getImageUrl(img)} target="_blank" className="block w-20 h-20 rounded border overflow-hidden shrink-0">
                          <img src={getImageUrl(img)} className="w-full h-full object-cover"/>
                      </a>
                  ))}
              </div>
          </div>

          {/* --- KHU VỰC XỬ LÝ (ACTION ZONE) --- */}
          <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
              <h4 className="text-sm font-bold text-blue-800 mb-4 uppercase">Xử lý yêu cầu</h4>
              
              {/* STATE: REQUESTED (Cần chọn shipper) */}
              {rma.status === 'requested' && (
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Chọn Shipper đi lấy hàng:</label>
                          <select className="input w-full" value={selectedShipper} onChange={e=>setSelectedShipper(e.target.value)}>
                              <option value="">-- Chọn nhân viên --</option>
                              {shipperList.map(s => <option key={s._id} value={s._id}>{s.name} - {s.phone}</option>)}
                          </select>
                      </div>
                      <div className="flex gap-3">
                          <button onClick={()=>handleAction('approved')} disabled={submitting} className="btn bg-green-600 text-white hover:bg-green-700 shadow-md">
                              <CheckCircle size={18} className="inline mr-2"/> Duyệt & Gán Shipper
                          </button>
                          <button onClick={()=>handleAction('rejected')} disabled={submitting} className="btn bg-white border border-red-200 text-red-600 hover:bg-red-50">
                              Từ chối
                          </button>
                      </div>
                  </div>
              )}

              {/* STATE: APPROVED/PICKING (Đang chờ hàng về) */}
              {['approved', 'picking'].includes(rma.status) && (
                  <div className="space-y-4">
                      <div className="flex items-center gap-2 text-orange-700 font-medium bg-orange-100 px-3 py-2 rounded-lg w-fit">
                          <Truck size={18}/> Đang chờ Shipper lấy hàng về kho...
                      </div>
                      <div className="pt-4 border-t border-blue-200">
                          <label className="block text-sm font-bold text-gray-700 mb-2">Đã nhận hàng? Tải ảnh chuyển khoản hoàn tiền (UNC):</label>
                          <div className="w-full max-w-md bg-white p-3 rounded-xl border border-dashed border-gray-300">
                              <ImageUploader value={refundProof} onChange={setRefundProof} />
                          </div>
                          <button onClick={()=>handleAction('processed')} disabled={submitting || !refundProof} className="mt-4 btn bg-blue-600 text-white hover:bg-blue-700 shadow-lg">
                              <CreditCard size={18} className="inline mr-2"/> Xác nhận Đã Hoàn Tiền
                          </button>
                      </div>
                  </div>
              )}

              {rma.status === 'processed' && (
                  <div className="text-green-700 font-bold flex items-center gap-2">
                      <CheckCircle size={20}/> Yêu cầu đã được xử lý hoàn tất.
                  </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT CHÍNH ---
export default function RMAList({ searchTerm }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRMA, setSelectedRMA] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await rmaService.list({ status: statusFilter });
      setRows(res.items || []);
    } catch (err) {
      console.error("Lỗi tải RMA:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const filteredRows = useMemo(() => {
    const lowerTerm = (searchTerm || '').toLowerCase();
    return rows.filter(r => {
      const code = r.orderId?.code || String(r.orderId?._id || r.orderId || '');
      const email = r.userId?.email || '';
      return code.toLowerCase().includes(lowerTerm) || email.toLowerCase().includes(lowerTerm);
    });
  }, [rows, searchTerm]);

  const handleUpdateStatus = async (id, payload) => {
      try {
          await rmaService.update(id, payload); // Nhớ sửa service update để nhận object payload
          load();
          setSelectedRMA(null);
      } catch(e) { alert(e.message); }
  };

  if (loading) return <div className="p-4">Đang tải yêu cầu đổi/trả...</div>;

  return (
    <div className="space-y-4">
      {/* Header Filters */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <RefreshCw className="text-blue-600" /> Quản lý Đổi/Trả (RMA)
        </h2>
        <div className="flex gap-3">
          <select 
            className="input border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">-- Tất cả trạng thái --</option>
            <option value="requested">Mới yêu cầu</option>
            <option value="approved">Đã duyệt (Chờ hàng)</option>
            <option value="processed">Đã hoàn tiền</option>
            <option value="rejected">Đã từ chối</option>
          </select>
          <button onClick={load} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition" title="Tải lại">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã đơn</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yêu cầu</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRows.map((r) => (
              <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">
                  #{r.orderId?.code || String(r.orderId?._id || r.orderId).slice(-6)}
                  <div className="text-xs text-gray-400 mt-1">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{r.userId?.name || 'N/A'}</div>
                  <div className="text-xs text-gray-500">{r.userId?.email}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 font-medium mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 text-xs mr-2 font-bold">{r.type === 'return' ? 'TRẢ HÀNG' : 'ĐỔI HÀNG'}</span>
                    {r.items?.length} sản phẩm
                  </div>
                  <div className="text-xs text-gray-500 truncate max-w-xs" title={r.items?.[0]?.reason}>
                    Lý do: {r.items?.[0]?.reason || '...'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${STATUS_COLORS[r.status] || 'bg-gray-100'}`}>
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => setSelectedRMA(r)}
                    className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-lg hover:bg-blue-100 transition inline-flex items-center gap-1"
                  >
                    <Eye size={18} /> Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRows.length === 0 && (
          <div className="p-10 text-center text-gray-500 bg-gray-50">
            <Package size={48} className="mx-auto mb-3 text-gray-300" />
            <p>Không tìm thấy yêu cầu nào phù hợp.</p>
          </div>
        )}
      </div>

      {/* Modal Chi tiết */}
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