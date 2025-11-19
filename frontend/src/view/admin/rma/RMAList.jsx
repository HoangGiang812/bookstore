import React, { useEffect, useState, useMemo } from 'react';
import * as rmaService from '@/services/rma.js'; 
import { Search, RefreshCw, CheckCircle, XCircle, Eye, X, ExternalLink, Package, AlertTriangle } from 'lucide-react';
import { getImageUrl } from '@/services/api';

const STATUS_COLORS = {
  requested: 'text-blue-600 bg-blue-50 border-blue-200',
  approved: 'text-orange-600 bg-orange-50 border-orange-200',
  rejected: 'text-red-600 bg-red-50 border-red-200',
  processed: 'text-green-600 bg-green-50 border-green-200',
  cancelled: 'text-gray-500 bg-gray-100 border-gray-200',
};

const STATUS_LABELS = {
  requested: 'Mới yêu cầu',
  approved: 'Đã duyệt (Chờ hàng về)',
  rejected: 'Đã từ chối',
  processed: 'Đã hoàn tiền (Xong)',
  cancelled: 'Đã huỷ',
};

const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';

// --- COMPONENT MODAL CHI TIẾT (NÂNG CẤP) ---
const RMADetailModal = ({ rma, onClose, onUpdateStatus }) => {
  if (!rma) return null;
  
  // Tính toán tài chính
  const orderTotal = rma.orderId?.total?.grand ?? rma.orderId?.pricing?.grandTotal ?? 0;
  const orderDiscount = rma.orderId?.discount ?? rma.orderId?.pricing?.discount ?? 0;
  
  const refundSubtotal = (rma.items || []).reduce((sum, rmaItem) => {
    let unitPrice = 0;

    // CÁCH 1: Tìm trong items của Order (nếu đã populate)
    const originalItem = (rma.orderId?.items || []).find(oi => 
       // So sánh bookId (nếu oi.bookId là object thì lấy _id, nếu là string thì so sánh trực tiếp)
       String(oi.bookId?._id || oi.bookId) === String(rmaItem.bookId)
    );

    if (originalItem) {
      // Lấy giá từ item trong đơn hàng (ưu tiên unitPrice, rồi đến price)
      unitPrice = Number(originalItem.unitPrice) || Number(originalItem.price) || 0;
    } else {
       // CÁCH 2: Nếu không tìm thấy trong order, thử tìm trong bookId (nếu rmaItem.bookId được populate)
       // (Lưu ý: rmaItem.bookId thường chỉ là ID string nếu chưa populate sâu)
       if (rmaItem.bookId && typeof rmaItem.bookId === 'object') {
           unitPrice = Number(rmaItem.bookId.price) || 0;
       }
    }

    return sum + (unitPrice * (rmaItem.qty || 0));
  }, 0);

  // Logic hoàn tiền: 
  // Nếu trả HẾT đơn -> Hoàn = Tổng đơn (đã trừ giảm giá)
  // Nếu trả 1 phần -> Hoàn = (Giá món * SL) - (Giảm giá phân bổ - logic này phức tạp, tạm tính theo tỉ lệ hoặc bỏ qua giảm giá)
  // Ở đây, vì logic của chúng ta là "Trả toàn bộ", nên Refund = Order Total.
  const finalRefundAmount = orderTotal; 

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Chi tiết Đổi / Trả #{rma._id.slice(-6)}</h3>
            <p className="text-sm text-gray-500">
              Đơn hàng: <span className="font-mono font-semibold text-blue-600">#{rma.orderId?.code || String(rma.orderId?._id || rma.orderId).slice(-6)}</span>
              <span className="mx-2">•</span>
              Ngày tạo: {new Date(rma.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition">
            <X size={24} />
          </button>
        </div>

        {/* Body Modal (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
          
          {/* 1. Thông tin Trạng thái & Khách hàng */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase">Trạng thái xử lý</h4>
              <div className={`inline-flex items-center px-3 py-1.5 rounded-full border text-sm font-medium ${STATUS_COLORS[rma.status]}`}>
                {STATUS_LABELS[rma.status] || rma.status}
              </div>
              {rma.adminNote && (
                 <div className="mt-3 p-3 bg-yellow-50 border border-yellow-100 rounded text-sm text-yellow-800">
                   <strong>Ghi chú Admin:</strong> {rma.adminNote}
                 </div>
              )}
            </div>
            
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase">Thông tin Khách hàng</h4>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                  {(rma.userId?.name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{rma.userId?.name || 'Khách vãng lai'}</div>
                  <div className="text-sm text-gray-500">{rma.userId?.email}</div>
                  <div className="text-sm text-gray-500">{rma.userId?.phone || 'SĐT: (Chưa cập nhật)'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Bảng Sản phẩm & Tính tiền (NÂNG CẤP) */}
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
              <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                <Package size={18} /> Sản phẩm yêu cầu trả ({rma.items?.length || 0})
              </h4>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Sản phẩm</th>
                  <th className="px-4 py-2 text-center">SL trả</th>
                  <th className="px-4 py-2 text-right">Đơn giá</th>
                  <th className="px-4 py-2 text-right">Thành tiền</th>
                  <th className="px-4 py-2 text-left">Lý do</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(rma.items || []).map((item, idx) => {
                   // Tìm lại item gốc để lấy giá
                  const originalItem = (rma.orderId?.items || []).find(oi => 
                      String(oi.bookId?._id || oi.bookId) === String(item.bookId)
                  );
                  // Ưu tiên lấy giá lúc mua (trong order), nếu không có thì lấy 0
                  const unitPrice = Number(originalItem?.unitPrice) || Number(originalItem?.price) || 0;
                  const title = item.title || originalItem?.title || 'Sản phẩm không xác định';

                  return (
                    <tr key={idx}>
                      <td className="px-4 py-3 font-medium text-gray-900">{title}</td>
                      <td className="px-4 py-3 text-center font-mono text-gray-600">x{item.qty}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{money(unitPrice)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">{money(unitPrice * item.qty)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs italic max-w-[150px] truncate" title={item.reason}>
                        {item.reason}
                      </td>
                    </tr>
                   )
                })}
              </tbody>
              
              {/* FOOTER TÍNH TIỀN */}
              <tfoot className="bg-gray-50 border-t text-sm">
                 {/* Hiển thị giảm giá nếu có */}
                 {orderDiscount > 0 && (
                   <tr>
                     <td colSpan={3} className="px-4 py-1 text-right text-green-600 pt-3">
                       Đã áp dụng mã giảm giá:
                     </td>
                     <td className="px-4 py-1 text-right font-medium text-green-600 pt-3">
                       -{money(orderDiscount)}
                     </td>
                     <td></td>
                   </tr>
                 )}
                 
                 <tr className="text-base">
                   <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-900">
                     Tổng tiền hoàn lại:
                   </td>
                   <td className="px-4 py-3 text-right font-bold text-blue-600 text-lg">
                     {money(finalRefundAmount)}
                   </td>
                   <td></td>
                 </tr>
              </tfoot>
            </table>
          </div>

          {/* 3. Hình ảnh & Ghi chú */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Ghi chú */}
            <div className="md:col-span-1 bg-white p-4 rounded-lg border shadow-sm h-fit">
              <h4 className="text-sm font-semibold text-gray-500 mb-2 uppercase">Ghi chú của khách</h4>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg border min-h-[100px] italic text-sm">
                "{rma.customerNote || 'Không có ghi chú thêm.'}"
              </p>
            </div>

            {/* Hình ảnh */}
            <div className="md:col-span-2 bg-white p-4 rounded-lg border shadow-sm">
              <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase flex items-center justify-between">
                <span>Hình ảnh minh chứng ({rma.images?.length || 0})</span>
                <span className="text-xs normal-case font-normal text-gray-400">Click để xem ảnh gốc</span>
              </h4>
              {(!rma.images || rma.images.length === 0) ? (
                <div className="text-center py-8 text-gray-400 italic bg-gray-50 rounded-lg border border-dashed">
                  Khách hàng không tải lên hình ảnh nào.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {rma.images.map((img, idx) => (
                    <a 
                      key={idx} 
                      href={getImageUrl(img)} 
                      target="_blank" 
                      rel="noreferrer"
                      className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border hover:shadow-md transition"
                    >
                      <img 
                        src={getImageUrl(img)} 
                        alt={`evidence-${idx}`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <ExternalLink className="text-white drop-shadow-md" size={20} />
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t bg-white flex justify-between items-center">
            <div className="text-xs text-gray-400 italic">
              ID: {rma._id}
            </div>
            <div className="flex gap-3">
              {rma.status === 'requested' && (
                <>
                  <button 
                    onClick={() => onUpdateStatus(rma._id, 'rejected')}
                    className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium transition"
                  >
                    Từ chối yêu cầu
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(rma._id, 'approved')}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium shadow-sm hover:shadow transition"
                  >
                    <CheckCircle size={18} className="inline mr-2 mb-0.5"/>
                    Duyệt yêu cầu
                  </button>
                </>
              )}
              
              {rma.status === 'approved' && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-orange-600 font-medium bg-orange-50 px-3 py-2 rounded-lg border border-orange-100 flex items-center gap-2">
                    <AlertTriangle size={16}/> Đang chờ khách gửi hàng
                  </span>
                  <button 
                    onClick={() => onUpdateStatus(rma._id, 'processed')}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-sm hover:shadow transition"
                  >
                    <CheckCircle size={18} className="inline mr-2 mb-0.5"/>
                    Đã nhận hàng & Hoàn tiền
                  </button>
                </div>
              )}
              
              {['processed', 'rejected', 'cancelled'].includes(rma.status) && (
                <button onClick={onClose} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium">
                  Đóng
                </button>
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

  const handleUpdateStatus = async (id, newStatus) => {
    let note = '';
    if (newStatus === 'rejected') {
      note = prompt("Nhập lý do từ chối (tùy chọn):");
      if (note === null) return; 
    }
    
    if (!window.confirm(`Xác nhận chuyển trạng thái thành "${STATUS_LABELS[newStatus]}"?`)) return;
    
    try {
      await rmaService.update(id, { status: newStatus, reason: note });
      setSelectedRMA(null); 
      load(); 
    } catch (err) {
      alert("Lỗi cập nhật: " + err.message);
    }
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