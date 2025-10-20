import { Link } from "react-router-dom";
import { useAuth } from "../../store/useAuth";

export default function AccountComments() {
  const { user } = useAuth();

  return (
    <div className="container px-4 py-6 grid lg:grid-cols-[280px,1fr] gap-6">
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
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100 font-medium">
            <span className="w-6 text-center">💬</span> Nhận xét của tôi
          </div>
          <Link to="/account/addresses" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
            <span className="w-6 text-center">📍</span> Sổ địa chỉ
          </Link>
          <Link to="/orders" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
            <span className="w-6 text-center">🧾</span> Quản lý đơn hàng
          </Link>
        </nav>
      </aside>

      <section className="bg-white rounded-xl border shadow-sm p-5">
        <h1 className="text-2xl font-semibold mb-4">Nhận xét của tôi</h1>
        <div className="text-gray-600">Trang ghi nhận các bình luận/nhận xét của bạn (tuỳ bạn triển khai nguồn dữ liệu).</div>
      </section>
    </div>
  );
}
