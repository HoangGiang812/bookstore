import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../store/useAuth'; //

export default function AdminRoute() {
  const { user } = useAuth(); //

  if (!user) {
    // Nếu chưa đăng nhập, chuyển về trang login
    return <Navigate to="/login" replace />; //
  }

  // ✅ Lấy mảng 'roles' từ user object (đã sửa ở Bước 1)
  const userRoles = user.roles || []; 

  // ✅ Kiểm tra xem user có phải admin HOẶC staff không
  const isAuthorized = userRoles.includes('admin') || userRoles.includes('staff');

  return isAuthorized ? <Outlet /> : <Navigate to="/" replace />; //
}