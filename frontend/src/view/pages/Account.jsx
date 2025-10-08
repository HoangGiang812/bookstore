// src/view/pages/Account.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../store/useAuth';
import { useUI } from '../../store/useUI';
import api from '../../services/api'; // <-- dùng api client chuẩn

/* ------------- LocalStorage helpers (per-user) ------------- */
const keyNew = (uid)=>`demo_addresses_${uid||'guest'}`;
const keyLegacy = (uid)=>`addr_${uid||'guest'}`;
const readJSON = (k)=>{ try{return JSON.parse(localStorage.getItem(k)||'[]')}catch{return[]} };
const writeJSON = (k,v)=>{ try{localStorage.setItem(k,JSON.stringify(v||[]))}catch{} };

const normalize = (a)=>{
  if(!a) return null;
  const id = String(a._id || a.id || Date.now());
  return {
    id, _id:a._id,
    label: a.label || a.tag || 'Nhà riêng',
    receiver: a.receiver || a.fullName || '',
    phone: a.phone || '',
    province: a.province || a.city || '',
    district: a.district || '',
    ward: a.ward || '',
    detail: a.detail || a.address || '',
    isDefault: !!a.isDefault,
  };
};

const LS = {
  load(uid){
    const k = keyNew(uid);
    let list = readJSON(k);
    if((!Array.isArray(list) || list.length===0)){
      const legacy = readJSON(keyLegacy(uid));
      if(Array.isArray(legacy) && legacy.length){
        list = legacy;
        writeJSON(k, list);
      }
    }
    return (list||[]).map(normalize).filter(Boolean);
  },
  save(uid, list){
    const arr = (list||[]).map(normalize).filter(Boolean);
    if(arr.length && !arr.some(x=>x.isDefault)) arr[0].isDefault = true;
    writeJSON(keyNew(uid), arr);
    try{ window.dispatchEvent(new Event('addresses:changed')); }catch{}
    return arr;
  }
};

const addressApi = (uid)=>({
  async list(){
    try{
      const d = await api.get('/users/me/addresses');
      const items = Array.isArray(d) ? d : (d?.items || []);
      LS.save(uid, items);
      return items;
    }catch{
      return LS.load(uid);
    }
  },
  async add(a){
    try{
      const res = await api.post('/users/me/addresses', a);
      try{
        const full = await api.get('/users/me/addresses');
        LS.save(uid, Array.isArray(full)?full:(full?.items||[]));
      }catch{}
      try{ window.dispatchEvent(new Event('addresses:changed')); }catch{}
      return res;
    }catch{
      const list = LS.load(uid);
      const id = String(Date.now());
      const item = { ...a, _id:id, id, isDefault: !!a.isDefault };
      const next = a.isDefault ? list.map(x=>({ ...x, isDefault:false })) : list.slice();
      next.unshift(item);
      LS.save(uid, next);
      return { _id:id };
    }
  },
  async remove(id){
    try{
      const r = await api.delete(`/users/me/addresses/${id}`);
      try{
        const full = await api.get('/users/me/addresses');
        LS.save(uid, Array.isArray(full)?full:(full?.items||[]));
      }catch{}
      try{ window.dispatchEvent(new Event('addresses:changed')); }catch{}
      return r;
    }catch{
      let list = LS.load(uid).filter(x=>String(x._id||x.id)!==String(id));
      if(list.length && !list.some(x=>x.isDefault)) list[0].isDefault = true;
      LS.save(uid, list);
      return { ok:1 };
    }
  },
  async setDefault(id){
    try{
      const r = await api.patch(`/users/me/addresses/${id}/default`, { isDefault:true });
      try{
        const full = await api.get('/users/me/addresses');
        LS.save(uid, Array.isArray(full)?full:(full?.items||[]));
      }catch{}
      try{ window.dispatchEvent(new Event('addresses:changed')); }catch{}
      return r;
    }catch{
      const list = LS.load(uid).map(x=>({ ...x, isDefault:String(x._id||x.id)===String(id) }));
      LS.save(uid, list);
      return { ok:1 };
    }
  }
});

