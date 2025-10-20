// src/view/pages/AddressBook.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/useAuth';
import { useUI } from '../../store/useUI';
import api from '../../services/api';

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
      if(Array.isArray(legacy) && legacy.length){ list = legacy; writeJSON(k, list); }
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
    label:'Nhà riêng', receiver: user?.name || user?.fullName || '',
    phone: user?.phone || '', province:'', district:'', ward:'', detail:'', isDefault:false,
  });
  const districts = DISTRICTS[f.province] || [];
  const wards = (WARDS[f.province] && WARDS[f.province][f.district]) || [];
  useEffect(()=>{ if(open){
    setF({ label:'Nhà riêng', receiver: user?.name || user?.fullName || '', phone: user?.phone || '', province:'', district:'', ward:'', detail:'', isDefault:false, });
  }},[open,user]);

  const save = async ()=>{
    if(!f.receiver.trim() || !f.phone.trim() || !f.province.trim() || !f.detail.trim()){
      showToast?.({ type:'warning', title:'Thiếu thông tin', message:'Vui lòng nhập các trường bắt buộc.' }); return;
    }
    await onSave(f); onClose?.();
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
            <Field label="Nhãn"><input className="input w-full" placeholder="Nhà riêng / Cơ quan" value={f.label} onChange={e=>setF({...f,label:e.target.value})}/></Field>
            <Field label="Người nhận" required><input className="input w-full" placeholder="Nguyễn Văn A" value={f.receiver} onChange={e=>setF({...f,receiver:e.target.value})}/></Field>
            <Field label="Số điện thoại" required><input className="input w-full" placeholder="09xxxxxxxx" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></Field>
            <Field label="Tỉnh/Thành" required>
              <input className="input w-full" list="vn-provinces" placeholder="TP.HCM / Hà Nội / …" value={f.province} onChange={e=>setF({ ...f, province:e.target.value, district:'', ward:'' })}/>
              <datalist id="vn-provinces">{VN_PROVINCES.map(p=> <option key={p} value={p} />)}</datalist>
            </Field>
            <Field label="Quận/Huyện">
              <input className="input w-full" list="vn-districts" placeholder="Q1 / Bình Thạnh / …" value={f.district} onChange={e=>setF({ ...f, district:e.target.value, ward:'' })} disabled={!f.province}/>
              <datalist id="vn-districts">{districts.map(d=> <option key={d} value={d} />)}</datalist>
            </Field>
            <Field label="Phường/Xã">
              <input className="input w-full" list="vn-wards" placeholder="Bến Nghé / …" value={f.ward} onChange={e=>setF({ ...f, ward:e.target.value })} disabled={!f.district}/>
              <datalist id="vn-wards">{wards.map(w=> <option key={w} value={w} />)}</datalist>
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Địa chỉ chi tiết" required><input className="input w-full" placeholder="123 Lê Lợi…" value={f.detail} onChange={e=>setF({...f,detail:e.target.value})}/></Field>
          </div>
          <label className="mt-4 inline-flex items-center gap-2 select-none">
            <input type="checkbox" className="accent-purple-600" checked={!!f.isDefault} onChange={e=>setF({...f,isDefault:e.target.checked})}/>
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

export default function AddressBook(){
  const { user } = useAuth();
  const { showToast } = useUI();
  const uid = useMemo(()=>String(user?._id||user?.id||''),[user]);
  const apiAddr = useMemo(()=>addressApi(uid),[uid]);

  const [list,setList] = useState([]);
  const [loading,setLoading] = useState(true);
  const [openModal,setOpenModal] = useState(false);

  const reload = async ()=>{ setLoading(true); try{ const items = await apiAddr.list(); setList(items);} finally { setLoading(false); } };
  useEffect(()=>{ reload(); },[apiAddr]);

  const addAddress = async (a)=>{ await apiAddr.add(a); await reload(); showToast?.({type:'success', title:'Đã thêm địa chỉ'}); };
  const removeAddress = async (id)=>{ if(!confirm('Xoá địa chỉ này?')) return; await apiAddr.remove(id); await reload(); };
  const setDefault = async (id)=>{ await apiAddr.setDefault(id); await reload(); };

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
          <Link to="/account/info" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
            <span className="w-6 text-center">👤</span> Thông tin tài khoản
          </Link>
          <Link to="/account/reviews" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
            <span className="w-6 text-center">⭐</span> Đánh giá sản phẩm
          </Link>
          <Link to="/account/comments" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
            <span className="w-6 text-center">💬</span> Nhận xét của tôi
          </Link>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100 font-medium">
            <span className="w-6 text-center">📍</span> Sổ địa chỉ
          </div>
          <Link to="/orders" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
            <span className="w-6 text-center">🧾</span> Quản lý đơn hàng
          </Link>
        </nav>
      </aside>

      {/* Content */}
      <section className="bg-white rounded-xl border shadow-sm p-5">
        <h1 className="text-2xl font-bold mb-6">Sổ địa chỉ</h1>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">Danh sách địa chỉ</div>
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

        <AddressModal open={openModal} onClose={()=>setOpenModal(false)} onSave={async (a)=>{ await addressApi(uid).add(a); await (async()=>{ const items = await addressApi(uid).list(); setList(items); })(); }} user={user}/>
      </section>
    </div>
  );
}
