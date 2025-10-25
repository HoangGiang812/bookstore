// File: src/view/pages/Wishlist.jsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../../store/useWishlist';
import DealCard from '../components/DealCard'; // Tái sử dụng DealCard
import { useCart } from '../../store/useCart';
import { useAuth } from '../../store/useAuth'; //
import { useNavigate } from 'react-router-dom';
import * as CartSvc from '../../services/cart'; //

export default function Wishlist() {
  const { wishlist, loading, fetchWishlist } = useWishlist();
  const { user } = useAuth();
  
  // Tải lại danh sách khi vào trang (để đảm bảo luôn mới nhất)
  useEffect(() => {
    if (user) { // <-- SỬA: Thêm điều kiện if (user)
      fetchWishlist();
    }
    // (Nếu không có user, nó sẽ không làm gì, 
    // và state 'wishlist' sẽ là mảng rỗng do Bước 1 đã clear)
  }, [user, fetchWishlist]); // <-- SỬA: Thêm 'user' vào dependency

  // Lấy các hàm xử lý "Thêm giỏ" và "Mua ngay"
  // (Giống như logic trong Home.jsx và Categories.jsx)
  const cart = useCart();
  const nav = useNavigate();

  const handleAdd = (bk) => {
    cart.add(bk, 1);
    // Phát event cho Header.jsx cập nhật
    try {
      localStorage.setItem("__cart_bump__", String(Date.now()));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("cart:changed"));
    } catch {}
  };

  const handleBuy = (bk) => {
    const q = 1;
    cart.add(bk, q);
    CartSvc.setBuyNow({ id: bk.id || bk._id, qty: q }); //
    // (Không cần kiểm tra user vì trang này đã được bảo vệ)
    nav("/cart?buy=1");
  };

  return (
    <div className="container px-4 py-8 min-h-[60vh]">
      <h1 className="text-3xl font-bold mb-6">Danh sách yêu thích</h1>

      {loading && (
        <div className="text-center text-gray-600">Đang tải danh sách...</div>
      )}

      {!loading && wishlist.length === 0 && (
        <div className="text-center text-gray-600">
          <p>Bạn chưa có sản phẩm nào trong danh sách yêu thích.</p>
          <Link to="/categories" className="text-blue-600 hover:underline mt-2 inline-block">
            Tiếp tục mua sắm
          </Link>
        </div>
      )}

      {!loading && wishlist.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {wishlist.map(book => (
            <DealCard
              key={book._id || book.id}
              book={book}
              onAdd={handleAdd}
              onBuy={handleBuy}
            />
          ))}
        </div>
      )}
    </div>
  );
}