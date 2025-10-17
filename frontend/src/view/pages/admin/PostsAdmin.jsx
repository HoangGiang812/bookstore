// frontend/src/view/pages/admin/PostsAdmin.jsx
import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, BookOpen, Calendar, User } from 'lucide-react';
import api from "@/services/api";
import { useAuth } from "@/store/useAuth";// đảm bảo path này đúng theo dự án của bạn

function toSlug(s = '') {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function PostsAdmin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    featuredImage: '',
    status: 'draft',
    tags: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/posts', { params: { q } });
      setItems(r.items || r || []);
    } catch (e) {
      console.error('posts load error', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'title' && !editingId) {
      setForm(prev => ({ ...prev, slug: toSlug(value) }));
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      featuredImage: '',
      status: 'draft',
      tags: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const authorId = user?.id || user?._id;

    const payload = {
      title: form.title,
      slug: form.slug || toSlug(form.title),
      content: form.content,
      excerpt: form.excerpt,
      featuredImage: form.featuredImage,
      author: authorId,
      status: form.status,
      tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
    };

    if (!payload.title || !payload.content || !payload.excerpt || !payload.featuredImage || !payload.author) {
      alert('Vui lòng nhập đủ: Tiêu đề, Nội dung, Tóm tắt, Ảnh đại diện, Tác giả (đăng nhập).');
      return;
    }

    try {
      if (editingId) {
        await api.patch(`/admin/posts/${editingId}`, payload);
      } else {
        await api.post('/admin/posts', payload);
      }
      await load();
      setActiveTab('list');
      resetForm();
    } catch (e) {
      const msg = e?.response?.data?.message || 'Có lỗi xảy ra';
      alert(msg);
      console.error(e);
    }
  };

  const onEdit = (it) => {
    setEditingId(it._id || it.id);
    setForm({
      title: it.title || '',
      slug: it.slug || '',
      content: it.content || '',
      excerpt: it.excerpt || '',
      featuredImage: it.featuredImage || '',
      status: it.status || 'draft',
      tags: (it.tags || []).join(', '),
    });
    setActiveTab('create');
  };

  const onDelete = async (it) => {
    if (confirm('Xoá bài viết này?')) {
      await api.delete(`/admin/posts/${it._id || it.id}`);
      await load();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quản lý Bài viết</h1>
              <p className="text-gray-600 mt-1">Tạo và quản lý tin tức, bài viết cho website</p>
            </div>
            <button
              onClick={() => { setActiveTab('create'); resetForm(); }}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus size={20} />
              Tạo bài viết mới
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-6 py-4 font-medium transition ${
                activeTab === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Danh sách bài viết
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-6 py-4 font-medium transition ${
                activeTab === 'create' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {editingId ? 'Chỉnh sửa bài viết' : 'Tạo bài viết'}
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'list' ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && load()}
                  placeholder="Tìm kiếm bài viết..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="mt-3">
                <button
                  onClick={load}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={loading}
                >
                  {loading ? 'Đang tải...' : 'Lọc'}
                </button>
              </div>
            </div>

            {/* Posts List */}
            <div className="space-y-4">
              {items.map((post) => (
                <div key={post._id || post.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex gap-4">
                    {post.featuredImage && (
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">{post.title}</h3>
                          <p className="text-gray-600 mb-3 line-clamp-2">{post.excerpt}</p>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <BookOpen size={16} />
                              {(post.tags || []).join(', ')}
                            </div>
                            <div className="flex items-center gap-1">
                              <User size={16} />
                              {post.author?.name || '—'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar size={16} />
                              {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                post.status === 'published'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {post.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEdit(post)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => onDelete(post)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Xóa"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Không tìm thấy bài viết nào</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tiêu đề *</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Nhập tiêu đề bài viết..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                  <input
                    type="text"
                    name="slug"
                    value={form.slug}
                    onChange={handleChange}
                    placeholder="auto-tu-tieu-de"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="draft">Bản nháp</option>
                    <option value="published">Xuất bản</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">URL hình ảnh *</label>
                <input
                  type="text"
                  name="featuredImage"
                  value={form.featuredImage}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                {form.featuredImage && (
                  <img
                    src={form.featuredImage}
                    alt="Preview"
                    className="mt-3 w-48 h-32 object-cover rounded-lg"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tóm tắt *</label>
                <textarea
                  name="excerpt"
                  value={form.excerpt}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="2-3 câu mô tả ngắn..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (phân cách bằng dấu phẩy)</label>
                <input
                  type="text"
                  name="tags"
                  value={form.tags}
                  onChange={handleChange}
                  placeholder="đọc sách, phát triển bản thân"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung (HTML) *</label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  placeholder="<h1>Tiêu đề</h1><p>Nội dung...</p>"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  {editingId ? 'Cập nhật bài viết' : 'Tạo bài viết'}
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('list'); resetForm(); }}
                  className="px-8 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
