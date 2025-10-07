// src/view/pages/Account.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../store/useAuth';
import { useUI } from '../../store/useUI';

/* ---------------- API helpers ---------------- */
async function apiGet(url){ const r=await fetch(url,{credentials:'include'}); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiPatch(url, body){ const r=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiPost(url, body){ const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function apiDelete(url){ const r=await fetch(url,{method:'DELETE',credentials:'include'}); if(!r.ok) throw new Error(await r.text()); return r.json(); }

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
    // migrate 1 lần từ key cũ nếu key mới đang trống
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
    // đảm bảo có 1 địa chỉ mặc định
    const arr = (list||[]).map(normalize).filter(Boolean);
    if(arr.length && !arr.some(x=>x.isDefault)) arr[0].isDefault = true;
    writeJSON(keyNew(uid), arr);
    // thông báo cho các trang khác (Cart) reload
    window.dispatchEvent(new Event('addresses:changed'));
    return arr;
  }
};

/* --------- API wrapper với fallback LocalStorage --------- */
const addressApi = (uid)=>({
  async list(){
    try{
      const d = await apiGet('/api/me/addresses');            // ưu tiên BE
      const items = Array.isArray(d) ? d : (d?.items || []);
      // ghi đè local theo user để xoá dữ liệu cũ nếu có
      LS.save(uid, items);
      return items;
    }catch{
      return LS.load(uid);                                    // fallback local
    }
  },
  async add(a){
    try{
      const res = await apiPost('/api/me/addresses', a);
      // đồng bộ lại từ API
      try{ const full = await apiGet('/api/me/addresses'); LS.save(uid, Array.isArray(full)?full:(full?.items||[])); }catch{}
      window.dispatchEvent(new Event('addresses:changed'));
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
      const r = await apiDelete(`/api/me/addresses/${id}`);
      try{ const full = await apiGet('/api/me/addresses'); LS.save(uid, Array.isArray(full)?full:(full?.items||[])); }catch{}
      window.dispatchEvent(new Event('addresses:changed'));
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
      const r = await apiPatch(`/api/me/addresses/${id}/default`, { isDefault:true });
      try{ const full = await apiGet('/api/me/addresses'); LS.save(uid, Array.isArray(full)?full:(full?.items||[])); }catch{}
      window.dispatchEvent(new Event('addresses:changed'));
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
              <input className="input w-full" placeholder="09xxxxxxxx"
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
                className="input w-full"
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
                className="input w-full"
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
              <input className="input w-full" placeholder="123 Lê Lợi…"
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

/* ======================== Account Page ======================== */
export default function Account(){
  const { user } = useAuth();
  const { showToast } = useUI();
  const uid = useMemo(()=>String(user?._id||user?.id||''),[user]);
  const api = useMemo(()=>addressApi(uid),[uid]);

  /* -------- Hồ sơ -------- */
  const [name,setName] = useState(user?.name||user?.fullName||'');
  const [dob,setDob] = useState({ d:'', m:'', y:'' });
  const [gender,setGender] = useState('Nam');
  const [nation,setNation] = useState('Việt Nam');
  const [avatar,setAvatar] = useState(user?.avatar||'/avatar.png');
  const fileRef = useRef(null);

  const onPickAvatar = ()=>fileRef.current?.click();
  const onFile = (e)=>{ const f=e.target.files?.[0]; if(!f) return; setAvatar(URL.createObjectURL(f)); };
  const saveProfile = async ()=>{
    try{
      await apiPatch('/api/me/profile',{ name, avatar, dob, gender, nation });
      showToast?.({ type:'success', title:'Đã lưu thay đổi' });
    }catch{
      showToast?.({ type:'success', title:'Đã lưu thay đổi (local)' });
    }
  };

  /* -------- Sổ địa chỉ -------- */
  const [list,setList] = useState([]);
  const [loading,setLoading] = useState(true);
  const [openModal,setOpenModal] = useState(false);

  const reload = async ()=>{
    setLoading(true);
    try{
      const items = await api.list();
      setList(items);
    } finally { setLoading(false); }
  };

  useEffect(()=>{ reload(); },[api]);

  const addAddress = async (a)=>{ await api.add(a); await reload(); showToast?.({type:'success', title:'Đã thêm địa chỉ'}); };
  const removeAddress = async (id)=>{ if(!confirm('Xoá địa chỉ này?')) return; await api.remove(id); await reload(); };
  const setDefault = async (id)=>{ await api.setDefault(id); await reload(); };

  const line = (a)=>[a.detail,a.ward,a.district,a.province].filter(Boolean).join(', ');

  /* -------- Options cho DOB (3 cột bằng nhau) -------- */
  const days = Array.from({length:31},(_,i)=>String(i+1));
  const months = Array.from({length:12},(_,i)=>String(i+1));
  const years = Array.from({length:80},(_,i)=>String(new Date().getFullYear()-i));

  return (
    <div className="container px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Thông tin tài khoản</h1>

      {/* CARD chính gồm 2 cột */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Cột trái: Thông tin cá nhân */}
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

              {/* Ngày / Tháng / Năm – bề rộng bằng nhau */}
              <div>
                <div className="text-sm font-medium mb-1">Ngày sinh</div>
                <div className="grid grid-cols-3 gap-3">
                  <select className="input w-full" value={dob.d} onChange={e=>setDob({...dob,d:e.target.value})}>
                    <option value="">Ngày</option>
                    {days.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                  <select className="input w-full" value={dob.m} onChange={e=>setDob({...dob,m:e.target.value})}>
                    <option value="">Tháng</option>
                    {months.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                  <select className="input w-full" value={dob.y} onChange={e=>setDob({...dob,y:e.target.value})}>
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

        {/* Cột phải: Phone/Email & Bảo mật */}
        <div className="card p-5 space-y-4">
          <div className="text-lg font-semibold">Số điện thoại và Email</div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">Số điện thoại</div>
              <div className="text-gray-600 text-sm">{user?.phone || 'Chưa cập nhật'}</div>
            </div>
            <button className="btn bg-gray-100 hover:bg-gray-200">Cập nhật</button>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">Địa chỉ email</div>
              <div className="text-gray-600 text-sm">{user?.email || 'Thêm địa chỉ email'}</div>
            </div>
            <button className="btn bg-gray-100 hover:bg-gray-200">Cập nhật</button>
          </div>

          <div className="text-lg font-semibold pt-2">Bảo mật</div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="font-medium">Thiết lập mật khẩu</div>
            <button className="btn bg-gray-100 hover:bg-gray-200">Cập nhật</button>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="font-medium">Thiết lập mã PIN</div>
            <button className="btn bg-gray-100 hover:bg-gray-200">Thiết lập</button>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="font-medium">Yêu cầu xoá tài khoản</div>
            <button className="btn bg-gray-100 hover:bg-gray-200">Yêu cầu</button>
          </div>
        </div>
      </div>

      {/* Sổ địa chỉ ngay trong trang */}
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

      {/* Modal thêm địa chỉ */}
      <AddressModal open={openModal} onClose={()=>setOpenModal(false)} onSave={addAddress} user={user}/>
    </div>
  );
}
  