import React, { useEffect, useState, useMemo } from "react";
import { banners as bannerApi, categories as categoryApi, collections as collectionApi, posts as postApi } from "@/services/admin";
import { getImageUrl } from "@/services/api";
import api from "@/services/api";
import { 
  Plus, Trash2, Edit2, Save, Image as ImageIcon, 
  Monitor, Smartphone, Check, X as XIcon, ArrowUp, ArrowDown, Link as LinkIcon, Layers,
  ChevronDown, Layout, GripVertical, Users
} from "lucide-react";
import ImageUploader from "./ImageUploader";

/* ================= CONFIG & CONSTANTS ================= */
const BANNER_POSITIONS = [
  { id: 'home-hero', label: 'Slider Chính (Hero)', size: '1920x600px', mobileSize: 'aspect-[3/1] hoặc [16/9]' },
  { id: 'home-sub', label: 'Quảng cáo Đôi (Sub)', size: '600x300px', mobileSize: 'aspect-[2/1]' },
  { id: 'home-strip', label: 'Banner Dài (Strip)', size: '1200x150px', mobileSize: 'aspect-[4/1]' }, // MỚI: Banner dài ngăn cách
];

const BLOCK_TYPES = [
  { type: 'banner', label: 'Slider Chính (Hero)', icon: ImageIcon },
  { type: 'sub-banners', label: 'Quảng cáo Đôi (2 Ảnh)', icon: Monitor },
  { type: 'strip-banner', label: 'Banner Dài (1 Ảnh ngang)', icon: Layout }, // MỚI
  { type: 'collection', label: 'Bộ sưu tập sách', icon: Layers },
  { type: 'special-list', label: 'Danh sách sách', icon: Layout },
  { type: 'authors', label: 'Tác giả nổi bật', icon: Users },
];

const EMPTY_BANNER = { title: "", subtitle: "", ctaText: "Xem ngay", link: "/", imageUrl: "", active: true, sort: 0, position: 'home-hero' };

/* ================= SUB-COMPONENTS ================= */

