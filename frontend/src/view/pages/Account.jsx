// src/view/pages/account/AccountLayout.jsx
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '@/store/useAuth';

export default function AccountLayout() {
  const { user } = useAuth();
  return (
    <div className="bg-gray-50">
      <div className="container px-4 pt-4 text-sm text-gray-500">
        <Link to="/" className="hover:underline">Trang chủ</Link>
        <span className="mx-2">›</span>
        <span>Tài khoản</span>
      </div>

      <div className="container px-4 py-6 grid lg:grid-cols-[280px,1fr] gap-6">
        {/* Sidebar */}
        <aside className="bg-white rounded-xl border shadow-sm">
          <div className="flex items-center gap-3 px-4 py-4 border-b">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-xl">👤</span>
            </div>
            <div>
              <div className="text-xs text-gray-500">Tài khoản của</div>
              <div className="font-semibold text-gray-900">
                {user?.name || user?.email || 'Bạn'}
              </div>
            </div>
          </div>

          <nav className="p-2 text-[15px]">
            <Link to="/account/info" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">👤 Thông tin tài khoản</Link>
            <Link to="/account/reviews" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">⭐ Đánh giá sản phẩm</Link>
            <Link to="/account/comments" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">💬 Nhận xét của tôi</Link>
            <Link to="/account/addresses" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">📍 Sổ địa chỉ</Link>
            <Link to="/account/orders" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">🧾 Quản lý đơn hàng</Link>
          </nav>
        </aside>

        {/* Nội dung trang con */}
        <section className="bg-white rounded-xl border shadow-sm">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
