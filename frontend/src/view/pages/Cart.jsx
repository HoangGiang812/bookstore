// src/view/pages/Cart.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Minus, Plus, Trash2, CheckSquare, Square } from 'lucide-react';

import { useCart } from '../../store/useCart';
import { useAuth } from '../../store/useAuth';
import { useUI } from '../../store/useUI';

import {
  shippingFee as fallbackShippingFee,
  shippingFeeFor,
  calcSubtotal,
  getBuyNow,
  clearBuyNow,
} from '../../services/cart';
import { create as createOrder } from '../../services/orders';

const toVND = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
    .format(Number(n || 0));
const idOf = (i) => i.id || i.bookId;

async function apiGet(url) {
  const r = await fetch(url, { credentials: 'include' });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiPost(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function normalizeAddr(raw) {
  if (!raw) return null;
  const id = String(raw._id || raw.id || Date.now() + Math.random());
  return {
    id,
    _id: raw._id,
    label: raw.label || raw.tag || 'Nhà riêng',
    receiver: raw.receiver || raw.fullName || '',
    phone: raw.phone || '',
    province: raw.province || raw.city || '',
    district: raw.district || '',
    ward: raw.ward || '',
    detail: raw.detail || raw.address || '',
    isDefault: !!raw.isDefault,
  };
}
const addrKey = (user) => `demo_addresses_${String(user?._id || user?.id || 'guest')}`;
const readLocal = (user) => {
  try { return JSON.parse(localStorage.getItem(addrKey(user)) || '[]'); }
  catch { return []; }
};
const writeLocal = (user, list) => {
  try { localStorage.setItem(addrKey(user), JSON.stringify(list || [])); } catch {}
};

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
  'Đà Nẵng': { 'Hải Châu': ['Hải Châu 1','Hải Châu 2','Bình Hiên','Thạch Thang','Nam Dương'] },
};

function useAddresses(user) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        if (!user) { if (alive) setList([]); return; }

        try {
          let data = await apiGet('/api/me/addresses');
          data = Array.isArray(data) ? data : (data?.items || []);
          const mapped = (data || []).map(a => {
            const n = normalizeAddr(a);
            return { ...n, _line: [n.detail, n.ward, n.district, n.province].filter(Boolean).join(', ') };
          });
          writeLocal(user, mapped);
          if (alive) setList(mapped);
          return;
        } catch {
          const local = readLocal(user).map(normalizeAddr).filter(Boolean).map(n => ({
            ...n,
            _line: [n.detail, n.ward, n.district, n.province].filter(Boolean).join(', ')
          }));
          if (alive) setList(local);
        }
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [user?._id, user?.id, tick]);

  useEffect(() => {
    const bump = () => setTick(t => t + 1);
    const onStorage = (e) => { if (user && e.key === addrKey(user)) bump(); };
    window.addEventListener('focus', bump);
    window.addEventListener('addresses:changed', bump);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', bump);
      window.removeEventListener('addresses:changed', bump);
      window.removeEventListener('storage', onStorage);
    };
  }, [user]);

  return { list, loading, reload: () => setTick(t => t + 1) };
}

const getProvince = (addr) => (addr?.province || '').trim();