/* ----------------- Gợi ý địa điểm VN ----------------- */
const VN_PROVINCES = [
  'Hồ Chí Minh','Hà Nội','Đà Nẵng','Hải Phòng','Cần Thơ',
  'Bình Dương','Đồng Nai','Khánh Hòa','Lâm Đồng','Quảng Ninh',
  'Bà Rịa - Vũng Tàu','Bắc Ninh','Bắc Giang','Thừa Thiên Huế','An Giang'
];
const DISTRICTS = {
  'Hồ Chí Minh': ['Quận 1','Quận 3','Quận 5','Quận 7','Bình Thạnh','Gò Vấp','Tân Bình','Phú Nhuận','Thủ Đức'],
  'Hà Nội': ['Ba Đình','Hoàn Kiếm','Cầu Giấy','Đống Đa','Hai Bà Trưng','Thanh Xuân','Bắc Từ Liêm','Nam Từ Liêm'],
  'Đà Nẵng': ['Hải Châu','Thanh Khê','Sơn Trà','Ngũ Hành Sơn','Liên Chiểu','Cẩm Lệ'],
};
const WARDS = {
  'Hồ Chí Minh': {
    'Quận 1': ['Bến Nghé','Bến Thành','Cầu Ông Lãnh','Cô Giang','Đa Kao','Nguyễn Thái Bình','Tân Định'],
    'Bình Thạnh': ['Phường 1','Phường 2','Phường 5','Phường 7','Phường 11','Phường 12','Phường 14'],
  },
  'Hà Nội': {
    'Ba Đình': ['Điện Biên','Kim Mã','Cống Vị','Giảng Võ','Liễu Giai'],
    'Cầu Giấy': ['Dịch Vọng','Dịch Vọng Hậu','Quan Hoa','Nghĩa Tân','Nghĩa Đô'],
  },
  'Đà Nẵng': {
    'Hải Châu': ['Hải Châu 1','Hải Châu 2','Bình Hiên','Thạch Thang','Nam Dương'],
  }
};

/* ----------------- UI helpers ----------------- */
function Field({label, required, children}) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-1">
        {label}{' '}{required && <span className="text-rose-600">*</span>}
      </div>
      {children}
    </label>
  );
}

