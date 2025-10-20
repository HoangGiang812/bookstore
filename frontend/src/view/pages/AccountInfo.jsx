// src/view/pages/AccountInfo.jsx
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/useAuth';
import { useUI } from '../../store/useUI';
import api from '../../services/api';

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

/* ------------ UI helpers ------------ */
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

/* ------------ SĐT: KHÔNG OTP ------------ */
function PhoneModal({open,onClose, defaultValue = '', onUpdated}) {
  const { showToast } = useUI();
  const [phone,setPhone] = useState(defaultValue);
  useEffect(()=>{ if (open) setPhone(defaultValue || ''); }, [open, defaultValue]);
  const save = async ()=>{
    if (!phone.trim()) return showToast?.({type:'warning',title:'Nhập số điện thoại'});
    try {
      await api.patch('/users/me/phone',{ phone: phone.trim() });
      onUpdated?.(phone.trim());
      showToast?.({type:'success',title:'Cập nhật SĐT thành công'});
      onClose?.();
    } catch (e) {
      showToast?.({type:'danger',title:'Không cập nhật được SĐT', message: e?.message || 'Lỗi không xác định'});
    }
  };
  return (
    <ModalShell open={open} onClose={onClose} title="Cập nhật số điện thoại" footer={<>
      <button className="btn bg-gray-100 hover:bg-gray-200" onClick={onClose}>Đóng</button>
      <button className="btn-primary" onClick={save}>Lưu</button>
    </>}>
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
    <ModalShell open={open} onClose={onClose} title="Đổi mật khẩu" footer={<>
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
    try { await api.patch('/users/me/pin',{ pin }); } catch { await api.patch('/users/me/profile',{ pin }); }
    showToast?.({type:'success',title:'Thiết lập PIN thành công'}); onClose?.();
  };
  return (
    <ModalShell open={open} onClose={onClose} title="Thiết lập mã PIN" footer={<>
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
  const submit = async ()=>{ try { await api.post('/users/me/delete-request',{ reason }); } catch {}
    showToast?.({type:'success',title:'Đã ghi nhận yêu cầu xoá tài khoản'}); onClose?.(); };
  return (
    <ModalShell open={open} onClose={onClose} title="Yêu cầu xoá tài khoản" footer={<>
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

export default function AccountInfo(){
  const { user, setUser } = useAuth();
  const { showToast } = useUI();

  const [name,setName]     = useState(user?.name || user?.fullName || '');
  const [dob,setDob]       = useState(user?.dob || { d:'', m:'', y:'' });
  const [gender,setGender] = useState(user?.gender || 'Nam');
  const [nation,setNation] = useState(user?.nation || 'Việt Nam');
  const [avatar,setAvatar] = useState(user?.avatarUrl || user?.avatar || '/avatar.png');
  const [avatarFile, setAvatarFile] = useState(null);
  const fileRef = useRef(null);
  const [userPhone, setUserPhone] = useState(user?.phone || '');

  useEffect(()=>{ 
    setUserPhone(user?.phone || '');
    setName(user?.name || user?.fullName || '');
    setDob(user?.dob || { d:'', m:'', y:'' });
    setGender(user?.gender || 'Nam');
    setNation(user?.nation || 'Việt Nam');
    setAvatar(user?.avatarUrl || user?.avatar || '/avatar.png');
  }, [user]);

  useEffect(()=>{ (async ()=>{ try {
      const me = await api.get('/users/me');
      setUser?.(me);
      setName(me?.name || '');
      setDob(me?.dob || { d:'', m:'', y:'' });
      setGender(me?.gender || 'Nam');
      setNation(me?.nation || 'Việt Nam');
      setAvatar(me?.avatarUrl || me?.avatar || '/avatar.png');
      setUserPhone(me?.phone || '');
    } catch {} })(); },[]);

  const onPickAvatar = ()=>fileRef.current?.click();
  const onFile = (e)=>{ const f=e.target.files?.[0]; if(!f) return; setAvatar(URL.createObjectURL(f)); setAvatarFile(f); };

  const uploadAvatarIfNeeded = async ()=>{
    if (!avatarFile) return user?.avatarUrl || user?.avatar || null;
    try {
      const form = new FormData(); form.append('avatar', avatarFile);
      const res = await api.post('/users/me/avatar', form, { headers: { 'Content-Type':'multipart/form-data' } });
      return res?.url || res?.avatarUrl || res?.data?.url || res?.data?.avatarUrl || null;
    } catch {}
    try {
      const form = new FormData(); form.append('file', avatarFile);
      const res = await api.post('/uploads', form, { headers: { 'Content-Type':'multipart/form-data' } });
      return res?.url || res?.path || res?.data?.url || null;
    } catch {}
    return user?.avatarUrl || user?.avatar || null;
  };

  const saveProfile = async ()=>{
    try{
      const avatarUrl = await uploadAvatarIfNeeded();
      await api.patch('/users/me/profile',{ name, avatar: avatarUrl, avatarUrl, dob, gender, nation });
      try { const me = await api.get('/users/me'); setUser?.(me); } catch {}
      setAvatarFile(null);
      showToast?.({ type:'success', title:'Đã lưu thay đổi' });
    }catch(e){
      showToast?.({ type:'danger', title:'Lưu thay đổi thất bại', message:e?.message || 'Lỗi không xác định' });
    }
  };

  const days = Array.from({length:31},(_,i)=>String(i+1));
  const months = Array.from({length:12},(_,i)=>String(i+1));
  const years = Array.from({length:80},(_,i)=>String(new Date().getFullYear()-i));

  const [openPhone,setOpenPhone] = useState(false);
  const [openPassword,setOpenPassword] = useState(false);
  const [openPin,setOpenPin] = useState(false);
  const [openDelete,setOpenDelete] = useState(false);

  return (
    <div className="container px-4 py-6 grid lg:grid-cols-[280px,1fr] gap-6">
      {/* Sidebar giống các trang khác */}
      <aside className="bg-white rounded-xl border shadow-sm">
        <div className="flex items-center gap-3 px-4 py-4 border-b">
          <div className="w-10 h-10 rounded-full bg-gray-100 grid place-items-center">👤</div>
          <div>
            <div className="text-xs text-gray-500">Tài khoản của</div>
            <div className="font-semibold">{user?.name || user?.email || "Bạn"}</div>
          </div>
        </div>
        <nav className="p-2 text-[15px]">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100 font-medium">
            <span className="w-6 text-center">👤</span> Thông tin tài khoản
          </div>
          <Link to="/account/reviews" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
            <span className="w-6 text-center">⭐</span> Đánh giá sản phẩm
          </Link>
          <Link to="/account/comments" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
            <span className="w-6 text-center">💬</span> Nhận xét của tôi
          </Link>
          <Link to="/account/addresses" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
            <span className="w-6 text-center">📍</span> Sổ địa chỉ
          </Link>
          <Link to="/orders" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
            <span className="w-6 text-center">🧾</span> Quản lý đơn hàng
          </Link>
        </nav>
      </aside>

      {/* Content */}
      <section className="bg-white rounded-xl border shadow-sm p-5">
        <h1 className="text-2xl font-bold mb-6">Thông tin tài khoản</h1>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <div className="text-lg font-semibold mb-4">Thông tin cá nhân</div>
            <div className="grid md:grid-cols-3 gap-6 items-start">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <img src={avatar} onError={(e)=>{e.currentTarget.src='/avatar.png'}} className="w-32 h-32 rounded-full object-cover border shadow-sm" />
                  <button onClick={onPickAvatar} className="absolute -bottom-2 -right-2 px-2 py-1 rounded-full text-xs bg-gray-100 hover:bg-gray-200 border" title="Đổi ảnh">✎</button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile}/>
              </div>

              <div className="md:col-span-2 space-y-4">
                <Field label="Họ & Tên"><input className="input w-full" value={name} onChange={e=>setName(e.target.value)} /></Field>

                <div>
                  <div className="text-sm font-medium mb-1">Ngày sinh</div>
                  <div className="grid grid-cols-3 gap-3">
                    <select className="input w-full" value={dob.d} onChange={e=>setDob({...dob,d:e.target.value})}><option value="">Ngày</option>{days.map(d=><option key={d} value={d}>{d}</option>)}</select>
                    <select className="input w-full" value={dob.m} onChange={e=>setDob({...dob,m:e.target.value})}><option value="">Tháng</option>{months.map(m=><option key={m} value={m}>{m}</option>)}</select>
                    <select className="input w-full" value={dob.y} onChange={e=>setDob({...dob,y:e.target.value})}><option value="">Năm</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">Giới tính</div>
                  <div className="flex items-center gap-6">
                    {['Nam','Nữ','Khác'].map(g=>(
                      <label key={g} className="inline-flex items-center gap-2">
                        <input type="radio" name="gender" className="accent-purple-600" checked={gender===g} onChange={()=>setGender(g)} />
                        {g}
                      </label>
                    ))}
                  </div>
                </div>

                <Field label="Quốc tịch">
                  <select className="input w-full" value={nation} onChange={e=>setNation(e.target.value)}>
                    <option>Việt Nam</option><option>Hoa Kỳ</option><option>Nhật Bản</option><option>Khác</option>
                  </select>
                </Field>

                <button onClick={saveProfile} className="btn-primary mt-2">Lưu thay đổi</button>
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <div className="text-lg font-semibold">Số điện thoại và Email</div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div><div className="font-medium">Số điện thoại</div><div className="text-gray-600 text-sm">{userPhone || 'Chưa cập nhật'}</div></div>
              <button className="btn bg-gray-100 hover:bg-gray-200" onClick={()=>setOpenPhone(true)}>Cập nhật</button>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div><div className="font-medium">Địa chỉ email</div><div className="text-gray-600 text-sm">{user?.email || 'Thêm địa chỉ email'}</div></div>
              <button className="btn bg-gray-100 hover:bg-gray-200" disabled>Cập nhật</button>
            </div>

            <div className="text-lg font-semibold pt-2">Bảo mật</div>
            <div className="flex items-center justify-between p-3 border rounded-lg"><div className="font-medium">Thiết lập mật khẩu</div><button className="btn bg-gray-100 hover:bg-gray-200" onClick={()=>setOpenPassword(true)}>Cập nhật</button></div>
            <div className="flex items-center justify-between p-3 border rounded-lg"><div className="font-medium">Thiết lập mã PIN</div><button className="btn bg-gray-100 hover:bg-gray-200" onClick={()=>setOpenPin(true)}>Thiết lập</button></div>
            <div className="flex items-center justify-between p-3 border rounded-lg"><div className="font-medium">Yêu cầu xoá tài khoản</div><button className="btn bg-gray-100 hover:bg-gray-200" onClick={()=>setOpenDelete(true)}>Yêu cầu</button></div>
          </div>
        </div>

        <PhoneModal open={openPhone} onClose={()=>setOpenPhone(false)} defaultValue={userPhone} onUpdated={async (p)=>{ setUserPhone(p); try{ const me=await api.get('/users/me'); setUser?.(me);}catch{}}} />
        <PasswordModal open={openPassword} onClose={()=>setOpenPassword(false)} />
        <PinModal open={openPin} onClose={()=>setOpenPin(false)} />
        <DeleteRequestModal open={openDelete} onClose={()=>setOpenDelete(false)} />
      </section>
    </div>
  );
}