function AddressModal({ open, onClose, onSave, user }) {
  const [f, setF] = useState({
    label: 'Nhà riêng', receiver: user?.name || user?.fullName || '',
    phone: user?.phone || '', province: '', district: '', ward: '', detail: '',
    isDefault: false,
  });

  const districts = DISTRICTS[f.province] || [];
  const wards = (WARDS[f.province] && WARDS[f.province][f.district]) || [];

  useEffect(() => {
    if (open) {
      setF({
        label: 'Nhà riêng', receiver: user?.name || user?.fullName || '',
        phone: user?.phone || '', province: '', district: '', ward: '', detail: '',
        isDefault: false,
      });
    }
  }, [open, user]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="text-xl font-semibold">Thêm địa chỉ</div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-4">
          <label className="block">
            <div className="text-sm font-medium mb-1">Nhãn</div>
            <input className="input w-full" placeholder="Nhà riêng / Cơ quan"
                   value={f.label} onChange={e=>setF({...f,label:e.target.value})}/>
          </label>

          <label className="block">
            <div className="text-sm font-medium mb-1">Người nhận <span className="text-rose-600">*</span></div>
            <input className="input w-full" placeholder="Nguyễn Văn A"
                   value={f.receiver} onChange={e=>setF({...f,receiver:e.target.value})}/>
          </label>

          <label className="block">
            <div className="text-sm font-medium mb-1">Số điện thoại <span className="text-rose-600">*</span></div>
            <input className="input w-full" placeholder="09xxxxxxxx"
                   value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/>
          </label>

          <label className="block">
            <div className="text-sm font-medium mb-1">Tỉnh/Thành <span className="text-rose-600">*</span></div>
            <input className="input w-full" list="vn-provinces" placeholder="TP.HCM / Hà Nội / …"
                   value={f.province}
                   onChange={e=>setF({...f,province:e.target.value, district:'', ward:''})}/>
            <datalist id="vn-provinces">
              {VN_PROVINCES.map(p => <option key={p} value={p} />)}
            </datalist>
          </label>

          <label className="block">
            <div className="text-sm font-medium mb-1">Quận/Huyện</div>
            <input className="input w-full" list="vn-districts" placeholder="Q1 / Bình Thạnh / …"
                   value={f.district}
                   onChange={e=>setF({...f,district:e.target.value, ward:''})}
                   disabled={!f.province}/>
            <datalist id="vn-districts">
              {districts.map(d => <option key={d} value={d} />)}
            </datalist>
          </label>

          <label className="block">
            <div className="text-sm font-medium mb-1">Phường/Xã</div>
            <input className="input w-full" list="vn-wards" placeholder="Bến Nghé / …"
                   value={f.ward} onChange={e=>setF({...f,ward:e.target.value})}
                   disabled={!f.district}/>
            <datalist id="vn-wards">
              {wards.map(w => <option key={w} value={w} />)}
            </datalist>
          </label>

          <label className="md:col-span-2 block">
            <div className="text-sm font-medium mb-1">Địa chỉ chi tiết <span className="text-rose-600">*</span></div>
            <input className="input w-full" placeholder="123 Lê Lợi…"
                   value={f.detail} onChange={e=>setF({...f,detail:e.target.value})}/>
          </label>

          <label className="md:col-span-2 inline-flex items-center gap-2 select-none mt-1">
            <input type="checkbox" className="accent-purple-600"
                   checked={!!f.isDefault} onChange={e=>setF({...f,isDefault:e.target.checked})}/>
            Đặt làm địa chỉ mặc định
          </label>
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn bg-gray-100 hover:bg-gray-200">Huỷ</button>
          <button onClick={() => onSave(f)} className="btn-primary">Lưu địa chỉ</button>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const cart = useCart();
  const { user } = useAuth();
  const { showToast } = useUI();
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const [coupon, setCoupon] = useState('');
  const [addressId, setAddressId] = useState('');
  const [payMethod, setPayMethod] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [shipFee, setShipFee] = useState(0);
  const [estimating, setEstimating] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [buyOnly, setBuyOnly] = useState(false);

  const [openAddrModal, setOpenAddrModal] = useState(false);

  useEffect(() => { cart.init(); }, [user]);

  const { list: addresses, loading: loadingAddrs, reload: reloadAddresses } = useAddresses(user);

  useEffect(() => {
    if (!addresses.length) { setAddressId(''); return; }
    const def = addresses.find(a => a.isDefault) || addresses[0];
    setAddressId(String(def.id));
  }, [addresses.length]);

  useEffect(() => {
    const isBuyNow = sp.get('buy') === '1';
    if (!isBuyNow) { setBuyOnly(false); return; }
    const t = setTimeout(() => {
      const bn = getBuyNow();
      if (!bn?.id) { setBuyOnly(false); return; }
      const found = cart.items.find(i => String(idOf(i)) === String(bn.id));
      if (found && Number(found.quantity || 1) !== Number(bn.qty || 1)) {
        cart.update(idOf(found), Math.max(1, Number(bn.qty || 1)));
      }
      setSelected(new Set([String(bn.id)]));
      setBuyOnly(true);
      clearBuyNow();
    }, 0);
    return () => clearTimeout(t);
  }, [sp, cart.items.length]);

  useEffect(() => {
    setSelected((prev) => {
      const ok = new Set(cart.items.map(idOf).map(String));
      const next = new Set();
      for (const id of prev) if (ok.has(String(id))) next.add(String(id));
      return next;
    });
  }, [cart.items]);

  const subtotalAll = useMemo(() => calcSubtotal(cart.items), [cart.items]);

  const selectedItems = useMemo(() => {
    if (buyOnly) return cart.items.filter(i => selected.has(String(idOf(i))));
    return selected.size === 0 ? cart.items : cart.items.filter(i => selected.has(String(idOf(i))));
  }, [cart.items, selected, buyOnly]);

  const subtotalSelected = useMemo(() => calcSubtotal(selectedItems), [selectedItems]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setEstimating(true);
        const selAddr = addresses.find(a => String(a.id) === String(addressId)) || null;
        const province = getProvince(selAddr);
        if (!province) { if (alive) setShipFee(fallbackShippingFee(subtotalSelected)); return; }
        const fee = await shippingFeeFor(province, subtotalSelected);
        if (alive) setShipFee(Number(fee || 0));
      } catch {
        if (alive) setShipFee(fallbackShippingFee(subtotalSelected));
      } finally { if (alive) setEstimating(false); }
    })();
    return () => { alive = false; };
  }, [addressId, addresses, subtotalSelected]);

  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      const key = String(id);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const toggleAll = () =>
    setSelected((s) => {
      if (cart.items.length === 0) return new Set();
      if (s.size === cart.items.length) return new Set();
      return new Set(cart.items.map((x) => String(idOf(x))));
    });

  const parseErrorMessage = (e) => {
    if (!e) return 'Có lỗi xảy ra';
    try { const j = JSON.parse(e.message); return j?.message || e.message; }
    catch { return e.message || 'Có lỗi xảy ra'; }
  };

  async function saveNewAddress(f) {
    try {
      if (!f.receiver?.trim() || !f.phone?.trim() || !f.province?.trim() || !f.detail?.trim()) {
        alert('Vui lòng nhập đủ thông tin bắt buộc');
        return;
      }

      let newId = '';
      try {
        const res = await apiPost('/api/me/addresses', f);
        newId = String(res?._id || res?.id || '');
      } catch {
        const cur = readLocal(user).map(normalizeAddr).filter(Boolean);
        const id = String(Date.now());
        const item = { ...f, id, _id: id };
        let next = [...cur];
        if (item.isDefault) next = next.map(x => ({ ...x, isDefault: false }));
        next.unshift(item);
        if (!next.some(x => x.isDefault)) next[0].isDefault = true;
        writeLocal(user, next);
        newId = id;
      }

      window.dispatchEvent(new Event('addresses:changed'));
      reloadAddresses();
      if (newId) setAddressId(String(newId));
      setOpenAddrModal(false);
    } catch {
      alert('Lưu địa chỉ thất bại');
    }
  }

  const onCheckout = async () => {
    setErrMsg('');
    if (!cart.items.length) return alert('Giỏ hàng trống');
    if (!user) return nav('/login?next=/cart');
    if (selectedItems.length === 0) return alert('Vui lòng chọn ít nhất 1 sản phẩm');

    const selAddr = addresses.find(a => String(a.id) === String(addressId)) || null;
    if (!selAddr) return setOpenAddrModal(true);

    const items = selectedItems.map((i) => ({
      bookId: i.id || i.bookId,
      qty: Math.max(1, Number(i.quantity || 1)),
      price: Number(i.price || 0),
      title: i.title,
      categoryId: i.categoryId || null,
    }));

    const shippingAddress = {
      label: selAddr.label || 'Mặc định',
      receiver: selAddr.receiver || selAddr.fullName || '',
      phone: selAddr.phone || '',
      province: selAddr.province || '',
      district: selAddr.district || '',
      ward: selAddr.ward || '',
      detail: selAddr.detail || selAddr.address || '',
      isDefault: !!selAddr.isDefault,
    };

    const payload = {
      items,
      shippingAddress,
      payment: { method: payMethod },
      couponCode: coupon?.trim() || undefined,
    };

    try {
      setLoading(true);
      const order = await createOrder(payload);

      const bought = new Set(items.map((i) => String(i.bookId)));
      const remain = cart.items.filter((i) => !bought.has(String(idOf(i))));
      cart.clear();
      for (const i of remain) cart.add(i, Number(i.quantity || 1));
      setSelected(new Set());
      setBuyOnly(false);

      showToast?.({
        type: 'success',
        title: 'Đặt hàng thành công 🎉',
        message: 'Chúng tôi đã gửi xác nhận vào email của bạn.',
        duration: 2600,
      });

      setTimeout(() => {
        const code = order?.code || '';
        nav(`/order-success?code=${encodeURIComponent(code)}`);
      }, 800);
    } catch (e) {
      if (String(e?.message || '').toLowerCase().includes('unauthorized')) return nav('/login?next=/cart');
      setErrMsg(parseErrorMessage(e));
    } finally { setLoading(false); }
  };

  return (
    <div className="container px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Giỏ hàng</h1>

      {errMsg && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          {errMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-4">
          {cart.items.length === 0 ? (
            <div className="text-gray-600">
              Giỏ hàng trống.{` `}
              <Link to="/categories" className="text-blue-600 underline">
                Tiếp tục mua sắm
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={toggleAll}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50"
                  title={cart.items.length > 0 && selected.size === cart.items.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                >
                  {cart.items.length > 0 && selected.size === cart.items.length
                    ? <CheckSquare className="w-4 h-4" />
                    : <Square className="w-4 h-4" />}
                  {cart.items.length > 0 && selected.size === cart.items.length ? 'Bỏ chọn tất cả' : selected.size > 0 ? 'Chọn phần còn lại' : 'Chọn tất cả'}
                </button>

                <div className="text-sm text-gray-600">
                  {buyOnly ? (
                    <>Chế độ <b>Mua ngay</b> · Đã chọn <b>{selected.size}</b> sản phẩm</>
                  ) : (
                    <>Đã chọn <b>{selected.size === 0 ? cart.items.length : selected.size}</b> / {cart.items.length} sản phẩm</>
                  )}
                </div>
              </div>

              {cart.items.map((i) => {
                const id = idOf(i);
                const checked = buyOnly ? selected.has(String(id)) : (selected.size === 0 || selected.has(String(id)));
                const lineTotal = Number(i.price || 0) * Number(i.quantity || 0);
                return (
                  <div key={id} className="flex items-center gap-3 py-4 border-b last:border-b-0">
                    <button onClick={() => toggle(id)} className="p-2" title={checked ? 'Bỏ chọn' : 'Chọn sản phẩm này'}>
                      {checked ? <CheckSquare className="w-5 h-5 text-purple-600" /> : <Square className="w-5 h-5" />}
                    </button>

                    <img
                      src={i.image}
                      alt={i.title}
                      className="w-20 h-24 object-cover rounded border"
                      onError={(e) => { e.currentTarget.src = '/placeholder.jpg'; }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="font-medium line-clamp-2">{i.title}</div>
                      <div className="text-purple-600 font-semibold">{toVND(i.price)}</div>
                      <div className="text-xs text-gray-500">Thành tiền: {toVND(lineTotal)}</div>
                    </div>

                    <div className="flex items-center border rounded-lg">
                      <button onClick={() => cart.update(id, Math.max(0, Number(i.quantity || 1) - 1))} className="p-2 hover:bg-gray-100" title="Giảm">
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={Number(i.quantity || 1)}
                        onChange={(e) => cart.update(id, Number(e.target.value || 1))}
                        className="w-14 text-center outline-none"
                      />
                      <button onClick={() => cart.update(id, Number(i.quantity || 1) + 1)} className="p-2 hover:bg-gray-100" title="Tăng">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button onClick={() => cart.remove(id)} className="p-2 hover:bg-gray-100 rounded-lg" title="Xoá khỏi giỏ">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <aside className="card p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Mã giảm giá</label>
            <input
              className="input w-full"
              placeholder="Ví dụ: GIAM10"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">* Mã sẽ được kiểm tra ở bước tạo đơn.</p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium mb-2">Địa chỉ giao hàng</label>
              <button
                type="button"
                onClick={() => setOpenAddrModal(true)}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                title="Thêm địa chỉ mới"
              >
                + Thêm địa chỉ mới
              </button>
            </div>

            <select
              className="input w-full"
              value={addressId}
              onChange={(e) => setAddressId(e.target.value)}
              disabled={loadingAddrs}
            >
              <option value="">{loadingAddrs ? 'Đang tải…' : '-- Chọn địa chỉ --'}</option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {(a.receiver || 'Người nhận')} · {a.phone || ''} · {a._line}
                </option>
              ))}
            </select>

            {!addresses.length && (
              <div className="text-xs text-gray-600 mt-2">
                Chưa có địa chỉ.
                <button
                  type="button"
                  onClick={() => setOpenAddrModal(true)}
                  className="ml-2 px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  + Thêm địa chỉ mới
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Thanh toán</label>
            <select className="input w-full" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              <option value="cod">Thanh toán khi nhận hàng (COD)</option>
            </select>
          </div>

          <div className="text-sm space-y-1 border-t pt-3">
            <div className="flex justify-between"><span>Tổng giỏ (tạm tính)</span><b>{toVND(subtotalAll)}</b></div>
            <div className="flex justify-between mt-3"><span>Đã chọn (tạm tính)</span><b>{toVND(subtotalSelected)}</b></div>
            <div className="flex justify-between"><span>Phí vận chuyển (ước tính)</span><b>{estimating ? 'Đang tính…' : toVND(shipFee)}</b></div>
            <div className="flex justify-between text-lg pt-2"><span>Tổng thanh toán (đã chọn)</span><b className="text-purple-600">{toVND(subtotalSelected + shipFee)}</b></div>
            <div className="text-gray-500 text-xs">
              * Tổng cuối cùng sẽ do máy chủ xác nhận (đã tính giảm giá/thuế,…).<br/>
              * Ở chế độ <b>Mua ngay</b>, hệ thống chỉ thanh toán sản phẩm đã chọn.
            </div>
          </div>

          <button onClick={onCheckout} disabled={loading || cart.items.length === 0} className="btn-primary w-full">
            {loading ? 'Đang đặt hàng…' : `Đặt hàng${buyOnly ? '' : selected.size === 0 ? ' (tất cả)' : ` (${selected.size})`}`}
          </button>

          <div className="text-center text-xs text-gray-500">
            <Link to="/categories" className="text-blue-600 hover:underline">Tiếp tục mua sắm</Link>
          </div>
        </aside>
      </div>

      <AddressModal
        open={openAddrModal}
        onClose={() => setOpenAddrModal(false)}
        onSave={saveNewAddress}
        user={user}
      />
    </div>
  );
}