/* ----------------- Modal thêm địa chỉ ----------------- */
function AddressModal({ open, onClose, onSave, user }) {
  const { showToast } = useUI();
  const [f,setF] = useState({
    label:'Nhà riêng',
    receiver: user?.name || user?.fullName || '',
    phone: user?.phone || '',
    province:'', district:'', ward:'', detail:'',
    isDefault:false,
  });

  const districts = DISTRICTS[f.province] || [];
  const wards = (WARDS[f.province] && WARDS[f.province][f.district]) || [];

  useEffect(()=>{ if(open){
    setF({
      label:'Nhà riêng',
      receiver: user?.name || user?.fullName || '',
      phone: user?.phone || '',
      province:'', district:'', ward:'', detail:'',
      isDefault:false,
    });
  }},[open,user]);

  const save = async ()=>{
    if(!f.receiver.trim() || !f.phone.trim() || !f.province.trim() || !f.detail.trim()){
      showToast?.({ type:'warning', title:'Thiếu thông tin', message:'Vui lòng nhập các trường bắt buộc.' });
      return;
    }
    await onSave(f);
    onClose?.();
  };

  if(!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="text-xl font-semibold">Thêm địa chỉ</div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Nhãn">
              <input className="input w-full" placeholder="Nhà riêng / Cơ quan"
                     value={f.label} onChange={e=>setF({...f,label:e.target.value})}/>
            </Field>

            <Field label="Người nhận" required>
              <input className="input w-full" placeholder="Nguyễn Văn A"
                     value={f.receiver} onChange={e=>setF({...f,receiver:e.target.value})}/>
            </Field>

            <Field label="Số điện thoại" required>
              <input className="input w/full" placeholder="09xxxxxxxx"
                     value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/>
            </Field>

            <Field label="Tỉnh/Thành" required>
              <input
                className="input w-full"
                list="vn-provinces"
                placeholder="TP.HCM / Hà Nội / …"
                value={f.province}
                onChange={e=>setF({ ...f, province:e.target.value, district:'', ward:'' })}
              />
              <datalist id="vn-provinces">
                {VN_PROVINCES.map(p=> <option key={p} value={p} />)}
              </datalist>
            </Field>

            <Field label="Quận/Huyện">
              <input
                className="input w/full"
                list="vn-districts"
                placeholder="Q1 / Bình Thạnh / …"
                value={f.district}
                onChange={e=>setF({ ...f, district:e.target.value, ward:'' })}
                disabled={!f.province}
              />
              <datalist id="vn-districts">
                {districts.map(d=> <option key={d} value={d} />)}
              </datalist>
            </Field>

            <Field label="Phường/Xã">
              <input
                className="input w/full"
                list="vn-wards"
                placeholder="Bến Nghé / …"
                value={f.ward}
                onChange={e=>setF({ ...f, ward:e.target.value })}
                disabled={!f.district}
              />
              <datalist id="vn-wards">
                {wards.map(w=> <option key={w} value={w} />)}
              </datalist>
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Địa chỉ chi tiết" required>
              <input className="input w/full" placeholder="123 Lê Lợi…"
                     value={f.detail} onChange={e=>setF({...f,detail:e.target.value})}/>
            </Field>
          </div>

          <label className="mt-4 inline-flex items-center gap-2 select-none">
            <input type="checkbox" className="accent-purple-600"
                   checked={!!f.isDefault} onChange={e=>setF({...f,isDefault:e.target.checked})}/>
            Đặt làm địa chỉ mặc định
          </label>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn bg-gray-100 hover:bg-gray-200">Huỷ</button>
          <button onClick={save} className="btn-primary">Lưu địa chỉ</button>
        </div>
      </div>
    </div>
  );
}

/* ------------ Modal shell dùng chung ------------ */
function ModalShell({open,title,onClose,children,footer}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="text-xl font-semibold">{title}</div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>
        <div className="p-6">{children}</div>
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">{footer}</div>
      </div>
    </div>
  );
}

