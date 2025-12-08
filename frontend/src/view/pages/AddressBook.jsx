// src/view/pages/AddressBook.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../../store/useAuth';
import { useUI } from '../../store/useUI';
import api from '../../services/api';
import { MapPin, Plus, Trash2, CheckCircle2, MoreVertical, Home, Briefcase } from 'lucide-react';

/* ================= MODAL THÊM/SỬA ĐỊA CHỈ ================= */
// Dữ liệu hành chính (nên tách ra file constants riêng nếu được)
const VN_PROVINCES = [
  'Hà Nội', 'Hồ Chí Minh', 'Hải Phòng', 'Đà Nẵng', 'Cần Thơ',
  'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
  'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước', 
  'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông', 
  'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang', 
  'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình', 
  'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu', 
  'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 
  'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên', 
  'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 
  'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 
  'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang', 
  'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
];
// (Giản lược demo, bạn có thể giữ nguyên list cũ của bạn)
const DISTRICTS = {
  'Hồ Chí Minh': ['Quận 1','Quận 3','Quận 5','Quận 7','Bình Thạnh','Gò Vấp','Tân Bình','Phú Nhuận','Thủ Đức', 'Quận 12', 'Bình Tân'],
  'Hà Nội': ['Ba Đình','Hoàn Kiếm','Cầu Giấy','Đống Đa','Hai Bà Trưng','Thanh Xuân','Bắc Từ Liêm','Nam Từ Liêm', 'Hà Đông', 'Hoàng Mai'],
  'Đà Nẵng': ['Hải Châu','Thanh Khê','Sơn Trà','Ngũ Hành Sơn','Liên Chiểu','Cẩm Lệ', 'Hòa Vang'],
  'Hải Phòng': ['Hồng Bàng', 'Ngô Quyền', 'Lê Chân', 'Kiến An', 'Hải An'],
  'Cần Thơ': ['Ninh Kiều', 'Cái Răng', 'Bình Thủy', 'Ô Môn', 'Thốt Nốt'],
  'Bình Dương': ['Thủ Dầu Một', 'Dĩ An', 'Thuận An', 'Tân Uyên', 'Bến Cát'],
  'Đồng Nai': ['Biên Hòa', 'Long Khánh', 'Nhơn Trạch', 'Trảng Bom', 'Vĩnh Cửu'],
  'Khánh Hòa': ['Nha Trang', 'Cam Ranh', 'Ninh Hòa', 'Diên Khánh'],
  'Thừa Thiên Huế': ['Huế', 'Hương Thủy', 'Hương Trà', 'Phú Vang'],
};

const WARDS = {
  'Hồ Chí Minh': {
    'Quận 1': ['Bến Nghé','Bến Thành','Cầu Ông Lãnh','Cô Giang','Đa Kao','Nguyễn Thái Bình','Tân Định', 'Phạm Ngũ Lão'],
    'Bình Thạnh': ['Phường 1','Phường 2','Phường 5','Phường 7','Phường 11','Phường 12','Phường 14', 'Phường 21', 'Phường 22', 'Phường 24', 'Phường 25', 'Phường 26', 'Phường 27', 'Phường 28'],
    'Thủ Đức': ['Linh Trung', 'Hiệp Bình Chánh', 'Hiệp Bình Phước', 'Bình Chiểu', 'Tam Bình'],
  },
  'Hà Nội': {
    'Ba Đình': ['Điện Biên','Kim Mã','Cống Vị','Giảng Võ','Liễu Giai', 'Đội Cấn', 'Thành Công'],
    'Cầu Giấy': ['Dịch Vọng','Dịch Vọng Hậu','Quan Hoa','Nghĩa Tân','Nghĩa Đô', 'Mai Dịch', 'Yên Hòa'],
    'Hoàng Mai': ['Hoàng Liệt', 'Đại Kim', 'Thịnh Liệt', 'Mai Động', 'Lĩnh Nam'],
  },
  'Đà Nẵng': { 
    'Hải Châu': ['Hải Châu 1','Hải Châu 2','Bình Hiên','Thạch Thang','Nam Dương', 'Hòa Cường Bắc', 'Hòa Cường Nam'],
    'Thanh Khê': ['An Khê', 'Hòa Khê', 'Thanh Khê Đông', 'Xuân Hà'],
  },
  'Hải Phòng': { 
    'Ngô Quyền': ['Cầu Đất', 'Lạch Tray', 'Đằng Giang', 'Đông Khê'],
    'Hồng Bàng': ['Quán Toan', 'Hùng Vương', 'Sở Dầu'],
  },
  'Cần Thơ': {
    'Ninh Kiều': ['An Cư', 'An Hòa', 'Cái Khế', 'Xuân Khánh', 'An Khánh'],
  },
};

