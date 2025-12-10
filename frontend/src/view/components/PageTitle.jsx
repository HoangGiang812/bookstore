import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TITLES = {
  '/': 'Trang chủ | BookStore',
  '/login': 'Đăng nhập | BookStore',
  '/register': 'Đăng ký | BookStore',
  '/cart': 'Giỏ hàng | BookStore',
  '/wishlist': 'Sách yêu thích | BookStore',
  '/categories': 'Tủ sách | BookStore',
  '/authors': 'Tác giả | BookStore',
  '/articles': 'Góc Tri Thức | BookStore',
  '/account/orders': 'Đơn hàng của tôi | BookStore',
  '/admin': 'Quản trị hệ thống | BookStore',
  '/about': 'Giới thiệu | BookStore',
};

export default function PageTitle() {
  const location = useLocation();

  useEffect(() => {
    // 1. Tìm tiêu đề trong map
    const path = location.pathname;
    let title = TITLES[path];

    // 2. Xử lý các trang chi tiết (nếu không khớp chính xác 100%)
    if (!title) {
        if (path.startsWith('/books/')) title = 'Chi tiết sách | BookStore';
        else if (path.startsWith('/authors/')) title = 'Thông tin tác giả | BookStore';
        else if (path.startsWith('/admin')) title = 'Quản trị | BookStore';
        else title = 'BookStore - Thế giới sách'; // Mặc định
    }

    // 3. Cập nhật tiêu đề tab
    document.title = title;
    
    // 4. Cuộn lên đầu trang mỗi khi chuyển trang (Tiện ích đi kèm)
    window.scrollTo(0, 0);

  }, [location]);

  return null; // Component này không vẽ gì ra màn hình cả
}