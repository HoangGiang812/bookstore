import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../store/useAuth';
import { useUI } from '../../store/useUI';
import api, { getImageUrl } from '../../services/api';
import { 
  User, Calendar, Globe, Mail, Phone, Lock, Camera, 
  CheckCircle2
} from 'lucide-react';

/* =========================================================================================
   MODAL COMPONENTS (Giữ nguyên logic cũ, chỉ làm đẹp UI)
   ========================================================================================= */

function ModalShell({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">✕</button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="px-6 py-4 bg-gray-50 rounded-b-2xl border-t border-gray-100 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

function PhoneModal({ open, onClose, defaultValue = '', onUpdated }) {
  const { showToast } = useUI();
  const [phone, setPhone] = useState(defaultValue);

  useEffect(() => { if (open) setPhone(defaultValue || ''); }, [open, defaultValue]);

  const save = async () => {
    if (!phone.trim()) return showToast?.({ type: 'warning', title: 'Vui lòng nhập số điện thoại' });
    try {
      await api.patch('/users/me/phone', { phone: phone.trim() });
      onUpdated?.(phone.trim());
      showToast?.({ type: 'success', title: 'Cập nhật SĐT thành công' });
      onClose?.();
    } catch (e) {
      showToast?.({ type: 'danger', title: 'Lỗi', message: e?.message || 'Không cập nhật được SĐT' });
    }
  };

  return (
    <ModalShell 
      open={open} onClose={onClose} title="Cập nhật Số điện thoại" 
      footer={
        <>
          <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg" onClick={onClose}>Hủy</button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md" onClick={save}>Lưu thay đổi</button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Nhập số điện thoại mới để thuận tiện liên lạc.</p>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
            placeholder="09xxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} 
          />
        </div>
      </div>
    </ModalShell>
  );
}

function PasswordModal({ open, onClose }) {
  const { showToast } = useUI();
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const submit = async () => {
    if (!oldPwd || !newPwd || !confirmPwd) return showToast?.({ type: 'warning', title: 'Vui lòng điền đầy đủ thông tin' });
    if (newPwd !== confirmPwd) return showToast?.({ type: 'warning', title: 'Mật khẩu xác nhận không khớp' });
    
    try {
      await api.patch('/users/me/password', { oldPassword: oldPwd, newPassword: newPwd });
      showToast?.({ type: 'success', title: 'Đổi mật khẩu thành công' });
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
      onClose?.();
    } catch (e) {
      showToast?.({ type: 'danger', title: 'Thất bại', message: e?.message || 'Mật khẩu cũ không đúng' });
    }
  };

  return (
    <ModalShell 
      open={open} onClose={onClose} title="Đổi mật khẩu" 
      footer={
        <>
          <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg" onClick={onClose}>Hủy</button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md" onClick={submit}>Cập nhật</button>
        </>
      }
    >
      <div className="space-y-4">
        <input type="password" placeholder="Mật khẩu hiện tại" className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
          value={oldPwd} onChange={e => setOldPwd(e.target.value)} />
        <input type="password" placeholder="Mật khẩu mới" className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
          value={newPwd} onChange={e => setNewPwd(e.target.value)} />
        <input type="password" placeholder="Xác nhận mật khẩu mới" className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
          value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
      </div>
    </ModalShell>
  );
}

/* =========================================================================================
   MAIN SCREEN
   ========================================================================================= */

export default function AccountInfo() {
  const { user, setUser } = useAuth();
  const { showToast } = useUI();

  // --- Local State ---
  const [name, setName] = useState('');
  const [dob, setDob] = useState({ d: '', m: '', y: '' });
  const [gender, setGender] = useState('Nam');
  const [nation, setNation] = useState('Việt Nam');
  const [avatar, setAvatar] = useState('/avatar.png'); // Đường dẫn hiển thị (URL hoặc blob)
  const [userPhone, setUserPhone] = useState('');
  
  // --- Upload State ---
  const [avatarFile, setAvatarFile] = useState(null); // File thực tế để upload
  const fileRef = useRef(null);

  // --- Modals ---
  const [openPhone, setOpenPhone] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);

  // --- 1. Đồng bộ dữ liệu từ User Context vào State ---
  useEffect(() => {
    if (user) {
      setName(user.name || user.fullName || '');
      setDob(user.dob || { d: '', m: '', y: '' });
      setGender(user.gender || 'Nam');
      setNation(user.nation || 'Việt Nam');
      setAvatar(user.avatarUrl || user.avatar || '/avatar.png');
      setUserPhone(user.phone || '');
    }
  }, [user]);

  // --- 2. Gọi API lấy dữ liệu mới nhất khi vào trang ---
  useEffect(() => {
    (async () => {
      try {
        const me = await api.get('/users/me');
        setUser?.(me);
        // Cập nhật lại state cục bộ ngay lập tức để tránh delay
        setName(me.name || '');
        setDob(me.dob || { d: '', m: '', y: '' });
        setGender(me.gender || 'Nam');
        setNation(me.nation || 'Việt Nam');
        setAvatar(me.avatarUrl || me.avatar || '/avatar.png');
        setUserPhone(me.phone || '');
      } catch {}
    })();
  }, []); // Chỉ chạy 1 lần khi mount

  // --- Xử lý chọn ảnh ---
  const onPickAvatar = () => fileRef.current?.click();
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatar(URL.createObjectURL(f)); // Preview ngay lập tức
    setAvatarFile(f); // Lưu file để upload khi bấm Lưu
  };

  // --- Helper Upload ---
  const uploadAvatarIfNeeded = async () => {
    if (!avatarFile) return user?.avatarUrl || user?.avatar; // Không có file mới thì dùng cái cũ

    try {
      const formData = new FormData();
      formData.append('image', avatarFile);
      const res = await api.post('/upload', formData);
      
      let rawPath = res.path || res.url || res.data?.path;
      if (!rawPath && res.filename) rawPath = `/uploads/${res.filename}`;
      
      if (!rawPath) throw new Error("Server không trả về đường dẫn ảnh");
      
      // Chuẩn hóa đường dẫn
      const cleanPath = rawPath.replace(/\\/g, '/');
      return (cleanPath.startsWith('http') || cleanPath.startsWith('/')) ? cleanPath : `/${cleanPath}`;
    } catch (error) {
      throw new Error("Lỗi upload ảnh: " + error.message);
    }
  };

  // --- LƯU THAY ĐỔI ---
  const saveProfile = async () => {
    try {
      // 1. Upload ảnh (giữ nguyên)
      const finalAvatarPath = await uploadAvatarIfNeeded();

      // 2. Gửi API update (giữ nguyên)
      await api.patch('/users/me/profile', {
        name,
        avatar: finalAvatarPath,
        avatarUrl: finalAvatarPath,
        dob,
        gender,
        nation
      });

      // 3. Gọi lại API lấy thông tin mới nhất (giữ nguyên)
      const me = await api.get('/users/me');
      
      // ✅ CẬP NHẬT STATE REACT
      setUser?.(me);

      // 🔥 THÊM ĐOẠN NÀY: CẬP NHẬT LUÔN VÀO LOCAL STORAGE
      // (Giúp đồng bộ ngay lập tức mà không cần F5)
      try {
        const storageKey = 'bookstore_data_v1'; // Key lưu trữ của Zustand/App bạn
        const storedData = JSON.parse(localStorage.getItem(storageKey) || '{}');
        
        // Cập nhật state trong storage
        if (storedData.state) {
            storedData.state.user = me; 
            localStorage.setItem(storageKey, JSON.stringify(storedData));
        }
        
        // Kích hoạt sự kiện để Header tự vẽ lại (nếu Header có lắng nghe)
        window.dispatchEvent(new Event('storage')); 
      } catch (err) {
        console.error("Lỗi sync storage:", err);
      }
      
      setAvatarFile(null); 
      showToast?.({ type: 'success', title: 'Cập nhật hồ sơ thành công' });

      // ⚡ NẾU VẪN KHÔNG ĐỔI, DÙNG CHIÊU CUỐI: RELOAD NHẸ
      // (Bỏ comment dòng dưới nếu bạn muốn chắc chắn 100%)
      // setTimeout(() => window.location.reload(), 500); 

    } catch (e) {
      console.error(e);
      showToast?.({ type: 'danger', title: 'Lỗi', message: e?.message || 'Không lưu được thông tin' });
    }
  };

  // Data helpers
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const years = Array.from({ length: 80 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hồ sơ cá nhân</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý thông tin hồ sơ để bảo mật tài khoản</p>
        </div>
        <button 
          onClick={saveProfile} 
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          <CheckCircle2 size={18} /> Lưu thay đổi
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* --- CỘT TRÁI: THÔNG TIN CÁ NHÂN --- */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <User size={20} className="text-blue-600"/> Thông tin chung
            </h2>
            
            <div className="flex flex-col md:flex-row gap-8 items-start">
              
              {/* Avatar Uploader */}
              <div className="flex flex-col items-center gap-4 mx-auto md:mx-0">
                <div className="relative group cursor-pointer" onClick={onPickAvatar}>
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-100 relative">
                     <img 
                      src={avatar?.startsWith('blob:') ? avatar : getImageUrl(avatar)} 
                      onError={(e) => { e.currentTarget.src = '/avatar.png' }}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      alt="Avatar"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium text-xs">
                      Đổi ảnh
                    </div>
                  </div>
                  <button className="absolute bottom-1 right-1 p-2 bg-blue-600 text-white rounded-full shadow-md border-2 border-white hover:bg-blue-700">
                    <Camera size={16} />
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
                <p className="text-xs text-gray-400 text-center">Dụng lượng &lt; 1MB<br/>Định dạng: JPG, PNG</p>
              </div>

              {/* Form Fields */}
              <div className="flex-1 w-full grid gap-5">
                
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Họ & Tên</label>
                  <input 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={name} onChange={e => setName(e.target.value)} placeholder="Nhập họ tên"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 block">Ngày sinh</label>
                  <div className="flex gap-3"> {/* Tăng khoảng cách giữa các ô chọn */}
                       <select className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all" 
                         value={dob.d} onChange={e => setDob({ ...dob, d: e.target.value })}>
                         <option value="">Ngày</option>{days.map(d => <option key={d} value={d}>{d}</option>)}
                       </select>
                       <select className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all" 
                         value={dob.m} onChange={e => setDob({ ...dob, m: e.target.value })}>
                         <option value="">Tháng</option>{months.map(m => <option key={m} value={m}>{m}</option>)}
                       </select>
                       <select className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all" 
                         value={dob.y} onChange={e => setDob({ ...dob, y: e.target.value })}>
                         <option value="">Năm</option>{years.map(y => <option key={y} value={y}>{y}</option>)}
                       </select>
                  </div>
                </div>

                {/* Phần Giới tính */}
                <div className="space-y-2 mt-5"> {/* Thêm mt-5 để tạo khoảng cách với phần trên */}
                  <label className="text-sm font-semibold text-gray-700 block">Giới tính</label>
                  <div className="flex items-center gap-6 py-2"> {/* Tăng khoảng cách giữa các lựa chọn */}
                      {['Nam', 'Nữ', 'Khác'].map(g => (
                        <label key={g} className="inline-flex items-center gap-2 cursor-pointer group">
                          <input type="radio" name="gender" className="accent-blue-600 w-4 h-4 cursor-pointer" 
                            checked={gender === g} onChange={() => setGender(g)} />
                          <span className={`${gender === g ? 'text-blue-600 font-medium' : 'text-gray-700 group-hover:text-blue-600'} transition-colors`}>{g}</span>
                        </label>
                      ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Quốc tịch</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <select 
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                      value={nation} onChange={e => setNation(e.target.value)}
                    >
                      <option>Việt Nam</option><option>Hoa Kỳ</option><option>Nhật Bản</option><option>Hàn Quốc</option><option>Khác</option>
                    </select>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* --- CỘT PHẢI: LIÊN HỆ & BẢO MẬT --- */}
        <div className="space-y-6">
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
             <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Phone size={20} className="text-green-600"/> Liên hệ
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                 <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><Phone size={14}/></div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 font-medium uppercase">Số điện thoại</p>
                      <p className="text-sm font-semibold text-gray-800 truncate">{userPhone || 'Chưa có'}</p>
                    </div>
                 </div>
                 <button onClick={() => setOpenPhone(true)} className="text-xs font-semibold text-blue-600 hover:underline">Thay đổi</button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                 <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0"><Mail size={14}/></div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 font-medium uppercase">Email</p>
                      <p className="text-sm font-semibold text-gray-800 truncate">{user?.email}</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
             <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Lock size={20} className="text-rose-600"/> Bảo mật
            </h2>
            <div className="p-4 rounded-xl border border-rose-100 bg-rose-50 flex items-start gap-4">
               <div className="p-2 bg-white rounded-full shadow-sm text-rose-500"><Lock size={20}/></div>
               <div className="flex-1">
                 <h4 className="text-sm font-bold text-gray-800">Mật khẩu</h4>
                 <p className="text-xs text-gray-500 mt-1 mb-3">Đổi mật khẩu định kỳ để bảo vệ tài khoản.</p>
                 <button onClick={() => setOpenPassword(true)} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors">
                   Đổi mật khẩu
                 </button>
               </div>
            </div>
          </div>

        </div>
      </div>

      {/* Popup Modals */}
      <PhoneModal open={openPhone} onClose={() => setOpenPhone(false)} defaultValue={userPhone} 
        onUpdated={async (p) => { 
           setUserPhone(p); 
           try { const me = await api.get('/users/me'); setUser?.(me); } catch {} 
        }} 
      />
      <PasswordModal open={openPassword} onClose={() => setOpenPassword(false)} />
      
    </div>
  );
}