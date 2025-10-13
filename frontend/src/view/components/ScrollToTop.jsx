// File: src/view/components/ScrollToTop.jsx (ĐÃ SỬA LỖI)

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToTop() {
  // Lấy ra toàn bộ đối tượng "location" thay vì chỉ "pathname"
  const location = useLocation();

  useEffect(() => {
    // Cuộn cửa sổ trình duyệt lên vị trí trên cùng
    window.scrollTo(0, 0);
  }, [location]); // <<< THAY ĐỔI QUAN TRỌNG: Lắng nghe sự thay đổi của cả đối tượng "location"

  return null;
}

export default ScrollToTop;