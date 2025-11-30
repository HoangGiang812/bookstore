import React, { useState, useEffect, useMemo } from 'react';
import api, { getImageUrl } from '@/services/api';
import { listBooks } from '@/services/admin';
import { 
  Plus, Edit2, Trash2, X, Search, ChevronUp, ChevronDown, ChevronRight,
  Image as ImageIcon, CheckCircle, XCircle, Eye, Save, LayoutGrid, List, RefreshCw, Info, Link as LinkIcon
} from 'lucide-react';
import ImageUploader from './ImageUploader';

// --- HÀM XỬ LÝ SLUG TIẾNG VIỆT "XỊN" ---
const generateSlug = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize("NFD") // Tách dấu
    .replace(/[\u0300-\u036f]/g, "") // Xóa dấu
    .replace(/[đĐ]/g, "d") // Xử lý đ -> d
    .replace(/[^a-z0-9\s-]/g, "") // Chỉ giữ lại chữ thường, số, khoảng trắng, gạch ngang
    .trim()
    .replace(/\s+/g, "-") // Khoảng trắng -> gạch ngang
    .replace(/-+/g, "-"); // Nhiều gạch ngang liên tiếp -> 1 gạch ngang
};

/* ====================================================================================
 * 1. BOOK MANAGER: Giao diện chọn & sắp xếp sách
 * ==================================================================================== */
