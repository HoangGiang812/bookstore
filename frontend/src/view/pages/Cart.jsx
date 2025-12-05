// src/view/pages/Cart.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Minus, Plus, Trash2, CheckSquare, Square, XCircle, CheckCircle, X, Ticket, Wallet, CreditCard } from 'lucide-react';

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
import api, { getImageUrl } from '../../services/api';

const toVND = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
    .format(Number(n || 0));
const idOf = (i) => i.id || i.bookId;

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
          let data = await api.get('/me/addresses');
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
  const wards = (WARDS[f.province] && WARDS[f.district]) || [];

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

function CouponModal({ open, onClose, coupons, onSelect }) {
  if (!open) return null;
  
  const formatValue = (coupon) => {
    if (coupon.type === 'percent') return `${coupon.value}%`;
    return `${Number(coupon.value || 0).toLocaleString('vi-VN')} đ`;
  };

  return (
    <div className="fixed inset-0 z-[1001]" onClick={onClose}>
      {/* Lớp phủ (z-index cao hơn modal địa chỉ) */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
      
      <div 
        className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[80vh] flex flex-col mx-auto mt-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Mã giảm giá có sẵn</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>
        
        <div className="p-6 space-y-3 overflow-y-auto">
          {coupons.length === 0 && (
            <p className="text-gray-600">Không tìm thấy mã giảm giá nào.</p>
          )}
          {coupons.map(coupon => (
            <div key={coupon._id} className="border border-dashed border-gray-300 rounded-lg p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <Ticket size={24} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-lg">{coupon.code}</div>
                <div className="text-sm text-gray-700">
                  Giảm {formatValue(coupon)}
                  {coupon.minOrder > 0 && ` cho đơn từ ${Number(coupon.minOrder).toLocaleString('vi-VN')} đ`}
                </div>
                {coupon.description && (
                  <p className="text-xs text-gray-500 mt-1">{coupon.description}</p>
                )}
              </div>
              <button 
                onClick={() => onSelect(coupon.code)}
                className="btn-primary px-4 py-2"
              >
                Áp dụng
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----- BẮT ĐẦU PHẦN THAY ĐỔI -----
export default function CartPage() {
  const cart = useCart();
  const { user } = useAuth();
  const { showToast } = useUI();
  const nav = useNavigate();
  const [sp] = useSearchParams();

  // ===== THAY ĐỔI 1: State cho coupon =====
  const [couponInput, setCouponInput] = useState('');
  const [couponResult, setCouponResult] = useState({
    valid: false,
    discount: 0,
    code: '',
    message: '',
    loading: false,
  });
  // ======================================

  const [addressId, setAddressId] = useState('');
  const [payMethod, setPayMethod] = useState('cod'); // 'cod' | 'bank'
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [shipFee, setShipFee] = useState(0);
  const [estimating, setEstimating] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [buyOnly, setBuyOnly] = useState(false);

  const [openAddrModal, setOpenAddrModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [publicCoupons, setPublicCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  useEffect(() => { cart.init(); }, [user]);

  const { list: addresses, loading: loadingAddrs, reload: reloadAddresses } = useAddresses(user);

  useEffect(() => {
    if (!addresses.length) { setAddressId(''); return; }
    const def = addresses.find(a => a.isDefault) || addresses[0];
    setAddressId(String(def.id));
  }, [addresses.length]);

 useEffect(() => {
    const isBuyNow = sp.get('buy') === '1';
    if (!isBuyNow) { 
      setBuyOnly(false); 
      setSelected(new Set(cart.items.map(idOf).map(String)));
      return; 
    }
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
      for (const id of prev) {
        if (ok.has(String(id))) next.add(String(id));
      }
      if (!buyOnly && next.size === 0 && cart.items.length > 0) {
        return new Set(cart.items.map(idOf).map(String));
      }
      return next;
    });
  }, [cart.items, buyOnly]);

  const subtotalAll = useMemo(() => calcSubtotal(cart.items), [cart.items]);

  const selectedItems = useMemo(() => {
    return cart.items.filter(i => selected.has(String(idOf(i))));
  }, [cart.items, selected]);

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

  useEffect(() => {
    setLoadingCoupons(true);
    api.get('/public-coupons') // Gọi API mới tạo
      .then(data => {
        setPublicCoupons(Array.isArray(data) ? data : []);
      })
      .catch(e => {
        console.error("Lỗi tải mã giảm giá:", e);
      })
      .finally(() => {
        setLoadingCoupons(false);
      });
  }, []);

  const handleApplyCoupon = async (codeToApply) => {
    if (!codeToApply.trim()) {
      setCouponResult({ valid: false, discount: 0, code: '', message: 'Vui lòng nhập mã.', loading: false });
      return;
    }
    if (selectedItems.length === 0) {
      setCouponResult({ valid: false, discount: 0, code: '', message: 'Vui lòng chọn sản phẩm để áp dụng mã.', loading: false });
      return;
    }

    setCouponResult((prev) => ({ ...prev, loading: true, message: '' }));
    
    const itemsPayload = selectedItems.map((i) => ({
      bookId: i.id || i.bookId,
      qty: Math.max(1, Number(i.quantity || 1)),
      price: Number(i.price || 0)
    }));

    try {
      //
      const res = await api.post('/api/coupon/validate', {
        code: codeToApply, // Dùng codeToApply
        items: itemsPayload,
      });
      setCouponResult({
        valid: true,
        discount: res.discount,
        code: res.code,
        message: res.message || 'Áp dụng mã giảm giá thành công.',
        loading: false,
      });
      setCouponInput(codeToApply); // Cập nhật ô input
    } catch (e) {
      setCouponResult({
        valid: false,
        discount: 0,
        code: codeToApply,
        message: e.message || 'Mã không hợp lệ hoặc có lỗi.',
        loading: false,
      });
      setCouponInput(codeToApply); // Cập nhật ô input
    }
  };

  // 5. THÊM: Hàm này được gọi khi nhấn nút "Áp dụng" từ ô input
  const handleApplyCouponFromInput = () => {
    handleApplyCoupon(couponInput);
  };
  
  // 6. THÊM: Hàm này được gọi khi chọn từ Modal
  const handleSelectCoupon = (code) => {
    setShowCouponModal(false); // Đóng modal
    handleApplyCoupon(code); // Tự động áp dụng
  };

  const toggle = (id) => {
    setSelected((s) => {
      const n = new Set(s);
      const key = String(id);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const toggleAll = () => {
    setSelected((s) => {
      if (cart.items.length === 0) return new Set();
      if (s.size === cart.items.length) return new Set();
      return new Set(cart.items.map((x) => String(idOf(x))));
    });
  };

  const allSelected = useMemo(() => {
    return cart.items.length > 0 && selected.size === cart.items.length;
  }, [cart.items.length, selected.size]);

  const parseErrorMessage = (e) => {
    if (!e) return 'Có lỗi xảy ra';
    if (e?.response?.data?.message) return e.response.data.message;
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
        const res = await api.post('/me/addresses', f);
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

  // ===== THÊM: Redirect theo phương thức thanh toán (bank | cod) =====
  async function handlePostCreateRedirect(order, method) {
    const oid = order?._id || order?.id;
    const code = order?.code || '';
    if (!oid) return nav('/account/orders');

    try {
      if (method === 'bank') {
        nav(`/payment-bank?orderId=${encodeURIComponent(oid)}&code=${encodeURIComponent(code)}`);
        return;
      }
      // COD
      nav('/account/orders');
    } catch {
      nav(`/payment-failed?code=${encodeURIComponent(code)}`);
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

    // Tạo payload
    const payload = {
      items,
      shippingAddress,
      payment: { method: payMethod }, // cod | bank | momo
      couponCode: couponResult.valid ? couponResult.code : undefined,
    };

    try {
      setLoading(true);
      
      // 1. TẠO ĐƠN HÀNG TRƯỚC (Dù thanh toán kiểu gì cũng phải tạo đơn)
      const order = await createOrder(payload);

      // Xử lý dọn giỏ hàng ngay sau khi tạo đơn thành công
      const bought = new Set(items.map((i) => String(i.bookId)));
      const remain = cart.items.filter((i) => !bought.has(String(idOf(i))));
      cart.clear();
      for (const i of remain) cart.add(i, Number(i.quantity || 1));
      setSelected(new Set());
      setBuyOnly(false);
      setCouponResult({ valid: false, discount: 0, code: '', message: '', loading: false });
      setCouponInput('');

      // 2. ĐIỀU HƯỚNG THEO PHƯƠNG THỨC THANH TOÁN
      
      // --- TRƯỜNG HỢP MOMO ---
      if (payMethod === 'momo') {
          try {
              // Gọi API backend để lấy link thanh toán
              // Lưu ý: Đảm bảo bạn đã tạo route /api/payments/momo/create ở backend như hướng dẫn trước
              const res = await api.post('/api/payments/momo/create', { orderId: order._id || order.id });
              
              if (res.payUrl) {
                  showToast?.({ type: 'info', title: 'Đang chuyển hướng...', message: 'Vui lòng thanh toán trên cổng Momo.', duration: 3000 });
                  // Chuyển hướng người dùng sang Momo
                  window.location.href = res.payUrl; 
                  return; // Dừng hàm tại đây
              } else {
                  throw new Error('Không nhận được link thanh toán từ Momo');
              }
          } catch (momoErr) {
              console.error(momoErr);
              // Nếu lỗi Momo, vẫn giữ đơn hàng nhưng chuyển về trang quản lý đơn để khách thanh toán lại sau
              alert("Lỗi kết nối Momo. Đơn hàng đã được lưu, bạn có thể thử thanh toán lại trong 'Đơn hàng của tôi'.");
              nav('/account/orders');
              return;
          }
      }

      // --- TRƯỜNG HỢP COD / BANK ---
      showToast?.({
        type: 'success',
        title: 'Đặt hàng thành công 🎉',
        message: payMethod === 'cod'
          ? 'Đơn hàng đã được tạo. Vui lòng theo dõi trạng thái.'
          : 'Đơn hàng đã được tạo. Đang mở trang chuyển khoản…',
        duration: 2400,
      });

      await handlePostCreateRedirect(order, payMethod);

    } catch (e) {
      if (String(e?.message || '').toLowerCase().includes('unauthorized')) return nav('/login?next=/cart');
      const errorMsg = parseErrorMessage(e);
      setErrMsg(errorMsg);
    } finally { 
      setLoading(false); 
    }
  };

  // ===== THAY ĐỔI 4: Tính toán lại tổng tiền =====
  const grandTotal = useMemo(() => {
    return Math.max(0, subtotalSelected + shipFee - couponResult.discount);
  }, [subtotalSelected, shipFee, couponResult.discount]);
  // ===========================================

  return (
    <>
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
                    title={allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    disabled={buyOnly} // Vô hiệu hóa khi ở chế độ Mua ngay
                  >
                    {allSelected
                      ? <CheckSquare className="w-4 h-4" />
                      : <Square className="w-4 h-4" />}
                    {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>

                  <div className="text-sm text-gray-600">
                    {buyOnly ? (
                      <>Chế độ <b>Mua ngay</b> · Đã chọn <b>{selected.size}</b> sản phẩm</>
                    ) : (
                      <>Đã chọn <b>{selected.size}</b> / {cart.items.length} sản phẩm</>
                    )}
                  </div>
                </div>

                {cart.items.map((i) => {
                  const id = idOf(i);
                  const checked = selected.has(String(id)); 
                  const lineTotal = Number(i.price || 0) * Number(i.quantity || 0);
                  return (
                    <div key={id} className={`flex items-center gap-3 py-4 border-b last:border-b-0 ${buyOnly && !checked ? 'opacity-50' : ''}`}>
                      <button 
                        onClick={() => toggle(id)} 
                        className="p-2" 
                        title={checked ? 'Bỏ chọn' : 'Chọn sản phẩm này'}
                        disabled={buyOnly}
                      >
                        {checked ? <CheckSquare className="w-5 h-5 text-purple-600" /> : <Square className="w-5 h-5" />}
                      </button>

                      <img
                        src={getImageUrl(i.image, null)}
                        alt={i.title}
                        className="w-20 h-24 object-cover rounded border"
                        onError={(e) => { e.currentTarget.src = getImageUrl(null); }}
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
            {/* Mã giảm giá */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Mã giảm giá</label>
                {publicCoupons.length > 0 && (
                  <button 
                    onClick={() => setShowCouponModal(true)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Xem mã có sẵn
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Ví dụ: BOOK123"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  disabled={couponResult.loading}
                />
                <button 
                  onClick={handleApplyCouponFromInput} // Sửa hàm onClick
                  disabled={couponResult.loading || !couponInput}
                  className="btn-primary px-4"
                >
                  {couponResult.loading ? 'Đang...' : 'Áp dụng'}
                </button>
              </div>
                
              {couponResult.message && (
                <div 
                  className={`mt-2 text-xs inline-flex items-center gap-1 ${
                    couponResult.valid ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {couponResult.valid ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {couponResult.message}
                </div>
              )}
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
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium mb-1">Phương thức thanh toán</label>
              
              {/* 1. COD */}
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${payMethod==='cod' ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-gray-200 hover:border-blue-300'}`}>
                  <input type="radio" name="pay" value="cod" checked={payMethod==='cod'} onChange={()=>setPayMethod('cod')} className="accent-blue-600 w-4 h-4"/>
                  <div className="flex-1">
                      <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                          <Wallet size={18} className="text-gray-500"/> Thanh toán khi nhận hàng (COD)
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">Bạn chỉ phải trả tiền khi shipper giao hàng đến.</div>
                  </div>
              </label>

              {/* 2. BANK TRANSFER */}
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${payMethod==='bank' ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-gray-200 hover:border-blue-300'}`}>
                  <input type="radio" name="pay" value="bank" checked={payMethod==='bank'} onChange={()=>setPayMethod('bank')} className="accent-blue-600 w-4 h-4"/>
                  <div className="flex-1">
                      <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                          <CreditCard size={18} className="text-gray-500"/> Chuyển khoản ngân hàng (VietQR)
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">Quét mã QR qua App ngân hàng, xác nhận tự động.</div>
                  </div>
              </label>

              {/* 3. MOMO */}
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${payMethod==='momo' ? 'border-pink-600 bg-pink-50 ring-1 ring-pink-600' : 'border-gray-200 hover:border-pink-300'}`}>
                  <input type="radio" name="pay" value="momo" checked={payMethod==='momo'} onChange={()=>setPayMethod('momo')} className="accent-pink-600 w-4 h-4"/>
                  <div className="flex-1">
                      <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                          <img src="https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png" alt="Momo" className="w-5 h-5 object-contain rounded-[4px]"/> 
                          Ví điện tử Momo
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">Thanh toán siêu tốc qua ứng dụng Momo.</div>
                  </div>
              </label>
            </div>

            {/* Tính tiền */}
            <div className="text-sm space-y-1 border-t pt-3">
              <div className="flex justify-between"><span>Tổng giỏ (tạm tính)</span><b>{toVND(subtotalAll)}</b></div>
              <div className="flex justify-between mt-3"><span>Đã chọn (tạm tính)</span><b>{toVND(subtotalSelected)}</b></div>
              {couponResult.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá ({couponResult.code})</span>
                  <b>- {toVND(couponResult.discount)}</b>
                </div>
              )}
              <div className="flex justify-between"><span>Phí vận chuyển (ước tính)</span><b>{estimating ? 'Đang tính…' : toVND(shipFee)}</b></div>
              <div className="flex justify-between text-lg pt-2">
                <span>Tổng thanh toán (đã chọn)</span>
                <b className="text-purple-600">{toVND(grandTotal)}</b>
              </div>
              <div className="text-gray-500 text-xs">
                * Tổng cuối cùng sẽ do máy chủ xác nhận.<br/>
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
    <CouponModal
        open={showCouponModal}
        onClose={() => setShowCouponModal(false)}
        coupons={publicCoupons}
        onSelect={handleSelectCoupon}
      />
    </>
  );
}