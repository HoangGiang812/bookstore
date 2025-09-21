// src/view/layouts/AdminLayout.jsx
import { Outlet } from 'react-router-dom'

export default function AdminLayout() {
  // Nếu muốn có header/sidebar riêng cho Admin thì đặt vào đây.
  // Hiện tại mình để trống để trang AdminDashboard tự lo layout của nó.
  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
    </div>
  )
}
