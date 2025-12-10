import React, { useState } from 'react';
import api from '@/services/api'; 
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
    formData.append('image', file); 

    try {
      // Gọi API Backend
      const res = await api.post('/upload', formData); 
      
      // Backend trả về: { path: "https://res.cloudinary.com/...", ... }
      const finalPath = res.path || res.url || res.data?.path;

      if (finalPath) {
        if (onChange) onChange(finalPath);
      } else {
        throw new Error("Không nhận được link ảnh.");
      }

    } catch (e) {
      console.error("Upload error:", e);
      setError(e.response?.data?.message || e.message || 'Tải lên thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {value ? (
        <div className="relative group w-full max-w-[200px]">
          <img 
            // Vì link Cloudinary là tuyệt đối (https://), ta dùng trực tiếp
            src={value}
            alt="Preview" 
            className="w-full h-32 object-contain rounded-lg shadow-md border bg-gray-50"
            onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://placehold.co/400x300?text=Error";
            }}
          />
          <button
            type="button"
            onClick={() => onChange('')} 
            className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-sm hover:bg-red-600 transition-transform hover:scale-110"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className="w-full max-w-[300px] h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors bg-white">
            {loading ? (
              <Loader2 size={28} className="text-blue-500 animate-spin mb-2" />
            ) : (
              <Upload size={28} className="text-gray-400 mb-2" />
            )}
            <span className="text-sm text-gray-500 font-medium">
              {loading ? 'Đang đẩy lên mây...' : 'Tải ảnh bìa'}
            </span>
            <input 
              type="file" className="hidden" accept="image/*"
              onChange={handleFileChange} disabled={loading}
            />
        </label>
      )}
      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
    </div>
  );
}