const BookManager = ({ allBooks, selectedIds, onChange }) => {
  const [filter, setFilter] = useState('');
  
  const availableBooks = useMemo(() => {
    const lower = filter.toLowerCase();
    return allBooks.filter(b => 
      !selectedIds.includes(b._id) && 
      (b.title.toLowerCase().includes(lower) || b.author?.toLowerCase().includes(lower))
    );
  }, [allBooks, selectedIds, filter]);

  const selectedBooks = useMemo(() => {
    return selectedIds.map(id => allBooks.find(b => b._id === id)).filter(Boolean);
  }, [allBooks, selectedIds]);

  const addBook = (id) => onChange([...selectedIds, id]);
  const removeBook = (id) => onChange(selectedIds.filter(x => x !== id));
  
  const moveUp = (index) => {
    if (index === 0) return;
    const newIds = [...selectedIds];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    onChange(newIds);
  };

  const moveDown = (index) => {
    if (index === selectedIds.length - 1) return;
    const newIds = [...selectedIds];
    [newIds[index + 1], newIds[index]] = [newIds[index], newIds[index + 1]];
    onChange(newIds);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px]">
      {/* CỘT TRÁI */}
      <div className="flex flex-col border rounded-xl overflow-hidden bg-gray-50">
        <div className="p-3 bg-white border-b sticky top-0 z-10">
          <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
            <Search size={16}/> Kho sách ({availableBooks.length})
          </h4>
          <input 
            className="input w-full text-sm" 
            placeholder="Tìm tên sách, tác giả..." 
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {availableBooks.map(b => (
            <div key={b._id} className="flex gap-3 p-2 bg-white rounded-lg border shadow-sm hover:border-blue-400 transition group">
              <img src={getImageUrl(b.image || b.coverUrl)} className="w-10 h-14 object-cover rounded bg-gray-200" alt=""/>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate" title={b.title}>{b.title}</div>
                <div className="text-xs text-gray-500">{b.author || 'No author'}</div>
                <div className="text-xs font-bold text-blue-600 mt-1">
                   {new Intl.NumberFormat('vi-VN').format(b.price)}đ 
                   <span className="ml-2 text-gray-400 font-normal">Kho: {b.stock}</span>
                </div>
              </div>
              <button onClick={() => addBook(b._id)} className="self-center px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-600 hover:text-white text-xs font-bold transition">
                + Thêm
              </button>
            </div>
          ))}
          {availableBooks.length === 0 && <div className="text-center text-gray-400 text-sm py-10">Không tìm thấy sách nào</div>}
        </div>
      </div>

      {/* CỘT PHẢI */}
      <div className="flex flex-col border rounded-xl overflow-hidden bg-blue-50/30 border-blue-100">
        <div className="p-3 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center sticky top-0 z-10">
          <h4 className="font-bold text-blue-800">Đã chọn ({selectedBooks.length})</h4>
          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">Thứ tự hiển thị</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {selectedBooks.map((b, idx) => (
            <div key={b._id} className="flex gap-3 p-2 bg-white rounded-lg border border-blue-200 shadow-sm items-center">
              <span className="w-5 text-center font-bold text-gray-300 text-sm">{idx + 1}</span>
              <img src={getImageUrl(b.image || b.coverUrl)} className="w-8 h-10 object-cover rounded" alt=""/>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{b.title}</div>
              </div>
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronUp size={14}/></button>
                <button onClick={() => moveDown(idx)} disabled={idx === selectedBooks.length - 1} className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronDown size={14}/></button>
              </div>
              <button onClick={() => removeBook(b._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded ml-1">
                <X size={16} />
              </button>
            </div>
          ))}
          {selectedBooks.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-300 rounded-lg m-2">
                <LayoutGrid size={32} className="mb-2 opacity-50"/>
                Chọn sách từ cột trái
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

const generateBannerCollage = async (bookIds, allBooks) => {
  if (!bookIds || bookIds.length === 0) throw new Error("Chưa chọn sách nào để ghép!");

  // 1. Lấy thông tin sách (tối đa 5 cuốn đầu tiên)
  const books = bookIds.slice(0, 5).map(id => allBooks.find(b => b._id === id)).filter(Boolean);
  if (books.length === 0) throw new Error("Không tìm thấy thông tin sách!");

  // 2. Tạo Canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const W = 1200;
  const H = 400;
  canvas.width = W;
  canvas.height = H;

  // 3. Vẽ nền (Gradient nhẹ nhàng)
  const grd = ctx.createLinearGradient(0, 0, W, H);
  grd.addColorStop(0, "#e0e7ff"); // Xanh nhạt
  grd.addColorStop(1, "#f3f4f6"); // Xám nhạt
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  // 4. Tải và vẽ từng ảnh bìa sách
  const loadImg = (src) => new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous"; // Quan trọng để tránh lỗi CORS khi vẽ lên canvas
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null); // Nếu lỗi thì bỏ qua
      img.src = src;
  });

  // Tính toán vị trí: Chia đều chiều ngang, căn giữa dọc
  const gap = 20;
  const totalWidth = books.length * 180 + (books.length - 1) * gap;
  let startX = (W - totalWidth) / 2;

  for (let i = 0; i < books.length; i++) {
      const book = books[i];
      // Lấy link ảnh (ưu tiên ảnh upload > ảnh link)
      let src = getImageUrl(book.image || book.coverUrl);
      
      // Hack: Nếu đang chạy localhost mà ảnh local không có domain thì canvas không load được
      // Nếu getImageUrl trả về /uploads/..., trình duyệt tự hiểu.
      
      const img = await loadImg(src);
      if (img) {
          // Vẽ bóng đổ (Shadow)
          ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
          ctx.shadowBlur = 20;
          ctx.shadowOffsetX = 5;
          ctx.shadowOffsetY = 10;

          // Vẽ ảnh (Resize về kích thước chuẩn bìa sách: 180x260)
          // Có thể xoay nhẹ ngẫu nhiên để nghệ thuật hơn
          const angle = (Math.random() - 0.5) * 0.1; // Xoay nhẹ +/- 0.05 rad
          
          ctx.save();
          ctx.translate(startX + 90, H/2); // Dời gốc tọa độ về tâm ảnh
          ctx.rotate(angle);
          ctx.drawImage(img, -90, -130, 180, 260);
          ctx.restore();
      }
      startX += 180 + gap;
  }

  // 5. Xuất ra Blob (File ảnh)
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
};

/* ====================================================================================
 * 2. COLLECTION MODAL: Form chính (ĐÃ SỬA LOGIC SLUG)
 * ==================================================================================== */
