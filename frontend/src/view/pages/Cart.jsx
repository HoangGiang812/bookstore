import { useEffect, useMemo, useState } from 'react';
import { useCart } from '../../store/useCart';
import { useAuth } from '../../store/useAuth';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { shippingFee as calcShippingFee, calcSubtotal } from '../../services/cart';
import { create as createOrder } from '../../services/orders';
import { useNavigate } from 'react-router-dom';

/** (Demo) Hook lấy địa chỉ từ local nếu bạn chưa có API /api/addresses */
const useAddresses = (user) => {
  const [list, setList] = useState([]);
  useEffect(() => {
    if (!user) { setList([]); return; }
    // TODO: thay bằng fetch('/api/addresses') nếu đã có API
    setList([
      {
        id: 'addr1',
        isDefault: true,
        fullName: user.fullName || user.name || 'Khách hàng',
        phone: user.phone || '09xxxxxxx',
        address: '123 Lê Lợi, Bến Nghé, Q1, TP.HCM',
      },
    ]);
  }, [user]);
  return list;
};

export default function CartPage() {
  const cart = useCart();
  const { user } = useAuth();
  const nav = useNavigate();

  const [coupon, setCoupon] = useState('');
  const [addressId, setAddressId] = useState('');
  const [payMethod, setPayMethod] = useState('cod'); // 'cod' | 'vnpay' ...
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // Nạp giỏ khi trang mở hoặc khi user thay đổi
  useEffect(() => { cart.init(); }, [user]);

  // Tính tạm tính & phí ship trên FE (BE sẽ tính lại chuẩn)
  const subtotal = useMemo(() => calcSubtotal(cart.items), [cart.items]);
  const ship = useMemo(() => calcShippingFee(subtotal), [subtotal]);
  const totalPreview = subtotal + ship;

  // Địa chỉ
  const addresses = useAddresses(user);
  useEffect(() => {
    if (addresses.length) {
      const def = addresses.find((a) => a.isDefault) || addresses[0];
      setAddressId(def.id);
    } else {
      setAddressId('');
    }
  }, [addresses]);

  // Helper: parse message lỗi server (nếu server trả JSON)
  const parseErrorMessage = (e) => {
    if (!e) return 'Có lỗi xảy ra';
    try {
      const j = JSON.parse(e.message);
      return j?.message || e.message;
    } catch {
      return e.message || 'Có lỗi xảy ra';
    }
  };

  const onCheckout = async () => {
    setErrMsg('');

    if (!cart.items.length) {
      alert('Giỏ hàng trống');
      return;
    }
    if (!user) {
      nav('/login?next=/cart');
      return;
    }

    // Chuẩn hóa items theo BE: [{ bookId, qty, price?, title?, categoryId? }]
    const items = cart.items.map((i) => ({
      bookId: i.id || i.bookId,
      qty: Math.max(1, Number(i.quantity || 1)),
      // snapshot (tùy chọn) để BE hiển thị đúng tên/giá tại thời điểm đặt:
      price: Number(i.price || 0),
      title: i.title,
      categoryId: i.categoryId || null,
    }));

    // Map địa chỉ tối thiểu (có thể null nếu bạn chưa dùng)
    const sel = addresses.find((a) => a.id === addressId) || null;
    const shippingAddress = sel
      ? {
          label: 'Mặc định',
          receiver: sel.fullName,
          phone: sel.phone,
          province: '',
          district: '',
          ward: '',
          detail: sel.address,
          isDefault: true,
        }
      : null;

    const payload = {
      items,
      shippingAddress,
      payment: { method: payMethod },
      couponCode: coupon?.trim() || undefined,
    };

    try {
      setLoading(true);
      await createOrder(payload);     // POST /api/orders
      cart.clear();                   // Xóa giỏ local
      alert('Đặt hàng thành công!');
      nav('/orders');                 // Điều hướng sang danh sách đơn
    } catch (e) {
      if (String(e?.message || '').toLowerCase().includes('unauthorized')) {
        nav('/login?next=/cart');
        return;
      }
      // Hiển thị lỗi cụ thể từ server (ví dụ: Coupon invalid, No items, v.v.)
      setErrMsg(parseErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Giỏ hàng</h1>

      {/* Thông báo lỗi (nếu có) */}
      {errMsg && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          {errMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LIST */}
        <div className="lg:col-span-2 card p-4">
          {cart.items.length === 0 ? (
            <div className="text-gray-600">Giỏ hàng trống</div>
          ) : (
            cart.items.map((i) => {
              const lineTotal = Number(i.price || 0) * Number(i.quantity || 0);
              return (
                <div
                  key={i.id || i.bookId}
                  className="flex items-center gap-4 py-4 border-b last:border-b-0"
                >
                  <img
                    src={i.image}
                    alt={i.title}
                    className="w-20 h-24 object-cover rounded"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.jpg';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium line-clamp-2">{i.title}</div>
                    <div className="text-purple-600 font-semibold">
                      {Number(i.price || 0).toLocaleString('vi-VN')}đ
                    </div>
                    <div className="text-xs text-gray-500">
                      Thành tiền: {lineTotal.toLocaleString('vi-VN')}đ
                    </div>
                  </div>

                  <div className="flex items-center border rounded-lg">
                    <button
                      onClick={() =>
                        cart.update(i.id || i.bookId, Number(i.quantity || 1) - 1)
                      }
                      className="p-2 hover:bg-gray-100"
                      title="Giảm"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={Number(i.quantity || 1)}
                      onChange={(e) =>
                        cart.update(i.id || i.bookId, Number(e.target.value || 1))
                      }
                      className="w-14 text-center outline-none"
                    />
                    <button
                      onClick={() =>
                        cart.update(i.id || i.bookId, Number(i.quantity || 1) + 1)
                      }
                      className="p-2 hover:bg-gray-100"
                      title="Tăng"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => cart.remove(i.id || i.bookId)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Xoá khỏi giỏ"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* SUMMARY */}
        <aside className="card p-4 space-y-4">
          {/* Coupon: FE chỉ nhập, BE sẽ tự validate */}
          <div>
            <label className="block text-sm font-medium mb-2">Mã giảm giá</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Ví dụ: GIAM10"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              * Mã sẽ được kiểm tra ở bước tạo đơn.
            </p>
          </div>

          {/* Địa chỉ giao hàng (demo local) */}
          <div>
            <label className="block text-sm font-medium mb-2">Địa chỉ giao hàng</label>
            <select
              className="input w-full"
              value={addressId}
              onChange={(e) => setAddressId(e.target.value)}
            >
              <option value="">-- Chọn địa chỉ --</option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName} · {a.phone} · {a.address}
                </option>
              ))}
            </select>
          </div>

          {/* Phương thức thanh toán */}
          <div>
            <label className="block text-sm font-medium mb-2">Thanh toán</label>
            <select
              className="input w-full"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
            >
              <option value="cod">Thanh toán khi nhận hàng (COD)</option>
              {/* <option value="vnpay">VNPAY</option> */}
            </select>
          </div>

          {/* Tạm tính */}
          <div className="text-sm space-y-1 border-t pt-3">
            <div className="flex justify-between">
              <span>Tạm tính</span>
              <b>{subtotal.toLocaleString('vi-VN')}đ</b>
            </div>
            <div className="flex justify-between">
              <span>Phí vận chuyển</span>
              <b>{ship.toLocaleString('vi-VN')}đ</b>
            </div>
            <div className="flex justify-between text-lg pt-2">
              <span>Ước tính thanh toán</span>
              <b className="text-purple-600">
                {totalPreview.toLocaleString('vi-VN')}đ
              </b>
            </div>
            <div className="text-gray-500 text-xs">
              * Tổng cuối cùng sẽ do máy chủ xác nhận (đã tính giảm giá/thuế…)
            </div>
          </div>

          <button
            onClick={onCheckout}
            disabled={loading || !cart.items.length}
            className="btn-primary w-full"
          >
            {loading ? 'Đang đặt hàng…' : 'Đặt hàng'}
          </button>
        </aside>
      </div>
    </div>
  );
}
