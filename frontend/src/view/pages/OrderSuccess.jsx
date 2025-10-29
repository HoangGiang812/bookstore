// src/view/pages/OrderSuccess.jsx
import { useSearchParams, Link } from 'react-router-dom';

export default function OrderSuccess(){
  const [params] = useSearchParams();
  const code = params.get('code') || '';

  return (
    <div className="container px-4 py-16">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-8 text-center">
        <div className="text-3xl font-semibold mb-2">🎉 Thanh toán thành công</div>
        {code && <div className="text-gray-700 mb-4">Mã đơn hàng của bạn: <b>{code}</b></div>}
        <div className="flex gap-3 justify-center mt-6">
          <Link to="/account/orders" className="px-4 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700">
            Xem đơn hàng
          </Link>
          <Link to="/categories" className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200">
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    </div>
  );
}
