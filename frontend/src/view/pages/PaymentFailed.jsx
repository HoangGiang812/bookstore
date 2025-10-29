// src/view/pages/PaymentFailed.jsx
import { Link, useSearchParams } from 'react-router-dom';

export default function PaymentFailed(){
  const [params] = useSearchParams();
  const code = params.get('code') || '';

  return (
    <div className="container px-4 py-16">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-8 text-center">
        <div className="text-3xl font-semibold mb-2">⚠️ Thanh toán không thành công</div>
        {code && <div className="text-gray-700 mb-4">Đơn hàng: <b>{code}</b></div>}
        <div className="text-gray-600">Vui lòng thử lại hoặc chọn phương thức khác.</div>
        <div className="flex gap-3 justify-center mt-6">
          <Link to="/cart" className="px-4 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700">
            Thanh toán lại
          </Link>
          <Link to="/account/orders" className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200">
            Đơn hàng của tôi
          </Link>
        </div>
      </div>
    </div>
  );
}
