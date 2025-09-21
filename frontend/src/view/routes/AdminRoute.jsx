import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../store/useAuth' // ⬅️ đúng path tới store

export default function AdminRoute() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const role = String(user.role || '').toLowerCase()
  return (role === 'admin' || role === 'staff') ? <Outlet /> : <Navigate to="/" replace />
}
// Nếu user chưa đăng nhập, chuyển đến trang login