/* 1. Link Selector Thông minh (Không Icon Xích) */
const LinkSelector = ({ value, onChange }) => {
  const [type, setType] = useState('custom'); 
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Auto detect
  useEffect(() => {
    if (value.startsWith('/categories/')) setType('category');
    else if (value.startsWith('/collections/')) setType('collection');
    else if (value.startsWith('/articles/')) setType('post'); // Detect Post
    else setType('custom');
  }, [value]);

  // Load options
  useEffect(() => {
    if (type === 'custom') return;
    const fetchOpts = async () => {
      setLoading(true);
      try {
        let res = [];
        if (type === 'category') res = await categoryApi.list();
        if (type === 'collection') res = await collectionApi.list();
        // --- GỌI API POST ---
        if (type === 'post') res = await postApi.list({ limit: 100 }); 
        // --------------------

        const list = res.items || res.data || res || [];
        setOptions(list);
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    fetchOpts();
  }, [type]);

  const handleSelect = (e) => {
    const slug = e.target.value;
    if (!slug) return;
    if (type === 'category') onChange(`/categories/${slug}`);
    if (type === 'collection') onChange(`/collections/${slug}`);
    if (type === 'post') onChange(`/articles/${slug}`);
  };

  const renderCategoryOptions = () => {
      const roots = options.filter(c => !c.parentId);
      const children = options.filter(c => c.parentId);
      return roots.map(root => (
          <React.Fragment key={root._id}>
              <option value={root.slug} className="font-bold">🔹 {root.name}</option>
              {children.filter(c => c.parentId === root._id || c.parentId?._id === root._id).map(child => (
                  <option key={child._id} value={child.slug}>&nbsp;&nbsp;&nbsp;&nbsp;↳ {child.name}</option>
              ))}
          </React.Fragment>
      ));
  };

  return (
    <div className="space-y-2">
      <div className="flex bg-gray-100 p-1 rounded-lg gap-1 overflow-x-auto">
         <button type="button" onClick={()=>{setType('custom');}} className={`flex-1 py-1 px-2 whitespace-nowrap text-xs font-bold rounded transition ${type==='custom'?'bg-white shadow text-blue-600':'text-gray-500'}`}>Tự nhập</button>
         <button type="button" onClick={()=>{setType('category');}} className={`flex-1 py-1 px-2 whitespace-nowrap text-xs font-bold rounded transition ${type==='category'?'bg-white shadow text-blue-600':'text-gray-500'}`}>Danh mục</button>
         <button type="button" onClick={()=>{setType('collection');}} className={`flex-1 py-1 px-2 whitespace-nowrap text-xs font-bold rounded transition ${type==='collection'?'bg-white shadow text-blue-600':'text-gray-500'}`}>BST</button>
         {/* --- NÚT BÀI VIẾT --- */}
         <button type="button" onClick={()=>{setType('post');}} className={`flex-1 py-1 px-2 whitespace-nowrap text-xs font-bold rounded transition ${type==='post'?'bg-white shadow text-blue-600':'text-gray-500'}`}>Bài viết</button>
      </div>

      <div className="relative">
        {type === 'custom' ? (
            <input className="input w-full px-3 text-sm font-mono text-blue-600" value={value} onChange={e => onChange(e.target.value)} placeholder="VD: /about..." />
        ) : (
            <div className="relative">
               <select className="input w-full px-3 pr-8 appearance-none text-sm cursor-pointer bg-white" value={value.split('/').pop()} onChange={handleSelect} disabled={loading}>
                 <option value="">-- Chọn {type === 'category' ? 'Danh mục' : (type === 'collection' ? 'Bộ sưu tập' : 'Bài viết')} --</option>
                 
                 {type === 'category' ? renderCategoryOptions() : 
                  // Render chung cho Collection và Post (đều có name/title và slug)
                  options.map(opt => <option key={opt._id} value={opt.slug}>{opt.name || opt.title}</option>)
                 }
               </select>
               {loading && <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-gray-400">...</span>}
               <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
            </div>
        )}
      </div>
      {value && type !== 'custom' && <div className="text-[10px] text-gray-400 px-1 mt-1 truncate">Link: <span className="font-mono text-blue-500">{value}</span></div>}
    </div>
  );
};

/* 2. Banner Manager (Phần bạn đã có, tôi tách ra component con cho gọn) */
const BannerManager = () => {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('home-hero');
  const [form, setForm] = useState({ ...EMPTY_BANNER });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [imgTab, setImgTab] = useState('upload');

  const load = async () => {
    try {
      setLoading(true);
      const res = await bannerApi.list();
      const data = res?.data ?? res;
      const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      list.sort((a, b) => (a.sort || 0) - (b.sort || 0));
      setItems(list);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const currentList = useMemo(() => items.filter(i => i.position === activeTab).sort((a, b) => (a.sort || 0) - (b.sort || 0)), [items, activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, position: activeTab, sort: Number(form.sort) || 0 };
      if (editingId) await bannerApi.update(editingId, payload);
      else await bannerApi.create(payload);
      await load();
      resetForm();
    } catch (err) { alert(err?.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Xóa banner này?")) return;
    try { await bannerApi.remove(id); load(); if(editingId===id) resetForm(); } catch{}
  };

  const handleToggleActive = async (item) => {
    try {
        const newStatus = !item.active;
        setItems(prev => prev.map(i => i._id === item._id ? {...i, active: newStatus} : i));
        await bannerApi.update(item._id, { active: newStatus });
    } catch { load(); }
  };

  const handleSort = async (item, direction) => {
      const index = currentList.findIndex(i => i._id === item._id);
      if (index === -1) return;
      const swapTarget = direction === 'up' ? currentList[index - 1] : currentList[index + 1];
      if (!swapTarget) return;

      const val1 = item.sort || 0;
      const val2 = swapTarget.sort || 0;
      const newItems = [...items];
      const idx1 = newItems.findIndex(i => i._id === item._id);
      const idx2 = newItems.findIndex(i => i._id === swapTarget._id);
      newItems[idx1].sort = val2;
      newItems[idx2].sort = val1;
      newItems.sort((a, b) => (a.sort || 0) - (b.sort || 0));
      setItems(newItems);

      try {
          await Promise.all([
              bannerApi.update(item._id, { sort: val2 }),
              bannerApi.update(swapTarget._id, { sort: val1 })
          ]);
      } catch { load(); } 
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({ ...EMPTY_BANNER, ...item });
    if (item.imageUrl && item.imageUrl.startsWith('http') && !item.imageUrl.includes('/uploads/')) setImgTab('link');
    else setImgTab('upload');
    document.querySelector('#editor-area')?.scrollIntoView({ behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    const maxSort = Math.max(0, ...currentList.map(i => i.sort || 0));
    setForm({ ...EMPTY_BANNER, position: activeTab, sort: maxSort + 1 });
    setImgTab('upload');
  };

  useEffect(() => { resetForm(); }, [activeTab]);

  return (
    <div className="space-y-6" id="editor-area">
        {/* Tab Position */}
        <div className="flex gap-2 border-b overflow-x-auto pb-1 scrollbar-hide">
            {BANNER_POSITIONS.map(pos => (
                <button key={pos.id} onClick={() => setActiveTab(pos.id)} className={`px-4 py-2 text-sm font-bold whitespace-nowrap rounded-t-lg border-b-2 transition-colors ${activeTab === pos.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>{pos.label}</button>
            ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            {/* Form */}
            <div className="xl:col-span-5 space-y-6 sticky top-6">
                {/* Preview */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
                        <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2"><Monitor size={16}/> Preview</h4>
                        <div className="flex bg-gray-200 rounded p-0.5">
                            <button onClick={()=>setPreviewMode('desktop')} className={`p-1.5 rounded ${previewMode==='desktop'?'bg-white shadow text-blue-600':'text-gray-500'}`}><Monitor size={14}/></button>
                            <button onClick={()=>setPreviewMode('mobile')} className={`p-1.5 rounded ${previewMode==='mobile'?'bg-white shadow text-blue-600':'text-gray-500'}`}><Smartphone size={14}/></button>
                        </div>
                    </div>
                    <div className={`bg-gray-100 p-4 flex justify-center transition-all duration-300 ${previewMode==='mobile' ? 'py-8' : ''}`}>
                        <div className={`relative overflow-hidden bg-white shadow-xl transition-all duration-300 group ${previewMode === 'mobile' ? 'w-[200px] rounded-[1.5rem] border-4 border-gray-800 aspect-[9/16]' : 'w-full rounded-lg aspect-[2.5/1]'}`}>
                            {form.imageUrl ? (
                                <img src={getImageUrl(form.imageUrl)} className="w-full h-full object-cover opacity-90" alt="preview"/>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-200"><ImageIcon size={32}/><span className="text-xs mt-2">No Image</span></div>
                            )}
                            <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end items-start ${previewMode==='mobile'?'p-4':'p-6'}`}>
                                {form.title && <h2 className={`font-bold text-white leading-tight ${previewMode==='mobile'?'text-sm mb-1':'text-xl mb-2'}`}>{form.title}</h2>}
                                {form.subtitle && <p className={`text-white/90 line-clamp-2 font-light ${previewMode==='mobile'?'text-[10px] mb-2':'text-xs mb-3'}`}>{form.subtitle}</p>}
                                {form.ctaText && <span className={`bg-white text-black font-bold rounded-full shadow-sm flex items-center justify-center ${previewMode==='mobile'?'text-[8px] px-2 py-1':'text-[10px] px-4 py-1.5'}`}>{form.ctaText}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b bg-white flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">{editingId ? "Chỉnh sửa" : "Thêm mới"}</h3>
                        {editingId && <button type="button" onClick={resetForm} className="text-xs text-red-500 hover:underline">Hủy</button>}
                    </div>
                    <div className="p-5 space-y-4">
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs font-bold text-gray-700">Hình ảnh <span className="text-red-500">*</span></label>
                                <span className="text-[10px] text-gray-400">{BANNER_POSITIONS.find(p=>p.id===activeTab)?.size}</span>
                            </div>
                            <div className="flex bg-gray-100 p-1 rounded-lg mb-3">
                                <button type="button" onClick={()=>setImgTab('upload')} className={`flex-1 py-1 text-xs font-bold rounded transition ${imgTab==='upload'?'bg-white shadow text-blue-600':'text-gray-500'}`}>Tải lên</button>
                                <button type="button" onClick={()=>setImgTab('link')} className={`flex-1 py-1 text-xs font-bold rounded transition ${imgTab==='link'?'bg-white shadow text-blue-600':'text-gray-500'}`}>Dán Link</button>
                            </div>
                            {imgTab === 'upload' ? <ImageUploader value={form.imageUrl} onChange={(url) => setForm({...form, imageUrl: url})} /> : (
                                <div className="space-y-2"><input className="input w-full text-sm" placeholder="https://example.com/image.jpg" value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})}/><p className="text-[10px] text-gray-400">Dán đường dẫn ảnh trực tiếp từ internet.</p></div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2"><label className="text-xs font-bold text-gray-700 mb-1 block">Tiêu đề</label><input className="input w-full font-bold" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="VD: Siêu Sale" /></div>
                            <div className="col-span-2"><label className="text-xs font-bold text-gray-700 mb-1 block">Mô tả phụ</label><textarea className="input w-full text-sm" rows={2} value={form.subtitle} onChange={e => setForm({...form, subtitle: e.target.value})} placeholder="..." /></div>
                            <div><label className="text-xs font-bold text-gray-700 mb-1 block">Nút bấm (CTA)</label><input className="input w-full text-sm" value={form.ctaText} onChange={e => setForm({...form, ctaText: e.target.value})} placeholder="Mua Ngay" /></div>
                            <div><label className="text-xs font-bold text-gray-700 mb-1 block">Thứ tự</label><input type="number" className="input w-full text-sm" value={form.sort} onChange={e => setForm({...form, sort: e.target.value})} /></div>
                            <div className="col-span-2"><label className="text-xs font-bold text-gray-700 mb-1 block">Liên kết (Link)</label><LinkSelector value={form.link} onChange={(val) => setForm({...form, link: val})} /></div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
                        <button type="submit" disabled={saving} className="btn-primary w-full shadow-lg shadow-blue-200 flex justify-center items-center gap-2">{saving ? "Đang lưu..." : <><Save size={18}/> Lưu Banner</>}</button>
                    </div>
                </form>
            </div>

            {/* List */}
            <div className="xl:col-span-7">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col h-full min-h-[400px]">
                    <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><Layers size={18} className="text-blue-600"/> Danh sách</h3>
                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{currentList.length}</span>
                    </div>
                    {loading ? <div className="p-12 text-center text-gray-400 animate-pulse">Đang tải...</div> : currentList.length === 0 ? <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-3"><ImageIcon size={40} className="opacity-20"/><p>Chưa có banner nào ở vị trí này.</p></div> : (
                        <div className="divide-y divide-gray-100">
                            {currentList.map((item, idx) => (
                                <div key={item._id} className={`p-4 flex gap-4 group transition-colors ${editingId === item._id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                    <div className="flex flex-col justify-center gap-1 text-gray-400">
                                        <button onClick={() => handleSort(item, 'up')} disabled={idx === 0} className="hover:text-blue-600 disabled:opacity-20"><ArrowUp size={16}/></button>
                                        <button onClick={() => handleSort(item, 'down')} disabled={idx === currentList.length - 1} className="hover:text-blue-600 disabled:opacity-20"><ArrowDown size={16}/></button>
                                    </div>
                                    <div className="w-24 h-16 bg-gray-200 rounded-lg overflow-hidden border shrink-0 relative">
                                        <img src={getImageUrl(item.imageUrl)} className={`w-full h-full object-cover transition ${!item.active ? 'grayscale opacity-50' : ''}`} alt=""/>
                                        {!item.active && <div className="absolute inset-0 flex items-center justify-center"><span className="bg-black/50 text-white text-[8px] px-2 py-0.5 rounded font-bold">ẨN</span></div>}
                                    </div>
                                    <div className="flex-1 min-w-0 py-1">
                                        <h4 className="font-bold text-gray-900 truncate text-sm">{item.title || "(Không tiêu đề)"}</h4>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500"><span className="bg-gray-100 px-1.5 rounded border font-mono">Sort: {item.sort}</span><span className="truncate max-w-[200px] text-blue-500">{item.link}</span></div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 justify-center">
                                        <button onClick={() => handleToggleActive(item)} className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 ${item.active ? 'bg-green-500' : 'bg-gray-300'}`}><div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ${item.active ? 'translate-x-4' : 'translate-x-0'}`}></div></button>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded"><Edit2 size={14}/></button>
                                            <button onClick={() => handleDelete(item._id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

/* 3. Layout Manager (PHẦN MỚI: Cấu hình trang chủ) */
const LayoutManager = () => {
  const [layout, setLayout] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/settings/homepage_layout'); // Đã có API này từ bước trước
        if (res) setLayout(res);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    load();
  }, []);

  const addBlock = (type) => {
    const newBlock = { id: Date.now(), type, title: type === 'collection' ? 'Tên bộ sưu tập' : 'Tiêu đề mục', slug: '', groupType: 'new', showCount: 5 };
    setLayout([...layout, newBlock]);
  };

  const removeBlock = (index) => {
    const next = [...layout]; next.splice(index, 1); setLayout(next);
  };

  const moveBlock = (index, direction) => {
    const next = [...layout];
    if (direction === 'up' && index > 0) [next[index], next[index - 1]] = [next[index - 1], next[index]];
    else if (direction === 'down' && index < next.length - 1) [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setLayout(next);
  };

  const updateBlock = (index, field, value) => {
    const next = [...layout]; next[index] = { ...next[index], [field]: value }; setLayout(next);
  };

  const saveLayout = async () => {
    try { await api.post('/admin/settings/homepage_layout', { value: layout }); alert('Đã lưu cấu hình trang chủ!'); } catch (e) { alert('Lỗi lưu: ' + e.message); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
        {/* Cột Trái: Danh sách */}
        <div className="lg:col-span-2 space-y-4">
            {layout.length === 0 && <div className="p-8 border-2 border-dashed rounded-xl text-center text-gray-400">Trang chủ đang trống. Thêm khối từ bên phải.</div>}
            {layout.map((block, idx) => (
                <div key={block.id} className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition relative group">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-gray-100 rounded-lg text-gray-500 cursor-grab active:cursor-grabbing"><GripVertical size={20}/></div>
                        <div className="flex-1 space-y-3">
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-xs font-bold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{BLOCK_TYPES.find(t => t.type === block.type)?.label || block.type}</span>
                                <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition">
                                    <button onClick={() => moveBlock(idx, 'up')} className="p-1 hover:bg-gray-100 rounded" disabled={idx===0}><ArrowUp size={16}/></button>
                                    <button onClick={() => moveBlock(idx, 'down')} className="p-1 hover:bg-gray-100 rounded" disabled={idx===layout.length-1}><ArrowDown size={16}/></button>
                                    <button onClick={() => removeBlock(idx)} className="p-1 hover:bg-red-50 text-red-500 rounded ml-2"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            {block.type === 'banner' && <div className="text-sm text-gray-500 italic">Hiển thị Slider từ các banner vị trí "Slider Trang chủ".</div>}
                            {block.type === 'sub-banners' && <div className="text-sm text-gray-500 italic">Hiển thị lưới các banner vị trí "Banner Quảng cáo nhỏ".</div>}
                            {block.type === 'strip-banner' && <div className="text-sm text-gray-500 italic">Hiển thị 1 banner dài (Strip) ngẫu nhiên hoặc mới nhất.</div>}
                            {block.type === 'authors' && (
                                <div>
                                    <label className="text-xs font-bold text-gray-700">Tiêu đề mục</label>
                                    <input className="input w-full mt-1" value={block.title} onChange={e => updateBlock(idx, 'title', e.target.value)} placeholder="Tác giả tiêu biểu" />
                                </div>
                            )}
                            {block.type === 'collection' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-gray-700">Tiêu đề hiển thị</label><input className="input w-full mt-1" value={block.title} onChange={e => updateBlock(idx, 'title', e.target.value)} placeholder="Vd: Sách Mùa Hè" /></div>
                                    <div>
                                      <label className="text-xs font-bold text-gray-700">Bộ sưu tập</label>
                                      <LinkSelector value={`/collections/${block.slug}`} onChange={(val) => updateBlock(idx, 'slug', val.replace('/collections/', ''))} />
                                    </div>
                                </div>
                            )}
                            {block.type === 'special-list' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-gray-700">Tiêu đề mục</label><input className="input w-full mt-1" value={block.title} onChange={e => updateBlock(idx, 'title', e.target.value)} /></div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-700">Loại danh sách</label>
                                        <select className="input w-full mt-1" value={block.groupType} onChange={e => updateBlock(idx, 'groupType', e.target.value)}>
                                            <option value="new">Sách Mới nhất</option>
                                            <option value="deals">Sách Giảm giá (Deals)</option>
                                            <option value="bestseller">Sách Bán chạy</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            <button onClick={saveLayout} className="btn-primary w-full py-3 shadow-lg flex justify-center gap-2"><Save size={20}/> Lưu cấu hình trang chủ</button>
        </div>
        {/* Cột Phải: Công cụ thêm */}
        <div className="bg-white border rounded-xl p-5 h-fit sticky top-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Thêm thành phần</h3>
            <div className="space-y-3">
                {BLOCK_TYPES.map((item) => (
                    <button key={item.type} onClick={() => addBlock(item.type)} className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 transition text-left group">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-white"><item.icon size={20}/></div>
                        <div><div className="font-bold text-sm">{item.label}</div><div className="text-xs text-gray-500 group-hover:text-blue-600">Bấm để thêm</div></div>
                        <Plus size={16} className="ml-auto opacity-0 group-hover:opacity-100 transition"/>
                    </button>
                ))}
            </div>
        </div>
    </div>
  );
};

/* ================= MAIN EXPORT ================= */
export default function Content() {
  const [mainTab, setMainTab] = useState('banners'); // 'banners' | 'layout'

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-end border-b pb-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-900">Nội dung & Cấu hình</h2>
            <p className="text-sm text-gray-500 mt-1">Quản lý banner và bố cục hiển thị trên trang chủ.</p>
        </div>
        <div className="flex bg-white border rounded-lg p-1 shadow-sm">
            <button onClick={() => setMainTab('banners')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mainTab==='banners' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}>Quản lý Banner</button>
            <button onClick={() => setMainTab('layout')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mainTab==='layout' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}>Cấu hình Trang chủ</button>
        </div>
      </div>

      {mainTab === 'banners' ? <BannerManager /> : <LayoutManager />}
    </div>
  );
}