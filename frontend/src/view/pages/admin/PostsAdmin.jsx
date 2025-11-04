// frontend/src/view/pages/admin/PostsAdmin.jsx
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, BookOpen, Calendar, User, X} from 'lucide-react';
import api, { getImageUrl } from "@/services/api";
import { useAuth } from "@/store/useAuth";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ImageUploader from './ImageUploader.jsx';

function toSlug(s = '') {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const quillFormats = [
  'header', 'font', 'size',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'script', 'list', 'bullet', 'indent',
  'align', 'link', 'image', 'video',
  'blockquote', 'code-block'
];

function TabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium -mb-px ${
        active 
          ? 'border-b-2 border-blue-600 text-blue-600' 
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

export default function PostsAdmin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageTab, setImageTab] = useState('upload');
  const quillRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    featuredImage: '',
    status: 'draft',
    tags: [],
  });

  const [tagInput, setTagInput] = useState('');

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

  const handleContentChange = (value) => {
    setForm(prev => ({ ...prev, content: value }));
  };

  const handleImageChange = (newImageUrl) => {
    setForm(prev => ({
      ...prev,
      featuredImage: newImageUrl,
    }));
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
      tags: [],
    });
    setImageTab('upload');
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!form.tags.includes(newTag)) {
        // Cập nhật mảng tags trong state
        setForm(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
      }
      setTagInput(''); // Xóa ô nhập
    }
  };

  const removeTag = (tagToRemove) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const quillImageHandler = useCallback(async () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('image', file); // Gửi file với key 'image'

      try {
        // Gọi API upload của bạn
        const res = await api.post('/upload', formData); //
        const url = getImageUrl(res.path); // Lấy URL đầy đủ

        // Chèn ảnh vào trình soạn thảo
        const editor = quillRef.current.getEditor();
        const range = editor.getSelection(true);
        editor.insertEmbed(range.index, 'image', url);
        editor.setSelection(range.index + 1);
      } catch (e) {
        alert('Lỗi tải ảnh: ' + e.message);
      }
    };
  }, []);

  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['link', 'image', 'video'], // 'image' sẽ kích hoạt handler
        ['blockquote', 'code-block'],
        ['clean'],
      ],
      handlers: {
        'image': quillImageHandler, // Gán handler của chúng ta
      },
    },
  }), [quillImageHandler]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const authorId = user?.id || user?._id;

    const payload = {
      ...form, // Gửi nguyên form (tags đã là mảng)
      slug: form.slug || toSlug(form.title),
      author: authorId,
    };
    
    // (Phần validation giữ nguyên)
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
    const img = it.featuredImage || '';
    setForm({
      title: it.title || '',
      slug: it.slug || '',
      content: it.content || '',
      excerpt: it.excerpt || '',
      featuredImage: img,
      status: it.status || 'draft',
      tags: Array.isArray(it.tags) ? it.tags : [],
    });
    
    if (img.startsWith('http')) {
      setImageTab('url');
    } else {
      setImageTab('upload');
    }
    
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
                        src={getImageUrl(post.featuredImage, null)}
                        alt={post.title}
                        className="w-32 h-32 object-cover rounded-lg shrink-0"
                        onError={(e) => (e.currentTarget.src = getImageUrl(null))}
                      />
                    )}
                    
                    <div className="flex-1 min-w-0"> 
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">{post.title}</h3>
                          <p className="text-gray-600 mb-3 line-clamp-2">{post.excerpt}</p>
                          
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <BookOpen size={16} />
                              {(post.tags || []).length > 0 ? (
                                post.tags.map(tag => (
                                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                                ))
                              ) : (
                                'Không có tag'
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Ảnh đại diện *</label>
                <div className="flex border-b mb-2">
                  <TabButton
                    label="Tải lên (Local)"
                    active={imageTab === 'upload'}
                    onClick={() => setImageTab('upload')}
                  />
                  <TabButton
                    label="Dán URL"
                    active={imageTab === 'url'}
                    onClick={() => setImageTab('url')}
                  />
                </div>
                <div className="mt-4">
                  {imageTab === 'upload' && (
                    <div>
                      <ImageUploader 
                        value={form.featuredImage}
                        onChange={handleImageChange}
                      />
                      {form.featuredImage.startsWith('http') && (
                        <p className="text-xs text-amber-700 mt-2">
                          Bạn đang dùng ảnh URL. Tải lên để thay thế.
                        </p>
                      )}
                    </div>
                  )}
                  {imageTab === 'url' && (
                    <div>
                      <input 
                        type="text"
                        name="featuredImage"
                        value={form.featuredImage.startsWith('http') ? form.featuredImage : ''}
                        onChange={handleChange}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Dán một link ảnh từ web khác.</p>
                      {/* Preview cho URL */}
                      {form.featuredImage.startsWith('http') && (
                        <img
                          src={form.featuredImage}
                          alt="Preview"
                          className="mt-3 w-48 h-32 object-cover rounded-lg"
                        />
                      )}
                    </div>
                  )}
                </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="flex flex-wrap items-center gap-2 p-2 border border-gray-300 rounded-lg">
                  {form.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm">
                      {tag}
                      <button 
                        type="button" 
                        onClick={() => removeTag(tag)} 
                        className="text-blue-500 hover:text-blue-700"
                        title="Xóa tag"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={form.tags.length === 0 ? "Nhập tag rồi nhấn Enter..." : "Thêm tag..."}
                    className="flex-1 px-2 py-1 outline-none min-w-[150px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung *</label>
                <div className="bg-white">
                    <ReactQuill
                      ref={quillRef}
                      theme="snow"
                      value={form.content}
                      onChange={handleContentChange}
                      modules={quillModules}
                      formats={quillFormats}
                      style={{ height: '400px' }} // Tăng chiều cao cho thoải mái
                    />
                </div>
              </div>

              <div className="pt-12"></div>

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
