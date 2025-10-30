import React, { useState, useEffect, useMemo } from 'react';
import api from '@/services/api';
import { Edit, Trash2, X, Plus, ChevronRight } from 'lucide-react';

// --- Helper (Giữ nguyên) ---
function flattenCategories(categories, depth = 0) {
  let result = [];
  for (const cat of categories) {
    result.push({
      _id: cat._id,
      name: cat.name,
      displayName: `${'— '.repeat(depth)}${cat.name}`,
    });
    if (cat.children && cat.children.length > 0) {
      result = result.concat(flattenCategories(cat.children, depth + 1));
    }
  }
  return result;
}

const DEFAULT_FORM_STATE = { name: '', parentId: '', sort: 0 };

export default function CategoryPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // State cho form (dùng cho cả Tạo mới và Sửa)
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
  const [editingCategory, setEditingCategory] = useState(null); // null = Chế độ Tạo mới

  // Hàm tải danh mục
  const fetchCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/categories/tree'); // API đã có
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      setCategories(items);
    } catch (e) {
      setError(e.message || 'Không thể tải danh mục');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Memo cho dropdown <select> (Giữ nguyên)
  const categoryOptions = useMemo(() => {
    return flattenCategories(categories);
  }, [categories]);

  // --- Các hàm xử lý ---

  // 1. Nhấn nút "Sửa"
  const handleSelectForEdit = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      parentId: cat.parentId || '',
      sort: cat.sort || 0,
    });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 2. Nhấn nút "Hủy" (khi đang sửa)
  const handleCancelEdit = () => {
    setEditingCategory(null);
    setFormData(DEFAULT_FORM_STATE);
    setError('');
  };

  // 3. Nhấn nút "Xóa"
  const handleDelete = async (cat) => {
    if (window.confirm(`Bạn có chắc muốn xóa danh mục "${cat.name}"? Sách thuộc danh mục này cũng có thể bị ảnh hưởng.`)) {
      setLoading(true);
      setError('');
      try {
        await api.delete(`/categories/${cat._id}`); // API đã có
        await fetchCategories();
        if (editingCategory && editingCategory._id === cat._id) {
          handleCancelEdit();
        }
      } catch (e) {
        setError(e.message || 'Xóa thất bại. (Danh mục có thể đang chứa con hoặc được gán cho sách)'); //
      } finally {
        setLoading(false);
      }
    }
  };

  // 4. Xử lý "Tạo mới" hoặc "Cập nhật"
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Tên danh mục không được để trống');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const payload = {
      name: formData.name,
      parentId: formData.parentId || null,
      sort: Number(formData.sort) || 0,
    };

    try {
      if (editingCategory) {
        // Chế độ Sửa (Update)
        await api.put(`/categories/${editingCategory._id}`, payload); // API đã có
      } else {
        // Chế độ Tạo mới (Create)
        await api.post('/categories', payload); // API đã có
      }
      
      handleCancelEdit();
      await fetchCategories();
      
    } catch (e) {
      setError(e.message || 'Thao tác thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Cột trái: Form (BỎ STICKY) */}
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-lg shadow"> {/* Không còn sticky */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {editingCategory ? 'Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
            </h2>
            {editingCategory && (
              <button
                onClick={handleCancelEdit}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <X size={16} /> Hủy
              </button>
            )}
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên danh mục
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input w-full"
                placeholder="Ví dụ: Văn học"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Danh mục cha
              </label>
              <select
                value={formData.parentId}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                className="input w-full"
                // Khi sửa, không cho phép chọn chính nó làm cha
                disabled={!!editingCategory} 
              >
                <option value="">-- Là danh mục gốc --</option>
                {categoryOptions
                  // Lọc bỏ chính danh mục đang sửa
                  .filter(cat => !editingCategory || cat._id !== editingCategory._id)
                  .map(cat => (
                  <option key={cat._id} value={cat._id}>
                    {cat.displayName}
                  </option>
                ))}
              </select>
               {editingCategory && (
                <p className="text-xs text-gray-500 mt-1">Không thể thay đổi danh mục cha khi đang chỉnh sửa.</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thứ tự sắp xếp (Sort)
              </label>
              <input
                type="number"
                value={formData.sort}
                onChange={(e) => setFormData({ ...formData, sort: e.target.value })}
                className="input w-full"
                placeholder="0"
              />
               <p className="text-xs text-gray-500 mt-1">Số nhỏ hơn sẽ được ưu tiên hiển thị trước.</p>
            </div>

            {error && (
              <div className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg">{error}</div>
            )}

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? 'Đang lưu...' : (editingCategory ? 'Cập nhật danh mục' : 'Tạo mới danh mục')}
            </button>
          </form>
        </div>
      </div>

      {/* Cột phải: Danh sách (SỬA LỖI SCROLL) */}
      <div className="lg:col-span-2">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Danh Sách Danh Mục</h2>
          
          {/* Thêm div bọc ngoài để cuộn độc lập */}
          <div className="max-h-[75vh] overflow-y-auto pr-2">
            {loading && <p>Đang tải danh sách...</p>}
            {!loading && categories.length === 0 && (
              <p>Chưa có danh mục nào.</p>
            )}
            {!loading && categories.length > 0 && (
              <div className="space-y-1">
                {categories.map(cat => (
                  <CategoryItem
                    key={cat._id}
                    cat={cat}
                    onEdit={handleSelectForEdit}
                    onDelete={handleDelete}
                    depth={0}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Component Item Danh Mục (Giao diện + Hiệu ứng mới) ---
function CategoryItem({ cat, onEdit, onDelete, depth }) {
  const [isExpanded, setIsExpanded] = useState(true); // Mặc định mở
  const hasChildren = cat.children && cat.children.length > 0;

  return (
    <div className="rounded-lg">
      {/* Hàng của danh mục cha */}
      <div 
        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 group transition-colors"
        style={{ paddingLeft: `${depth * 1.25}rem` }} // Thụt lề theo cấp
      >
        <div className="flex items-center gap-1">
          {hasChildren ? (
            <button 
              onClick={() => setIsExpanded(!isExpanded)} 
              className="p-1 rounded-full hover:bg-gray-200"
            >
              <ChevronRight 
                size={16} 
                className={`transform transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`} 
              />
            </button>
          ) : (
            <span className="w-7 h-7"></span> // Placeholder để căn chỉnh
          )}
          <span className="font-medium text-gray-800 group-hover:text-black">{cat.name}</span>
        </div>

        {/* Nút Sửa/Xóa (chỉ hiện khi hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(cat)}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Sửa"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => onDelete(cat)}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Xóa"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Render danh mục con (nếu có và đang mở) */}
      {isExpanded && hasChildren && (
        <div className="mt-1 space-y-1">
          {cat.children.map(child => (
            <CategoryItem
              key={child._id}
              cat={child}
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}