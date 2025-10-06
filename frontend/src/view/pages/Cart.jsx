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

// ----------------- utils nhỏ gọn -----------------
const toVND = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
    .format(Number(n || 0));
const idOf = (i) => i.id || i.bookId;

async function apiGet(url) {
  const r = await fetch(url, { credentials: 'include' });
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

// --- helpers key theo user + local read/write ---
const addrKey = (user) => `demo_addresses_${String(user?._id || user?.id || 'guest')}`;
const readLocal = (user) => {
  try { return JSON.parse(localStorage.getItem(addrKey(user)) || '[]'); }
  catch { return []; }
};
const writeLocal = (user, list) => {
  try { localStorage.setItem(addrKey(user), JSON.stringify(list || [])); }
  catch {}
};

/** CHỈ migrate từ key cũ khi key mới đang trống */
function loadLocalAddressesForUser(user) {
  const uid = String(user?._id || user?.id || 'guest');
  const KEY = `demo_addresses_${uid}`;
  const LEGACY_KEY = `addr_${uid}`;

  const readJSON = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  let arr = readJSON(KEY);
  if (Array.isArray(arr) && arr.length) {
    arr = arr.map(normalizeAddr).filter(Boolean);
    if (arr.length && !arr.some(x => x.isDefault)) arr[0].isDefault = true;
    writeJSON(KEY, arr);
    return arr;
  }

  const legacy = readJSON(LEGACY_KEY);
  const migrated = (legacy || []).map(normalizeAddr).filter(Boolean);
  if (migrated.length && !migrated.some(x => x.isDefault)) migrated[0].isDefault = true;
  writeJSON(KEY, migrated);
  return migrated;
}

/** Hook nạp địa chỉ, reload khi:
 *  - quay lại tab (focus)
 *  - nhận custom event 'addresses:changed'
 *  - event 'storage' thay đổi key của user
 */
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

        // 1) Ưu tiên API – coi là nguồn chuẩn
        try {
          let data = await apiGet('/api/me/addresses');
          data = Array.isArray(data) ? data : (data?.items || []);
          const mapped = (data || []).map(a => {
            const n = normalizeAddr(a);
            const line = [n.detail, n.ward, n.district, n.province].filter(Boolean).join(', ');
            return { ...n, _line: line };
          });

          // 2) Ghi đè local theo user để xoá dữ liệu cũ (kể cả rỗng)
          writeLocal(user, mapped);

          if (alive) setList(mapped);
          return; // ✅ API OK → không cần fallback
        } catch {
          // 3) Fallback local – chỉ dùng khi API lỗi
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
    const onStorage = (e) => {
      if (!user) return;
      if (e.key === addrKey(user)) bump();
    };
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

// ----------------- Component -----------------
export default function CartPage() {
  const cart = useCart();
  const { user } = useAuth();
  const { showToast } = useUI();
  const nav = useNavigate();
  const [sp] = useSearchParams();

  // state chung
  const [coupon, setCoupon] = useState('');
  const [addressId, setAddressId] = useState('');
  const [payMethod, setPayMethod] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // ship fee ước tính
  const [shipFee, setShipFee] = useState(0);
  const [estimating, setEstimating] = useState(false);

  // chọn món để thanh toán
  const [selected, setSelected] = useState(() => new Set());
  const [buyOnly, setBuyOnly] = useState(false); // chế độ “Mua ngay”

  // nạp giỏ khi user đổi
  useEffect(() => { cart.init(); }, [user]);

  // địa chỉ của user
  const { list: addresses, loading: loadingAddrs } = useAddresses(user);

  // auto chọn mặc định
  useEffect(() => {
    if (!addresses.length) { setAddressId(''); return; }
    const def = addresses.find(a => a.isDefault) || addresses[0];
    setAddressId(String(def.id));
  }, [addresses.length]);

  // xử lý buy=1 (Mua ngay)
  useEffect(() => {
    const isBuyNow = sp.get('buy') === '1';
    if (!isBuyNow) { setBuyOnly(false); return; }
    const t = setTimeout(() => {
      const bn = getBuyNow(); // { id, qty }
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

  // giữ selection hợp lệ
  useEffect(() => {
    setSelected((prev) => {
      const ok = new Set(cart.items.map(idOf).map(String));
      const next = new Set();
      for (const id of prev) if (ok.has(String(id))) next.add(String(id));
      return next;
    });
  }, [cart.items]);

  // tổng giỏ
  const subtotalAll = useMemo(() => calcSubtotal(cart.items), [cart.items]);

  // items đã chọn
  const selectedItems = useMemo(() => {
    if (buyOnly) return cart.items.filter(i => selected.has(String(idOf(i))));
    return selected.size === 0 ? cart.items : cart.items.filter(i => selected.has(String(idOf(i))));
  }, [cart.items, selected, buyOnly]);

  const subtotalSelected = useMemo(() => calcSubtotal(selectedItems), [selectedItems]);

  // ước lượng phí ship
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

  const estimateSelected = subtotalSelected + shipFee;

  const allSelected = cart.items.length > 0 && cart.items.every(i => selected.has(String(idOf(i))));
  const someSelected = selected.size > 0 && !allSelected;

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
      if (s.size === cart.items.length) return new Set(); // đang chọn hết → bỏ hết
      return new Set(cart.items.map((x) => String(idOf(x))));
    });

  const parseErrorMessage = (e) => {
    if (!e) return 'Có lỗi xảy ra';
    try { const j = JSON.parse(e.message); return j?.message || e.message; }
    catch { return e.message || 'Có lỗi xảy ra'; }
  };

  const onCheckout = async () => {
    setErrMsg('');
    if (!cart.items.length) return alert('Giỏ hàng trống');
    if (!user) return nav('/login?next=/cart');
    if (selectedItems.length === 0) return alert('Vui lòng chọn ít nhất 1 sản phẩm');

    const selAddr = addresses.find(a => String(a.id) === String(addressId)) || null;
    if (!selAddr) return nav('/account?tab=addresses&add=1');

    // map items cho BE
    const items = selectedItems.map((i) => ({
      bookId: i.id || i.bookId,
      qty: Math.max(1, Number(i.quantity || 1)),
      price: Number(i.price || 0),
      title: i.title,
      categoryId: i.categoryId || null,
    }));

    // chuẩn hoá địa chỉ cho BE
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

      // Giữ lại món chưa mua
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
        {/* LIST */}
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
              {/* thanh công cụ chọn */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={toggleAll}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50"
                  title={allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                >
                  {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  {allSelected ? 'Bỏ chọn tất cả' : someSelected ? 'Chọn phần còn lại' : 'Chọn tất cả'}
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
                    <button
                      onClick={() => toggle(id)}
                      className="p-2"
                      title={checked ? 'Bỏ chọn' : 'Chọn sản phẩm này'}
                    >
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
                      <button
                        onClick={() => cart.update(id, Math.max(0, Number(i.quantity || 1) - 1))}
                        className="p-2 hover:bg-gray-100"
                        title="Giảm"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={Number(i.quantity || 1)}
                        onChange={(e) => cart.update(id, Number(e.target.value || 1))}
                        className="w-14 text-center outline-none"
                      />
                      <button
                        onClick={() => cart.update(id, Number(i.quantity || 1) + 1)}
                        className="p-2 hover:bg-gray-100"
                        title="Tăng"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => cart.remove(id)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="Xoá khỏi giỏ"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* SUMMARY */}
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
              <Link to="/account?tab=addresses&add=1" className="text-xs text-blue-600 hover:underline">
                Quản lý sổ địa chỉ
              </Link>
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
              <div className="text-xs text-gray-500 mt-1">
                Chưa có địa chỉ.{` `}
                <Link to="/account?tab=addresses&add=1" className="text-blue-600 underline">
                  Thêm ngay
                </Link>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Thanh toán</label>
            <select className="input w-full" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              <option value="cod">Thanh toán khi nhận hàng (COD)</option>
              {/* <option value="vnpay">VNPAY</option> */}
            </select>
          </div>

          <div className="text-sm space-y-1 border-t pt-3">
            <div className="flex justify-between">
              <span>Tổng giỏ (tạm tính)</span><b>{toVND(subtotalAll)}</b>
            </div>

            <div className="flex justify-between mt-3">
              <span>Đã chọn (tạm tính)</span><b>{toVND(subtotalSelected)}</b>
            </div>
            <div className="flex justify-between">
              <span>Phí vận chuyển (ước tính)</span>
              <b>{estimating ? 'Đang tính…' : toVND(shipFee)}</b>
            </div>
            <div className="flex justify-between text-lg pt-2">
              <span>Tổng thanh toán (đã chọn)</span>
              <b className="text-purple-600">{toVND(subtotalSelected + shipFee)}</b>
            </div>

            <div className="text-gray-500 text-xs">
              * Tổng cuối cùng sẽ do máy chủ xác nhận (đã tính giảm giá/thuế,…).<br/>
              * Ở chế độ <b>Mua ngay</b>, hệ thống chỉ thanh toán sản phẩm đã chọn.
            </div>
          </div>

          <button
            onClick={onCheckout}
            disabled={loading || cart.items.length === 0}
            className="btn-primary w-full"
          >
            {loading ? 'Đang đặt hàng…' : `Đặt hàng${buyOnly ? '' : selected.size === 0 ? ' (tất cả)' : ` (${selected.size})`}`}
          </button>

          <div className="text-center text-xs text-gray-500">
            <Link to="/categories" className="text-blue-600 hover:underline">Tiếp tục mua sắm</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