/* ------------ SĐT: KHÔNG OTP ------------ */
function PhoneModal({open,onClose, defaultValue = '', onUpdated}) {
  const { showToast } = useUI();
  const [phone,setPhone] = useState(defaultValue);

  useEffect(()=>{ if (open) setPhone(defaultValue || ''); }, [open, defaultValue]);

  const save = async ()=>{
    if (!phone.trim()) return showToast?.({type:'warning',title:'Nhập số điện thoại'});
    try {
      await api.patch('/users/me/phone',{ phone: phone.trim() });
      onUpdated?.(phone.trim()); // cập nhật UI ngay
      showToast?.({type:'success',title:'Cập nhật SĐT thành công'});
      onClose?.();
    } catch (e) {
      showToast?.({type:'danger',title:'Không cập nhật được SĐT', message: e?.message || 'Lỗi không xác định'});
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Cập nhật số điện thoại"
      footer={
        <>
          <button className="btn bg-gray-100 hover:bg-gray-200" onClick={onClose}>Đóng</button>
          <button className="btn-primary" onClick={save}>Lưu</button>
        </>
      }>
      <label className="block">
        <div className="text-sm font-medium mb-1">Số điện thoại</div>
        <input className="input w-full" placeholder="09xxxxxxxx" value={phone} onChange={e=>setPhone(e.target.value)} />
      </label>
    </ModalShell>
  );
}

/* ------------ Đổi mật khẩu ------------ */
function PasswordModal({open,onClose}) {
  const { showToast } = useUI();
  const [oldPwd,setOldPwd] = useState('');
  const [newPwd,setNewPwd] = useState('');
  const [confirmPwd,setConfirmPwd] = useState('');

  const submit = async ()=>{
    if (!oldPwd || !newPwd || !confirmPwd) return showToast?.({type:'warning',title:'Điền đủ các trường'});
    if (newPwd !== confirmPwd) return showToast?.({type:'warning',title:'Xác nhận mật khẩu không khớp'});
    try {
      await api.patch('/users/me/password',{ oldPassword:oldPwd, newPassword:newPwd });
      showToast?.({type:'success',title:'Đổi mật khẩu thành công'});
      onClose?.();
    } catch (e) {
      showToast?.({type:'danger',title:'Đổi mật khẩu thất bại', message:e?.message || 'Lỗi không xác định'});
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Đổi mật khẩu"
      footer={<>
        <button className="btn bg-gray-100 hover:bg-gray-200" onClick={onClose}>Huỷ</button>
        <button className="btn-primary" onClick={submit}>Lưu</button>
      </>}>
      <label className="block mb-3">
        <div className="text-sm font-medium mb-1">Mật khẩu hiện tại</div>
        <input type="password" className="input w-full" autoComplete="current-password" value={oldPwd} onChange={e=>setOldPwd(e.target.value)}/>
      </label>
      <label className="block mb-3">
        <div className="text-sm font-medium mb-1">Mật khẩu mới</div>
        <input type="password" className="input w-full" autoComplete="new-password" name="new-password" value={newPwd} onChange={e=>setNewPwd(e.target.value)}/>
      </label>
      <label className="block">
        <div className="text-sm font-medium mb-1">Xác nhận mật khẩu mới</div>
        <input type="password" className="input w-full" autoComplete="new-password" name="confirm-new-password" value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)}/>
      </label>
    </ModalShell>
  );
}

/* ------------ PIN ------------ */
function PinModal({open,onClose}) {
  const { showToast } = useUI();
  const [pin,setPin] = useState('');
  const [confirm,setConfirm] = useState('');

  const submit = async ()=>{
    if (!/^\d{4,6}$/.test(pin)) return showToast?.({type:'warning',title:'PIN phải 4–6 chữ số'});
    if (pin !== confirm) return showToast?.({type:'warning',title:'Xác nhận PIN không khớp'});
    try {
      await api.patch('/users/me/pin',{ pin });
    } catch {
      await api.patch('/users/me/profile',{ pin });
    }
    showToast?.({type:'success',title:'Thiết lập PIN thành công'});
    onClose?.();
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Thiết lập mã PIN"
      footer={<>
        <button className="btn bg-gray-100 hover:bg-gray-200" onClick={onClose}>Huỷ</button>
        <button className="btn-primary" onClick={submit}>Lưu</button>
      </>}>
      <label className="block mb-3">
        <div className="text-sm font-medium mb-1">PIN mới</div>
        <input className="input w-full" placeholder="4–6 chữ số" value={pin} onChange={e=>setPin(e.target.value)} />
      </label>
      <label className="block">
        <div className="text-sm font-medium mb-1">Xác nhận PIN</div>
        <input className="input w-full" value={confirm} onChange={e=>setConfirm(e.target.value)} />
      </label>
    </ModalShell>
  );
}