function AddressModal({ open, onClose, onSave, user }) {
  const { showToast } = useUI();
  const [f, setF] = useState({
    label: 'Nhà riêng', receiver: '', phone: '',
    province: '', district: '', ward: '', detail: '', isDefault: false,
  });

  const districts = DISTRICTS[f.province] || [];

  // Reset form khi mở modal
  useEffect(() => {
    if (open) {
      setF({
        label: 'Nhà riêng', 
        receiver: user?.name || '', 
        phone: user?.phone || '', 
        province: '', district: '', ward: '', detail: '', 
        isDefault: false,
      });
    }
  }, [open, user]);

  const handleSubmit = () => {
    if (!f.receiver || !f.phone || !f.province || !f.detail) {
      return showToast({ type: 'warning', title: 'Thiếu thông tin', message: 'Vui lòng điền các trường bắt buộc' });
    }
    onSave(f);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800">Thêm địa chỉ mới</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">✕</button>
        </div>
        
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Tên người nhận <span className="text-red-500">*</span></label>
              <input className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                value={f.receiver} onChange={e => setF({...f, receiver: e.target.value})} placeholder="Ví dụ: Nguyễn Văn A" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Số điện thoại <span className="text-red-500">*</span></label>
              <input className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                value={f.phone} onChange={e => setF({...f, phone: e.target.value})} placeholder="09xxxxxxxx" />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
             <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Tỉnh/Thành <span className="text-red-500">*</span></label>
                <input list="provinces" className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={f.province} onChange={e => setF({...f, province: e.target.value, district: ''})} placeholder="Chọn Tỉnh/Thành" />
                <datalist id="provinces">{VN_PROVINCES.map(p => <option key={p} value={p}/>)}</datalist>
             </div>
             <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Quận/Huyện</label>
                <input list="districts" className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                   value={f.district} onChange={e => setF({...f, district: e.target.value})} placeholder="Chọn Quận/Huyện" disabled={!f.province}/>
                <datalist id="districts">{districts.map(d => <option key={d} value={d}/>)}</datalist>
             </div>
             <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Phường/Xã</label>
                <input className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                   value={f.ward} onChange={e => setF({...f, ward: e.target.value})} placeholder="Nhập Phường/Xã" disabled={!f.district}/>
             </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Địa chỉ cụ thể <span className="text-red-500">*</span></label>
            <input className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
              value={f.detail} onChange={e => setF({...f, detail: e.target.value})} placeholder="Số nhà, tên đường, tòa nhà..." />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <div className="space-y-1.5 flex-1">
               <label className="text-sm font-semibold text-gray-700">Loại địa chỉ</label>
               <div className="flex gap-3">
                 {['Nhà riêng', 'Văn phòng'].map(l => (
                   <button key={l} onClick={() => setF({...f, label: l})}
                     className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${f.label === l ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                     {l === 'Nhà riêng' ? <Home size={14} className="inline mr-1"/> : <Briefcase size={14} className="inline mr-1"/>}
                     {l}
                   </button>
                 ))}
               </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-6">
               <input type="checkbox" className="w-5 h-5 accent-blue-600 rounded" 
                 checked={f.isDefault} onChange={e => setF({...f, isDefault: e.target.checked})} />
               <span className="text-sm font-medium text-gray-700">Đặt làm mặc định</span>
            </label>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition-colors">Hủy bỏ</button>
          <button onClick={handleSubmit} className="px-5 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">Lưu địa chỉ</button>
        </div>
      </div>
    </div>
  );
}

/* ================= TRANG CHÍNH ================= */
export default function AddressBook() {
  const { user } = useAuth();
  const { showToast } = useUI();
  
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  // Hàm tải danh sách từ Backend (CHỈ DÙNG API, KHÔNG DÙNG LOCALSTORAGE)
  const fetchAddresses = async () => {
    try {
      setLoading(true);
      // Gọi đúng route: /users/me/addresses
      const res = await api.get('/users/me/addresses');
      const items = Array.isArray(res) ? res : (res?.items || []);
      setList(items);
    } catch (err) {
      console.error(err);
      // showToast({ type: 'danger', message: 'Không tải được danh sách địa chỉ' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleAdd = async (data) => {
    try {
      await api.post('/users/me/addresses', data);
      showToast({ type: 'success', title: 'Thêm địa chỉ thành công' });
      setOpenModal(false);
      fetchAddresses(); // Reload lại list
    } catch (e) {
      showToast({ type: 'danger', title: 'Lỗi', message: e.message || 'Không lưu được địa chỉ' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return;
    try {
      await api.delete(`/users/me/addresses/${id}`);
      showToast({ type: 'success', title: 'Đã xóa địa chỉ' });
      fetchAddresses();
    } catch (e) {
      showToast({ type: 'danger', title: 'Lỗi', message: 'Không xóa được địa chỉ' });
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await api.patch(`/users/me/addresses/${id}/default`);
      showToast({ type: 'success', title: 'Đã đặt làm mặc định' });
      fetchAddresses();
    } catch (e) {
      showToast({ type: 'danger', title: 'Lỗi', message: 'Cập nhật thất bại' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sổ địa chỉ</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý địa chỉ nhận hàng của bạn</p>
        </div>
        <button 
          onClick={() => setOpenModal(true)} 
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          <Plus size={18} /> Thêm địa chỉ mới
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"/>
            Đang tải dữ liệu...
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <MapPin size={32} />
            </div>
            <h3 className="text-gray-900 font-semibold">Chưa có địa chỉ nào</h3>
            <p className="text-gray-500 text-sm mt-1">Hãy thêm địa chỉ để việc thanh toán nhanh chóng hơn.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {list.map((item) => {
              const fullAddr = [item.detail, item.ward, item.district, item.province].filter(Boolean).join(', ');
              return (
                <div key={item._id || item.id} className={`group relative p-5 rounded-xl border-2 transition-all ${item.isDefault ? 'border-blue-500 bg-blue-50/30' : 'border-gray-100 hover:border-blue-200 hover:shadow-md'}`}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900 text-lg">{item.receiver || item.fullName}</span>
                        {item.isDefault && (
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 size={12}/> Mặc định
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded border border-gray-200 text-gray-500 text-xs bg-white">
                           {item.label}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm font-medium">{item.phone}</p>
                      <p className="text-gray-500 text-sm mt-1 flex items-start gap-1.5">
                        <MapPin size={16} className="shrink-0 mt-0.5 text-gray-400"/>
                        {fullAddr}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      {!item.isDefault && (
                        <button onClick={() => handleSetDefault(item._id || item.id)} className="text-xs px-3 py-1.5 font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          Đặt mặc định
                        </button>
                      )}
                      <button onClick={() => handleDelete(item._id || item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                        <Trash2 size={18}/>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddressModal open={openModal} onClose={() => setOpenModal(false)} onSave={handleAdd} user={user} />
    </div>
  );
}