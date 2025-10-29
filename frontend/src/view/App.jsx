// File: src/view/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

// Import component mới
import ProtectedRoute from './routes/ProtectedRoute'; // <-- THÊM DÒNG NÀY

// Public pages
import Home from './pages/Home'; //
import Login from './pages/Login'; //
import Categories from './pages/Categories'; //
import BookDetail from './pages/BookDetail'; //
import Cart from './pages/Cart'; //
import Orders from './pages/Orders'; //
import Account from './pages/Account'; //
import Wishlist from './pages/Wishlist'; //
import Support from './pages/Support'; //
import Search from './pages/Search'; //
import Authors from './pages/Authors'; //
import AuthorDetail from './pages/AuthorDetail'; //
import Promotions from './pages/Promotions'; //
import ForgotPassword from './pages/auth/ForgotPassword'; //
import ResetPassword from './pages/auth/ResetPassword'; //
import AboutUsPage from './pages/AboutUsPage'; //
import BlogPage from './pages/BlogPage'; //
import PostDetailPage from './pages/PostDetailPage'; //
import AccountInfo from './pages/AccountInfo'; //
import AddressBook from './pages/AddressBook'; //
import AccountReviews from './pages/AccountReviews'; //
import AccountComments from './pages/AccountComments'; //
import OrderSuccess from './pages/OrderSuccess';
import PaymentFailed from './pages/PaymentFailed';
import PaymentBank from './pages/PaymentBank';
// Admin
import AdminRoute from './routes/AdminRoute'; //
import AdminDashboard from './pages/admin/AdminDashboard'; //

// Toast
import Toast from './components/Toast'; //

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Các route công khai */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/categories/:slug" element={<Categories />} />
          <Route path="/books/:slug" element={<BookDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/support" element={<Support />} />
          <Route path="/search" element={<Search />} />
          <Route path="/promotions" element={<Promotions />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/authors" element={<Authors />} />
          <Route path="/authors/:id" element={<AuthorDetail />} />
          <Route path="/articles" element={<BlogPage />} />
          <Route path="/articles/:slug" element={<PostDetailPage />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/payment-failed" element={<PaymentFailed />} />
          <Route path="/payment-bank" element={<PaymentBank />} />


          {/* Các route CẦN ĐĂNG NHẬP */}
          <Route element={<ProtectedRoute />}>
            <Route path="/orders" element={<Orders />} />
            <Route path="/account" element={<Account />} />
            <Route path="/account/info" element={<AccountInfo />} />
            <Route path="/account/addresses" element={<AddressBook />} />
            <Route path="/account/reviews" element={<AccountReviews />} />
            <Route path="/account/comments" element={<AccountComments />} />
          </Route>
        </Route>

        {/* Admin Route */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toast />
    </>
  );
}