function DeleteRequestModal({open,onClose}) {
  const { showToast } = useUI();
  const [reason,setReason] = useState('');

  const submit = async ()=>{
    try { await api.post('/users/me/delete-request',{ reason }); } catch {}
    showToast?.({type:'success',title:'Đã ghi nhận yêu cầu xoá tài khoản'});
    onClose?.();
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Yêu cầu xoá tài khoản"
      footer={<>
        <button className="btn bg-gray-100 hover:bg-gray-200" onClick={onClose}>Huỷ</button>
        <button className="btn-primary" onClick={submit}>Gửi yêu cầu</button>
      </>}>
      <label className="block">
        <div className="text-sm font-medium mb-1">Lý do (không bắt buộc)</div>
        <textarea className="input w-full min-h-[96px]" placeholder="Bạn muốn chúng tôi xoá tài khoản vì…" value={reason} onChange={e=>setReason(e.target.value)} />
      </label>
      <p className="text-xs text-gray-500 mt-3">Hành động này chưa xoá ngay. Chúng tôi sẽ xác minh trước khi xử lý.</p>
    </ModalShell>
  );
}

/* ======================== Account Page ======================== */
export default function Account(){
  const { user, setUser } = useAuth();
  const { showToast } = useUI();
  const uid = useMemo(()=>String(user?._id||user?.id||''),[user]);
  const apiAddr = useMemo(()=>addressApi(uid),[uid]);

  /* -------- Hồ sơ -------- */
  const [name,setName]     = useState(user?.name || user?.fullName || '');
  const [dob,setDob]       = useState(user?.dob || { d:'', m:'', y:'' });
  const [gender,setGender] = useState(user?.gender || 'Nam');
  const [nation,setNation] = useState(user?.nation || 'Việt Nam');
  const [avatar,setAvatar] = useState(user?.avatarUrl || user?.avatar || '/avatar.png');
  const [avatarFile, setAvatarFile] = useState(null);
  const fileRef = useRef(null);

  // hiển thị SĐT để cập nhật ngay khi lưu
  const [userPhone, setUserPhone] = useState(user?.phone || '');
  useEffect(()=>{ 
    setUserPhone(user?.phone || '');
    setName(user?.name || user?.fullName || '');
    setDob(user?.dob || { d:'', m:'', y:'' });
    setGender(user?.gender || 'Nam');
    setNation(user?.nation || 'Việt Nam');
    setAvatar(user?.avatarUrl || user?.avatar || '/avatar.png');
  }, [user]);

  // HYDRATE khi mở trang (đảm bảo sau F5 có dữ liệu từ BE)
  useEffect(()=>{
    (async ()=>{
      try {
        const me = await api.get('/users/me');
        setUser?.(me);
        // đồng bộ state cục bộ theo BE
        setName(me?.name || '');
        setDob(me?.dob || { d:'', m:'', y:'' });
        setGender(me?.gender || 'Nam');
        setNation(me?.nation || 'Việt Nam');
        setAvatar(me?.avatarUrl || me?.avatar || '/avatar.png');
        setUserPhone(me?.phone || '');
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // chạy 1 lần

  const onPickAvatar = ()=>fileRef.current?.click();
  const onFile = (e)=>{
    const f=e.target.files?.[0];
    if(!f) return;
    setAvatar(URL.createObjectURL(f)); // preview
    setAvatarFile(f);                  // để upload khi lưu
  };

  // Upload avatar -> trả URL
  const uploadAvatarIfNeeded = async ()=>{
    if (!avatarFile) return user?.avatarUrl || user?.avatar || null;
    try {
      const form = new FormData();
      form.append('avatar', avatarFile);
      const res = await api.post('/users/me/avatar', form, { headers: { 'Content-Type':'multipart/form-data' } });
      const url = res?.url || res?.avatarUrl || res?.data?.url || res?.data?.avatarUrl;
      if (url) return url;
    } catch {}
    try {
      const form = new FormData();
      form.append('file', avatarFile);
      const res = await api.post('/uploads', form, { headers: { 'Content-Type':'multipart/form-data' } });
      const url = res?.url || res?.path || res?.data?.url;
      if (url) return url;
    } catch {}
    return user?.avatarUrl || user?.avatar || null;
  };

  const saveProfile = async ()=>{
    try{
      const avatarUrl = await uploadAvatarIfNeeded();
      await api.patch('/users/me/profile',{ name, avatar: avatarUrl, avatarUrl, dob, gender, nation });

      // Refetch user từ BE để lưu bền qua reload
      try {
        const me = await api.get('/users/me');
        setUser?.(me);
        setName(me?.name || '');
        setDob(me?.dob || { d:'', m:'', y:'' });
        setGender(me?.gender || 'Nam');
        setNation(me?.nation || 'Việt Nam');
        setAvatar(me?.avatarUrl || me?.avatar || '/avatar.png');
        setUserPhone(me?.phone || '');
        setAvatarFile(null);
      } catch {}
      showToast?.({ type:'success', title:'Đã lưu thay đổi' });
    }catch(e){
      showToast?.({ type:'danger', title:'Lưu thay đổi thất bại', message:e?.message || 'Lỗi không xác định' });
    }
  };

  /* -------- Sổ địa chỉ -------- */
  const [list,setList] = useState([]);
  const [loading,setLoading] = useState(true);
  const [openModal,setOpenModal] = useState(false);

  /* -------- Bảo mật -------- */
  const [openPhone,setOpenPhone] = useState(false);
  const [openPassword,setOpenPassword] = useState(false);
  const [openPin,setOpenPin] = useState(false);
  const [openDelete,setOpenDelete] = useState(false);

  const reload = async ()=>{
    setLoading(true);
    try{
      const items = await apiAddr.list();
      setList(items);
    } finally { setLoading(false); }
  };

  useEffect(()=>{ reload(); },[apiAddr]);

  const addAddress = async (a)=>{ await apiAddr.add(a); await reload(); showToast?.({type:'success', title:'Đã thêm địa chỉ'}); };
  const removeAddress = async (id)=>{ if(!confirm('Xoá địa chỉ này?')) return; await apiAddr.remove(id); await reload(); };
  const setDefault = async (id)=>{ await apiAddr.setDefault(id); await reload(); };

  const days = Array.from({length:31},(_,i)=>String(i+1));
  const months = Array.from({length:12},(_,i)=>String(i+1));
  const years = Array.from({length:80},(_,i)=>String(new Date().getFullYear()-i));

  return (
    <div className="container px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Thông tin tài khoản</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="text-lg font-semibold mb-4">Thông tin cá nhân</div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <img
                  src={avatar}
                  onError={(e)=>{e.currentTarget.src='/avatar.png'}}
                  className="w-32 h-32 rounded-full object-cover border shadow-sm"
                />
                <button
                  onClick={onPickAvatar}
                  className="absolute -bottom-2 -right-2 px-2 py-1 rounded-full text-xs bg-gray-100 hover:bg-gray-200 border"
                  title="Đổi ảnh"
                >
                  ✎
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile}/>
            </div>

            <div className="md:col-span-2 space-y-4">
              <Field label="Họ & Tên">
                <input className="input w-full" value={name} onChange={e=>setName(e.target.value)} />
              </Field>

              <div>
                <div className="text-sm font-medium mb-1">Ngày sinh</div>
                <div className="grid grid-cols-3 gap-3">
                  <select className="input w/full" value={dob.d} onChange={e=>setDob({...dob,d:e.target.value})}>
                    <option value="">Ngày</option>
                    {days.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                  <select className="input w/full" value={dob.m} onChange={e=>setDob({...dob,m:e.target.value})}>
                    <option value="">Tháng</option>
                    {months.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                  <select className="input w/full" value={dob.y} onChange={e=>setDob({...dob,y:e.target.value})}>
                    <option value="">Năm</option>
                    {years.map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-1">Giới tính</div>
                <div className="flex items-center gap-6">
                  {['Nam','Nữ','Khác'].map(g=>(
                    <label key={g} className="inline-flex items-center gap-2">
                      <input type="radio" name="gender" className="accent-purple-600"
                             checked={gender===g} onChange={()=>setGender(g)} />
                      {g}
                    </label>
                  ))}
                </div>
              </div>

              <Field label="Quốc tịch">
                <select className="input w-full" value={nation} onChange={e=>setNation(e.target.value)}>
                  <option>Việt Nam</option>
                  <option>Hoa Kỳ</option>
                  <option>Nhật Bản</option>
                  <option>Khác</option>
                </select>
              </Field>

              <button onClick={saveProfile} className="btn-primary mt-2">Lưu thay đổi</button>
            </div>
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <div className="text-lg font-semibold">Số điện thoại và Email</div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">Số điện thoại</div>
              <div className="text-gray-600 text-sm">{userPhone || 'Chưa cập nhật'}</div>
            </div>
            <button className="btn bg-gray-100 hover:bg-gray-200" onClick={()=>setOpenPhone(true)}>Cập nhật</button>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">Địa chỉ email</div>
              <div className="text-gray-600 text-sm">{user?.email || 'Thêm địa chỉ email'}</div>
            </div>
            <button className="btn bg-gray-100 hover:bg-gray-200" disabled>Cập nhật</button>
          </div>

          <div className="text-lg font-semibold pt-2">Bảo mật</div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="font-medium">Thiết lập mật khẩu</div>
            <button className="btn bg-gray-100 hover:bg-gray-200" onClick={()=>setOpenPassword(true)}>Cập nhật</button>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="font-medium">Thiết lập mã PIN</div>
            <button className="btn bg-gray-100 hover:bg-gray-200" onClick={()=>setOpenPin(true)}>Thiết lập</button>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="font-medium">Yêu cầu xoá tài khoản</div>
            <button className="btn bg-gray-100 hover:bg-gray-200" onClick={()=>setOpenDelete(true)}>Yêu cầu</button>
          </div>
        </div>
      </div>

      {/* Sổ địa chỉ */}
      <div className="card p-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Sổ địa chỉ</div>
          <button onClick={()=>setOpenModal(true)} className="btn-primary">+ Thêm địa chỉ</button>
        </div>

        {loading ? (
          <div className="text-gray-500">Đang tải…</div>
        ) : list.length===0 ? (
          <div className="text-gray-600">Chưa có địa chỉ</div>
        ) : (
          <div className="space-y-3">
            {list.map(a=>{
              const id=String(a._id||a.id);
              return (
                <div key={id} className="p-3 border rounded-lg flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <b>{a.receiver||'Người nhận'}</b>
                      {a.isDefault && <span className="text-xs px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">Mặc định</span>}
                    </div>
                    {a.phone && <div className="text-sm text-gray-600">{a.phone}</div>}
                    <div className="text-sm text-gray-600">{[a.detail,a.ward,a.district,a.province].filter(Boolean).join(', ')}</div>
                    {a.label && <div className="text-xs text-gray-500 mt-1">Nhãn: {a.label}</div>}
                  </div>
                  <div className="flex gap-2">
                    {!a.isDefault && (
                      <button onClick={()=>setDefault(id)} className="btn bg-gray-100 hover:bg-gray-200">Đặt mặc định</button>
                    )}
                    <button onClick={()=>removeAddress(id)} className="btn bg-gray-100 hover:bg-gray-200">Xoá</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddressModal open={openModal} onClose={()=>setOpenModal(false)} onSave={addAddress} user={user}/>
      <PhoneModal
        open={openPhone}
        onClose={()=>setOpenPhone(false)}
        defaultValue={userPhone}
        onUpdated={async (p)=>{
          setUserPhone(p);
          try {
            const me = await api.get('/users/me');
            setUser?.(me);
          } catch {}
        }}
      />
      <PasswordModal open={openPassword} onClose={()=>setOpenPassword(false)} />
      <PinModal open={openPin} onClose={()=>setOpenPin(false)} />
      <DeleteRequestModal open={openDelete} onClose={()=>setOpenDelete(false)} />
    </div>
  );
}
