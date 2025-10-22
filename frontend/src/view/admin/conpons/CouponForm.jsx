// File: src/view/pages/admin/CouponForm.jsx

import React, { useState } from 'react';
import api from '@/services/api';

export default function CouponForm({ couponToEdit, onSuccess, onCancel }) {
  // Khởi tạo form state (trống hoặc với dữ liệu để edit)
  const [formData, setFormData] = useState({
    code: couponToEdit?.code || 'BOOK', // 4 kí tự đầu là BOOK
    type: couponToEdit?.type || 'percent', // 'percent' hoặc 'amount'
    value: couponToEdit?.value || 0,
    minOrder: couponToEdit?.minOrder || 0,
    maxDiscount: couponToEdit?.maxDiscount || 0,
    usageLimit: couponToEdit?.usageLimit || 100,
    startAt: couponToEdit?.startAt ? couponToEdit.startAt.split('T')[0] : '',
    endAt: couponToEdit?.endAt ? couponToEdit.endAt.split('T')[0] : '',
    isActive: couponToEdit?.isActive !== undefined ? couponToEdit.isActive : true,
    // TODO: Thêm đối tượng áp dụng (appliesTo) nếu cần
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // File: CouponForm.jsx

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Xử lý validation cho code
    if (name === 'code') {
      const prefix = 'BOOK';
      let suffix = '';

      // Tách phần hậu tố (8 ký tự sau 'BOOK')
      if (value.toUpperCase().startsWith(prefix)) {
        // Nếu người dùng gõ/dán 'BOOKabc' hoặc 'bookABC'
        suffix = value.substring(4);
      } else {
        // Nếu người dùng xóa 'BOOK' và gõ 'abc'
        suffix = value;
      }
      
      // Giới hạn hậu tố 8 ký tự
      if (suffix.length > 8) {
        suffix = suffix.substring(0, 8);
      }
      
      const newCode = prefix + suffix;

      setFormData((prev) => ({ ...prev, code: newCode }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // File: CouponForm.jsx

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation (đã cập nhật)
    if (!formData.code.startsWith('BOOK') || formData.code.length !== 12) {
      setError('Mã code phải bắt đầu bằng "BOOK" và có đúng 12 ký tự (ví dụ: BOOKaB12cDeF).');
      return;
    }
    if (Number(formData.value) <= 0) {
      setError('Giá trị giảm giá phải lớn hơn 0.');
      return;
    }
    if (formData.type === 'percent' && Number(formData.value) > 100) {
      setError('Giảm giá % không được vượt quá 100.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        // Chuyển đổi về Number
        value: Number(formData.value),
        minOrder: Number(formData.minOrder),
        maxDiscount: formData.type === 'amount' ? 0 : Number(formData.maxDiscount),
        usageLimit: Number(formData.usageLimit),
        // Gửi null nếu ngày trống
        startAt: formData.startAt || null,
        endAt: formData.endAt || null,
      };

      if (couponToEdit) {
        // Cập nhật (Edit)
        await api.patch(`/admin/coupons/${couponToEdit._id}`, payload);
      } else {
        // Tạo mới (Create)
        await api.post('/admin/coupons', payload);
      }
      onSuccess(); // Gọi hàm onSuccess (tải lại list, đóng modal)
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (msg.includes('duplicate key')) {
        setError('Mã code này đã tồn tại. Vui lòng chọn mã khác.');
      } else {
        setError(`Lỗi: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xl font-semibold">{couponToEdit ? 'Chỉnh sửa mã' : 'Tạo mã giảm giá mới'}</h3>

      {/* Mã Code */}
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700">
          Mã (12 ký tự, bắt đầu bằng BOOK)
        </label>
        <input
          type="text"
          name="code"
          id="code"
          value={formData.code}
          onChange={handleChange}
          maxLength={12}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Loại giảm giá */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            Loại giảm giá
          </label>
          <select
            name="type"
            id="type"
            value={formData.type}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="percent">Phần trăm (%)</option>
            <option value="amount">Số tiền cố định (đ)</option>
          </select>
        </div>
        {/* Giá trị */}
        <div>
          <label htmlFor="value" className="block text-sm font-medium text-gray-700">
            Giá trị (ví dụ: 10% hoặc 50000)
          </label>
          <input
            type="number"
            name="value"
            id="value"
            value={formData.value}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Đơn tối thiểu */}
        <div>
          <label htmlFor="minOrder" className="block text-sm font-medium text-gray-700">
            Đơn hàng tối thiểu (đ)
          </label>
          <input
            type="number"
            name="minOrder"
            id="minOrder"
            value={formData.minOrder}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        {/* Giảm tối đa */}
        <div>
            <label htmlFor="maxDiscount" className="block text-sm font-medium text-gray-700">
                Giảm tối đa (đ)
            </label>
            <input
                type="number"
                name="maxDiscount"
                id="maxDiscount"
                value={formData.maxDiscount}
                onChange={handleChange}
                disabled={formData.type === 'amount'}
                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm 
                            ${formData.type === 'amount' 
                                ? 'bg-gray-100 cursor-not-allowed' 
                                : 'focus:ring-blue-500 focus:border-blue-500'
                            }`}
            />
            <p className="mt-1 text-xs text-gray-500">Để 0 nếu không giới hạn.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Số lượng */}
        <div>
          <label htmlFor="usageLimit" className="block text-sm font-medium text-gray-700">
            Số lượng mã
          </label>
          <input
            type="number"
            name="usageLimit"
            id="usageLimit"
            value={formData.usageLimit}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        {/* Trạng thái */}
        <div className="flex items-center pt-6">
          <input
            id="isActive"
            name="isActive"
            type="checkbox"
            checked={formData.isActive}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
            Kích hoạt
          </label>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Ngày bắt đầu */}
        <div>
          <label htmlFor="startAt" className="block text-sm font-medium text-gray-700">
            Ngày bắt đầu
          </label>
          <input
            type="date"
            name="startAt"
            id="startAt"
            value={formData.startAt}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        {/* Ngày kết thúc */}
        <div>
          <label htmlFor="endAt" className="block text-sm font-medium text-gray-700">
            Ngày kết thúc
          </label>
          <input
            type="date"
            name="endAt"
            id="endAt"
            value={formData.endAt}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Thông báo lỗi */}
      {error && (
        <div className="text-red-600 text-sm p-3 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      {/* Nút bấm */}
      <div className="flex justify-end gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:bg-blue-400"
        >
          {loading ? 'Đang lưu...' : (couponToEdit ? 'Cập nhật' : 'Tạo mã')}
        </button>
      </div>
    </form>
  );
}