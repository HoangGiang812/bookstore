// src/view/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'

// Layouts
import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'

// Public pages
import Home from './pages/Home'
import Login from './pages/Login'
import Categories from './pages/Categories'
import BookDetail from './pages/BookDetail'
import Cart from './pages/Cart'
import Orders from './pages/Orders'
import Account from './pages/Account'
import Wishlist from './pages/Wishlist'
import Support from './pages/Support'
import Search from './pages/Search'
import Authors from './pages/Authors'
import AuthorDetail from './pages/AuthorDetail'
import Promotions from './pages/Promotions'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

// Admin
import AdminRoute from './routes/AdminRoute'
import AdminDashboard from './pages/admin/AdminDashboard'

// ✅ Toast hiển thị toàn app
// Nếu bạn đặt Toast ở: src/view/components/Toast.jsx
import Toast from './components/Toast'
// Nếu bạn dùng bản nâng cấp ở: src/components/ui/Toast.jsx
// -> đổi import thành: import Toast from '../components/ui/Toast'

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/:slug" element={<Categories />} />
          <Route path="/books/:slug" element={<BookDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/account" element={<Account />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/support" element={<Support />} />
          <Route path="/search" element={<Search />} />
          <Route path="/promotions" element={<Promotions />} />

          {/* Authors */}
          <Route path="/authors" element={<Authors />} />
          {/* Đổi :name -> :id để khớp BE và Link(`/authors/${a.id}`) */}
          <Route path="/authors/:id" element={<AuthorDetail />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* ✅ Toast đặt ngoài Routes để luôn hiện */}
      <Toast />
    </>
  )
}
