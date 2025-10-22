// Thay thế toàn bộ file: src/view/pages/admin/Coupons.jsx

import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { Plus, Edit, Trash2, PauseCircle, PlayCircle, X } from 'lucide-react';
import CouponForm from './CouponForm'; // <-- Import form mới

// Hàm helper để format ngày
const formatDate = (dateString) => {
  if (!dateString) return 'Vô thời hạn';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateString));
  } catch (e) {
    return 'Ngày không hợp lệ';
  }
};

// Hàm helper để format giá trị
const formatValue = (coupon) => {
  if (coupon.type === 'percent') {
    return `${coupon.value}%`;
  }
  return `${Number(coupon.value || 0).toLocaleString('vi-VN')} đ`;
};

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State cho Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [couponToEdit, setCouponToEdit] = useState(null);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/coupons');
      // ===== ĐÂY LÀ DÒNG ĐÃ SỬA LỖI =====
      setCoupons(response.items || response || []); 
      setError(null);
    } catch (err) {
      console.error('Không thể tải danh sách coupon:', err);
      setError('Đã xảy ra lỗi khi tải dữ liệu.');
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // Xử lý Tạm dừng / Kích hoạt lại
  const handleToggleActive = async (coupon) => {
    const currentStatus = coupon.isActive === undefined ? coupon.active : coupon.isActive;
    const action = currentStatus ? 'pause' : 'resume';
    const endpoint = `/admin/coupons/${coupon._id}/${action}`;
    
    if (!window.confirm(`Bạn có chắc muốn ${action === 'pause' ? 'tạm dừng' : 'kích hoạt lại'} mã ${coupon.code}?`)) {
      return;
    }

    try {
      await api.post(endpoint); 
      fetchCoupons(); 
    } catch (err) {
      alert(`Lỗi: ${err.response?.data?.message || err.message}`);
    }
  };

  // Xử lý Xóa
  const handleDelete = async (coupon) => {
    if (!window.confirm(`Bạn có chắc muốn XÓA vĩnh viễn mã ${coupon.code}? Đây là hành động không thể hoàn tác.`)) {
      return;
    }
    try {
      // API của bạn: r.delete('/coupons/:id', ...guard, adminAudit, CouponCtrl.remove);
      await api.delete(`/admin/coupons/${coupon._id}`);
      fetchCoupons();
    } catch (err) {
      alert(`Lỗi: ${err.response?.data?.message || err.message}`);
    }
  };

  // Mở modal để tạo mới
  const handleOpenCreateModal = () => {
    setCouponToEdit(null); // Đảm bảo form là form tạo mới
    setIsModalOpen(true);
  };

  // Mở modal để chỉnh sửa
  const handleOpenEditModal = (coupon) => {
    setCouponToEdit(coupon);
    setIsModalOpen(true);
  };

  // Đóng modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCouponToEdit(null);
  };

  // Hàm callback khi form được submit thành công
  const handleFormSuccess = () => {
    handleCloseModal();
    fetchCoupons(); // Tải lại danh sách
  };


  return (
    <>
      {/* ===== MODAL TẠO/SỬA ===== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
            <CouponForm
              couponToEdit={couponToEdit}
              onSuccess={handleFormSuccess}
              onCancel={handleCloseModal}
            />
          </div>
        </div>
      )}

      {/* ===== NỘI DUNG TRANG CHÍNH ===== */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Khuyến mãi & Mã giảm giá</h2>
          <button
            onClick={handleOpenCreateModal} // <-- Bấm vào đây để mở modal
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Tạo mã mới
          </button>
        </div>

        {/* Phần Hiển thị Danh sách */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {loading && <div className="p-4 text-center">Đang tải danh sách...</div>}
          {error && <div className="p-4 text-center text-red-600">{error}</div>}
          
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                {/* ... (Phần thead giữ nguyên như cũ) ... */}
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã (Code)</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá trị</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sử dụng</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn tối thiểu</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày hết hạn</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {coupons.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                        Chưa có mã giảm giá nào.
                      </td>
                    </tr>
                  ) : (
                    coupons.map((coupon) => {
                      const isActive = coupon.isActive === undefined ? coupon.active : coupon.isActive;
                      return (
                        <tr key={coupon._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{coupon.code}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatValue(coupon)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {coupon.usedCount || 0} / {coupon.usageLimit || '∞'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{Number(coupon.minOrder || 0).toLocaleString('vi-VN')} đ</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(coupon.endAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isActive ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Đang chạy
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                Tạm dừng
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <button 
                              onClick={() => handleToggleActive(coupon)}
                              title={isActive ? 'Tạm dừng' : 'Kích hoạt lại'}
                              className={`p-1 rounded ${isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                            >
                              {isActive ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(coupon)} // <-- Nút sửa
                              className="p-1 text-blue-600 hover:text-blue-900"
                              title="Sửa"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(coupon)} // <-- Nút xóa
                              className="p-1 text-red-600 hover:text-red-900"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}