// File: src/routes/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/useAuth'; 

const ProtectedRoute = () => {
  const { user } = useAuth(); //
  const location = useLocation();
  const isLoggedIn = !!user;

  if (!isLoggedIn) {
    // Chuyển hướng đến trang đăng nhập
    // Lưu lại trang hiện tại để quay lại sau khi đăng nhập
    return <Navigate to="/login" state={{ from: location }} replace />; //
  }

  return <Outlet />; // Cho phép truy cập
};

export default ProtectedRoute;