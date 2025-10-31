// File: src/view/pages/admin/ImageUploader.jsx
import React, { useState } from 'react';
import api, { getImageUrl } from '@/services/api';
import { Upload, X, Loader2 } from 'lucide-react';

// Thêm "export default" để sửa lỗi "does not provide an export named 'default'"
export default function ImageUploader({ value, onChange }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    const formData = new FormData();
    // Tên field 'image' phải khớp với upload.single('image') trong uploads.js
    formData.append('image', file); 

    try {
      const res = await api.post('/upload', formData); // Gọi API /api/upload
      if (onChange) {
        onChange(res.path); // Trả về /uploads/image.jpg
      }
    } catch (e) {
      setError(e.message || 'Tải lên thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {value ? (
        // 1. Đã có ảnh (URL hoặc Local)
        <div className="relative group w-48">
          <img 
            src={getImageUrl(value)} 
            alt="Preview" 
            className="w-48 h-auto object-cover rounded-lg shadow-sm"
            // Thêm fallback
            onError={(e) => (e.currentTarget.src = getImageUrl(null))}
          />
          <button
            type="button"
            onClick={() => onChange('')} // Nút Xóa
            className="absolute top-1 right-1 p-1 bg-white/70 rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Xóa ảnh"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        // 2. Khi chưa có ảnh
        <div className="w-48 h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-center">
          <label className="cursor-pointer text-gray-500 hover:text-blue-600">
            {loading ? (
              <Loader2 size={32} className="mx-auto animate-spin" />
            ) : (
              <Upload size={32} className="mx-auto" />
            )}
            <span className="mt-2 block">
              {loading ? 'Đang tải...' : 'Bấm để tải ảnh lên'}
            </span>
            <input 
              type="file" 
              className="hidden" 
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
              disabled={loading}
            />
          </label>
        </div>
      )}
      
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}