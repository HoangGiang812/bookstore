import React, { useState, useEffect, useMemo } from 'react';
import api from '@/services/api'; 
import { listBooks } from '@/services/admin'; 
// ✅ 1. Thêm 'Edit2'
import { Plus, Edit2, Trash2, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';

// ... (Giữ nguyên toàn bộ Component CON: BookSelector và CollectionModal)
/* =============================================
 * COMPONENT CON: BookSelector (Trình chọn sách)
 * ============================================= */
const BookSelector = ({ allBooks, selectedIds, onToggleBook }) => {
  const [filter, setFilter] = useState('');
  const filteredBooks = useMemo(() => {
    const lowerFilter = filter.toLowerCase();
    return allBooks.filter(book => 
      book.title.toLowerCase().includes(lowerFilter)
    );
  }, [allBooks, filter]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <div className="border rounded-lg">
      <div className="p-2 border-b">
        <input
          type="text"
          placeholder="Tìm sách để thêm..."
          className="input w-full"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filteredBooks.map(book => {
          const isSelected = selectedSet.has(book._id);
          return (
            <div 
              key={book._id} 
              className={`flex items-center justify-between p-2 ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <span className="text-sm">{book.title}</span>
              <button
                type="button"
                onClick={() => onToggleBook(book._id)}
                className={`text-sm px-2 py-0.5 rounded ${
                  isSelected 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {isSelected ? 'Gỡ' : 'Thêm'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* =============================================
 * COMPONENT MODAL (Tạo/Sửa Bộ sưu tập)
 * ============================================= */
const CollectionModal = ({ collection, onClose, onSave }) => {
  const [name, setName] = useState(collection ? collection.name : '');
  const [description, setDescription] = useState(collection ? collection.description : '');
  const [selectedBookIds, setSelectedBookIds] = useState(collection ? (collection.books || []).map(b => b._id) : []);
  const [selectedBookObjects, setSelectedBookObjects] = useState(collection ? (collection.books || []) : []);
  const [allBooks, setAllBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    listBooks({ limit: 5000 }).then(res => {
      setAllBooks(res.items || res);
    });
  }, []);

  const handleToggleBook = (bookId) => {
    if (selectedBookIds.includes(bookId)) {
      setSelectedBookIds(ids => ids.filter(id => id !== bookId));
      setSelectedBookObjects(books => books.filter(b => b._id !== bookId));
    } else {
      const bookToAdd = allBooks.find(b => b._id === bookId);
      if (bookToAdd) {
        setSelectedBookIds(ids => [...ids, bookId]);
        setSelectedBookObjects(books => [...books, bookToAdd]);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        name,
        description,
        books: selectedBookIds
      };
      await onSave(payload);
    } catch (err) {
      alert("Lỗi: " + (err.message || "Không thể lưu"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
        <form onSubmit={handleSubmit}>
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-xl font-semibold">
              {collection ? 'Sửa Bộ sưu tập' : 'Tạo Bộ sưu tập'}
            </h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
            {/* Cột 1: Thông tin và Sách đã chọn */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tên Bộ sưu tập</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mô tả (cho Admin)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input w-full"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Sách đã chọn ({selectedBookIds.length})
                </label>
                <div className="border rounded-lg max-h-64 overflow-y-auto mt-1">
                  {selectedBookObjects.length === 0 ? (
                    <p className="p-2 text-sm text-gray-400">Chưa có sách nào.</p>
                  ) : (
                    selectedBookObjects.map(book => (
                      <div key={book._id} className="flex items-center justify-between p-2 border-b">
                        <span className="text-sm">{book.title}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleBook(book._id)}
                          className="text-sm text-red-700"
                        >
                          Gỡ
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            {/* Cột 2: Trình chọn sách */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Tìm & Thêm sách</label>
              <BookSelector
                allBooks={allBooks}
                selectedIds={selectedBookIds}
                onToggleBook={handleToggleBook}
              />
            </div>
          </div>
          <div className="flex justify-end p-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="mr-3 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isLoading ? 'Đang lưu...' : 'Lưu Bộ sưu tập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =============================================
 * COMPONENT TAB CHÍNH
 * ============================================= */
export default function CollectionsTab({ searchTerm }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/collections');
      setCollections(res.items || []);
    } catch (err) {
      alert("Lỗi tải bộ sưu tập: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const filteredCollections = useMemo(() => {
    const lowerSearch = (searchTerm || '').toLowerCase();
    return collections.filter(c => c.name.toLowerCase().includes(lowerSearch));
  }, [collections, searchTerm]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCollection(null);
  };
  const handleCreate = () => {
    setEditingCollection(null); 
    setIsModalOpen(true);
  };
  const handleEdit = async (collection) => {
    try {
      const details = await api.get(`/admin/collections/${collection._id}`);
      setEditingCollection(details); 
      setIsModalOpen(true);
    } catch (err) {
      alert("Lỗi tải chi tiết: " + err.message);
    }
  };
  const handleDelete = async (collectionId) => {
    if (!window.confirm("Bạn có chắc muốn xóa bộ sưu tập này?")) return;
    try {
      await api.delete(`/admin/collections/${collectionId}`);
      alert("Xóa thành công");
      fetchCollections(); 
    } catch (err) {
      alert("Lỗi khi xóa: " + err.message);
    }
  };
  const handleSave = async (payload) => {
    try {
      if (editingCollection) {
        await api.patch(`/admin/collections/${editingCollection._id}`, payload);
      } else {
        await api.post('/admin/collections', payload);
      }
      alert("Lưu thành công!");
      handleCloseModal();
      fetchCollections(); 
    } catch (err) {
       alert("Lỗi: " + (err.message || "Không thể lưu"));
    }
  };

  if (loading) return <div className="p-4">Đang tải...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý Bộ sưu tập</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          Tạo mới
        </button>
      </div>

      {/* Bảng danh sách */}
      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên Bộ sưu tập</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug (URL)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số sách</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCollections.map((collection) => (
              <tr key={collection._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{collection.name}</td>
                {/* ✅ 2. Sửa SLUG cho đẹp hơn */}
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <code className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{collection.slug}</code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{collection.bookCount}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  {/* ✅ 3. Sửa nút SỬA */}
                  <button
                    onClick={() => handleEdit(collection)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                    title="Sửa"
                  >
                    <Edit2 size={16} />
                    Sửa
                  </button>
                  {/* ✅ 4. Sửa nút XÓA */}
                  <button
                    onClick={() => handleDelete(collection._id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                    title="Xóa"
                  >
                    <Trash2 size={16} />
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <CollectionModal
          collection={editingCollection}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
}