const CollectionModal = ({ collection, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('info');
  
  const [activeBannerTab, setActiveBannerTab] = useState('upload');
  const [formData, setFormData] = useState({
    name: collection?.name || '',
    slug: collection?.slug || '',
    description: collection?.description || '',
    banner: collection?.banner || '',
    isActive: collection?.isActive ?? true,
    books: collection?.books?.map(b => b._id || b) || []
  });
  
  const [allBooks, setAllBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSlugEdited, setIsSlugEdited] = useState(!!collection);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    listBooks({ limit: 5000 }).then(res => setAllBooks(res.items || res));
    
    if (collection?.banner && (collection.banner.startsWith('http') || collection.banner.startsWith('//')) && !collection.banner.includes('/uploads/')) {
        setActiveBannerTab('link');
    }
  }, []);

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setFormData(prev => {
        if (!isSlugEdited) return { ...prev, name: newName, slug: generateSlug(newName) };
        return { ...prev, name: newName };
    });
  };

  const handleSlugChange = (e) => {
    setFormData({ ...formData, slug: e.target.value });
    setIsSlugEdited(true);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try { await onSave(formData); } 
    catch (e) { console.error(e); } 
    finally { setIsLoading(false); }
  };

  const handleAutoBanner = async () => {
      if (formData.books.length === 0) {
          alert("Vui lòng chọn ít nhất 1 cuốn sách trước!");
          setActiveTab('books'); // Chuyển sang tab sách để nhắc user
          return;
      }

      setIsGenerating(true);
      try {
          // 1. Tạo Blob ảnh từ Canvas
          const blob = await generateBannerCollage(formData.books, allBooks);
          
          // 2. Upload Blob lên Server (Giả lập như người dùng upload file thật)
          const uploadData = new FormData();
          uploadData.append('image', blob, 'auto-banner.jpg'); // Đặt tên file ảo

          const res = await api.post('/upload', uploadData);
          
          // 3. Lấy đường dẫn trả về & Cập nhật state
          let rawPath = res.path || res.url || res.data?.path;
          if (!rawPath && res.filename) rawPath = `/uploads/${res.filename}`;
          
          if (rawPath) {
             const cleanPath = rawPath.replace(/\\/g, '/');
             const finalPath = (cleanPath.startsWith('http') || cleanPath.startsWith('/')) ? cleanPath : `/${cleanPath}`;
             setFormData(prev => ({ ...prev, banner: finalPath }));
             setActiveBannerTab('upload'); // Chuyển về tab xem trước
          }
      } catch (e) {
          console.error(e);
          alert("Lỗi tạo banner: " + e.message);
      } finally {
          setIsGenerating(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{collection ? 'Chỉnh sửa Bộ sưu tập' : 'Tạo Bộ sưu tập mới'}</h3>
            <p className="text-xs text-gray-500 mt-1">Quản lý thông tin và danh sách sách hiển thị</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition"><X size={24}/></button>
        </div>

        {/* MAIN TABS */}
        <div className="flex border-b px-6 gap-6">
            <button onClick={() => setActiveTab('info')} className={`py-3 text-sm font-bold border-b-2 transition ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>1. Thông tin chung</button>
            <button onClick={() => setActiveTab('books')} className={`py-3 text-sm font-bold border-b-2 transition ${activeTab === 'books' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>2. Danh sách sách <span className="ml-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{formData.books.length}</span></button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            {activeTab === 'info' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Cột trái (Form Text) - Giữ nguyên */}
                    <div className="md:col-span-2 space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Tên bộ sưu tập <span className="text-red-500">*</span></label>
                            <input className="input w-full font-medium" value={formData.name} onChange={handleNameChange} placeholder="Ví dụ: Sách Hay Mùa Hè" autoFocus />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Slug (URL) <span className="text-red-500">*</span></label>
                            <div className="flex items-center gap-2 relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><LinkIcon size={14} /></div>
                                <span className="pl-8 pr-1 text-gray-400 text-sm select-none bg-gray-50 border-y border-l rounded-l-lg h-[42px] flex items-center">/collections/</span>
                                <input 
                                    className={`input flex-1 rounded-l-none font-mono text-sm ${isSlugEdited ? 'border-blue-300 bg-blue-50/20' : 'bg-gray-50 text-gray-500'}`}
                                    value={formData.slug} 
                                    onChange={handleSlugChange}
                                    onBlur={() => setFormData(prev => ({...prev, slug: generateSlug(prev.slug)}))}
                                />
                                <button type="button" onClick={() => { setFormData(prev => ({ ...prev, slug: generateSlug(prev.name) })); setIsSlugEdited(false); }} className="p-2.5 border border-gray-300 bg-white text-gray-500 hover:text-blue-600 hover:border-blue-300 rounded-lg transition ml-1" title="Reset Slug"><RefreshCw size={18} /></button>
                            </div>
                            {isSlugEdited && <p className="text-xs text-blue-600 mt-1 flex items-center gap-1"><Info size={12}/> Bạn đang nhập Slug thủ công.</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả ngắn</label>
                            <textarea className="input w-full min-h-[100px]" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Mô tả ngắn gọn về bộ sưu tập này..." />
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-white rounded-lg border cursor-pointer hover:border-blue-300 transition" onClick={() => setFormData({...formData, isActive: !formData.isActive})}>
                            <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${formData.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${formData.isActive ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700">Trạng thái: {formData.isActive ? 'Đang hiển thị' : 'Đang ẩn'}</span>
                        </div>
                    </div>

                    {/* Cột phải: Banner Upload (CÓ 2 TAB) */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Ảnh bìa (Banner)</label>
                        
                        <div className="flex bg-gray-200 p-1 rounded-lg mb-3">
                            <button onClick={() => setActiveBannerTab('upload')} className={`flex-1 py-1 text-xs font-bold rounded-md transition ${activeBannerTab === 'upload' ? 'bg-white text-blue-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}>Tải lên</button>
                            <button onClick={() => setActiveBannerTab('link')} className={`flex-1 py-1 text-xs font-bold rounded-md transition ${activeBannerTab === 'link' ? 'bg-white text-blue-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}>Link</button>
                        </div>

                        {/* NÚT MAGIC: TẠO TỰ ĐỘNG */}
                        <button 
                            onClick={handleAutoBanner}
                            disabled={isGenerating}
                            className="w-full mb-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-200 transition border border-indigo-200"
                        >
                            {isGenerating ? <span className="animate-spin">⏳</span> : <RefreshCw size={16}/>}
                            {isGenerating ? 'Đang vẽ...' : 'Ghép ảnh từ sách đã chọn'}
                        </button>

                        <div className="bg-white p-4 rounded-xl border border-dashed border-gray-300 text-center">
                            {activeBannerTab === 'upload' ? (
                                // TAB 1: UPLOAD (Dùng component cũ)
                                <ImageUploader 
                                    value={formData.banner} 
                                    onChange={(url) => setFormData({...formData, banner: url})} 
                                />
                            ) : (
                                // TAB 2: DÁN LINK
                                <div>
                                    {formData.banner && (
                                        <img 
                                            src={formData.banner} 
                                            alt="Preview" 
                                            className="w-full h-32 object-cover rounded-lg shadow-sm border border-gray-200 mb-3"
                                            onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
                                        />
                                    )}
                                    <input 
                                        className="input w-full text-sm mb-2" 
                                        placeholder="https://example.com/image.jpg"
                                        value={formData.banner}
                                        onChange={(e) => setFormData({...formData, banner: e.target.value})}
                                    />
                                    <p className="text-xs text-gray-400">Dán URL ảnh trực tiếp từ internet.</p>
                                </div>
                            )}
                            
                            <p className="text-xs text-gray-400 mt-3 pt-3 border-t">Kích thước khuyên dùng: 1200x400px</p>
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800">
                            <p className="font-bold mb-1 flex items-center gap-2"><Info size={16}/> Mẹo hiển thị:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>Tên bộ sưu tập nên ngắn gọn.</li>
                                <li>Nên chọn ít nhất 4 cuốn sách.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            ) : (
                <BookManager allBooks={allBooks} selectedIds={formData.books} onChange={(ids) => setFormData({...formData, books: ids})} />
            )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-white border-t flex justify-between items-center">
            <div className="text-sm text-gray-500">{activeTab === 'info' ? 'Điền thông tin cơ bản trước' : 'Kéo thả hoặc bấm mũi tên để sắp xếp'}</div>
            <div className="flex gap-3">
                <button onClick={onClose} className="px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium">Hủy bỏ</button>
                {activeTab === 'info' ? (
                    <button onClick={() => setActiveTab('books')} className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-blue-200">Tiếp tục chọn sách <ChevronRight size={18}/></button>
                ) : (
                    <button onClick={handleSubmit} disabled={isLoading} className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-green-200">{isLoading ? 'Đang lưu...' : <><Save size={18}/> Lưu bộ sưu tập</>}</button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

/* ====================================================================================
 * 3. MAIN PAGE
 * ==================================================================================== */
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
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCollections(); }, []);

  const filteredCollections = useMemo(() => {
    const lowerSearch = (searchTerm || '').toLowerCase();
    return collections.filter(c => c.name.toLowerCase().includes(lowerSearch));
  }, [collections, searchTerm]);

  const handleSave = async (payload) => {
    try {
      if (editingCollection) await api.patch(`/admin/collections/${editingCollection._id}`, payload);
      else await api.post('/admin/collections', payload);
      fetchCollections();
      setIsModalOpen(false);
      setEditingCollection(null);
    } catch (err) { alert(err.message); }
  };

  const handleEdit = async (col) => {
      try {
          const detail = await api.get(`/admin/collections/${col._id}`);
          setEditingCollection(detail);
          setIsModalOpen(true);
      } catch (e) { alert("Lỗi tải dữ liệu"); }
  };

  const handleDelete = async (id) => {
      if(!window.confirm("Chắc chắn xoá?")) return;
      try { await api.delete(`/admin/collections/${id}`); fetchCollections(); } catch(e){}
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-gray-900">Bộ sưu tập sách</h2>
            <p className="text-sm text-gray-500">Tạo các nhóm sách theo chủ đề (ví dụ: Sách bán chạy, Sách mùa hè...)</p>
        </div>
        <button onClick={() => { setEditingCollection(null); setIsModalOpen(true); }} className="btn-primary flex items-center gap-2 shadow-lg shadow-blue-200">
          <Plus size={18} /> Tạo bộ sưu tập
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCollections.map(col => (
            <div key={col._id} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition overflow-hidden flex flex-col group">
                <div className="h-32 bg-gray-100 relative overflow-hidden border-b">
                    {col.banner ? (
                        <img src={getImageUrl(col.banner)} className="w-full h-full object-cover" alt="banner" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={32} /></div>
                    )}
                    <div className="absolute top-3 right-3">
                        {col.isActive ? (
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm"><CheckCircle size={12}/> Active</span>
                        ) : (
                            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm"><XCircle size={12}/> Inactive</span>
                        )}
                    </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-blue-600 transition">{col.name}</h3>
                    <p className="text-xs text-gray-500 font-mono mb-3 truncate bg-gray-50 px-2 py-1 rounded w-fit">/{col.slug}</p>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">{col.description || "Chưa có mô tả"}</p>
                    <div className="flex items-center justify-between pt-4 border-t mt-auto">
                        <span className="text-sm font-medium text-gray-700 flex items-center gap-1"><List size={16} className="text-blue-500"/> {col.bookCount} sách</span>
                        <div className="flex gap-2">
                            <button onClick={() => handleEdit(col)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Chỉnh sửa"><Edit2 size={18} /></button>
                            <button onClick={() => handleDelete(col._id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Xóa"><Trash2 size={18} /></button>
                        </div>
                    </div>
                </div>
            </div>
        ))}
      </div>

      {isModalOpen && (
        <CollectionModal collection={editingCollection} onClose={() => setIsModalOpen(false)} onSave={handleSave} />
      )}
    </div>
  );
}