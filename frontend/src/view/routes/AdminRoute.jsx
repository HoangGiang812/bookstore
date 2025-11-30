import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../store/useAuth';

export default function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-10 text-center">Đang tải...</div>;

  // Nếu chưa đăng nhập -> Về login
  if (!user) return <Navigate to="/login" replace />;

  // Lấy role (xử lý cả mảng và chuỗi đơn)
  const roles = user.roles || [user.role] || [];

  // --- SỬA DÒNG NÀY ---
  // Cho phép: admin, staff, HOẶC shipper
  const isAllowed = roles.some(r => ['admin', 'staff', 'shipper'].includes(r));
  // --------------------

  if (!isAllowed) {
    // Nếu không có quyền -> Về trang chủ (hoặc trang báo lỗi 403)
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}