// File: src/view/pages/admin/ImageUploader.jsx
import React, { useState } from 'react';
import api, { getImageUrl } from '@/services/api';
import { Upload, X, Loader2 } from 'lucide-react';

export default function ImageUploader({ value, onChange }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    const formData = new FormData();
    // Quan trọng: key 'image' phải khớp với backend (upload.single('image'))
    formData.append('image', file); 

    try {
      // Gọi API upload (không cần set headers thủ công)
      const res = await api.post('/upload', formData); 
      
      // --- LOGIC XỬ LÝ ĐƯỜNG DẪN AN TOÀN (Giống AccountInfo) ---
      // 1. Lấy đường dẫn thô từ nhiều trường hợp có thể trả về
      let rawPath = res.path || res.url || res.data?.path;
      
      // 2. Nếu backend chỉ trả về filename, tự thêm prefix /uploads/
      if (!rawPath && res.filename) {
           rawPath = `/uploads/${res.filename}`; 
      }

      if (rawPath) {
        // 3. Chuẩn hóa dấu gạch chéo (Fix lỗi trên Windows)
        const cleanPath = rawPath.replace(/\\/g, '/');
        
        // 4. Đảm bảo bắt đầu bằng / (trừ khi là link http tuyệt đối)
        const finalPath = (cleanPath.startsWith('http') || cleanPath.startsWith('/')) 
                          ? cleanPath 
                          : `/${cleanPath}`;
                          
        // 5. Gửi đường dẫn chuẩn về cho component cha
        if (onChange) {
            onChange(finalPath);
        }
      } else {
          throw new Error("Server không trả về đường dẫn ảnh hợp lệ.");
      }

    } catch (e) {
      console.error("Upload error:", e);
      setError(e.message || 'Tải lên thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {value ? (
        // TRƯỜNG HỢP 1: ĐÃ CÓ ẢNH
        <div className="relative group w-full max-w-[200px]">
          <img 
            src={getImageUrl(value)} 
            alt="Preview" 
            className="w-full h-32 object-cover rounded-lg shadow-md border border-gray-200"
            onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
          />
          {/* Nút xóa ảnh */}
          <button
            type="button"
            onClick={() => onChange('')} 
            className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-sm hover:bg-red-600 transition-transform hover:scale-110"
            title="Xóa ảnh"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        // TRƯỜNG HỢP 2: CHƯA CÓ ẢNH (Hiện khung upload)
        <label className="w-full max-w-[300px] h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors bg-white">
            {loading ? (
              <Loader2 size={28} className="text-blue-500 animate-spin mb-2" />
            ) : (
              <Upload size={28} className="text-gray-400 mb-2" />
            )}
            <span className="text-sm text-gray-500 font-medium">
              {loading ? 'Đang tải lên...' : 'Tải ảnh bìa'}
            </span>
            <input 
              type="file" 
              className="hidden" 
              accept="image/png, image/jpeg, image/webp, image/jpg"
              onChange={handleFileChange}
              disabled={loading}
            />
        </label>
      )}
      
      {error && <p className="text-red-600 text-xs mt-2 text-center">{error}</p>}
    </div>
  );
}