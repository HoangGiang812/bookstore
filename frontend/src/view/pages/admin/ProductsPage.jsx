import React, { useEffect, useMemo, useState } from 'react';
import { 
  Plus, Search, Pencil, Trash2, ChevronDown, ChevronRight, Star, X, 
  BookOpen, User, Calendar, Ruler, Weight, FileText, Hash, Layers, Store 
} from 'lucide-react';
import { 
  listBooks, createBook, updateBook, deleteBook, getBook, // ✅ Import getBook
  categories as catApi, toggleFeatured, authors as authorApi 
} from '@/services/admin';
import ImageUploader from './ImageUploader.jsx';
import { getImageUrl } from '@/services/api';

const fmtVND = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n || 0));

/* --- UI Helpers --- */
function Field({ label, icon: Icon, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
        {Icon && <Icon size={16} className="text-blue-600" />}
        {label}
      </label>
      <div className="relative">{children}</div>
    </div>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
        active ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

/* --- Category Tree --- */
function buildTree(items) {
  const byId = new Map(items.map(i => [String(i._id), { ...i, children: [] }]));
  const roots = [];
  for (const n of byId.values()) {
    if (n.parentId) {
      const p = byId.get(String(n.parentId));
      if (p) p.children.push(n); else roots.push(n);
    } else roots.push(n);
  }
  return { roots };
}
function buildParentMapFromFlat(items) {
  const map = new Map();
  (items || []).forEach(c => {
    map.set(String(c._id), c.parentId ? String(c.parentId) : null);
  });
  return map;
}
function CategoryTreeSelect({ roots, value, onChange }) {
  const [openMap, setOpenMap] = useState({});
  const selected = useMemo(() => new Set((value || []).map(String)), [value]);
  
  const toggleCheck = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  const Row = ({ node, level }) => {
    const id = String(node._id);
    const hasChildren = node.children?.length > 0;
    const isOpen = openMap[id];
    return (
      <li className="select-none">
        <div className="flex items-center hover:bg-blue-50 py-1.5 rounded transition cursor-pointer" style={{ paddingLeft: level * 14 }}>
          <button type="button" onClick={(e) => { e.preventDefault(); setOpenMap(p => ({...p, [id]: !p[id]})) }} className={`w-6 h-6 flex items-center justify-center text-gray-400 hover:text-blue-600 ${!hasChildren && 'invisible'}`}>
            {isOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
          </button>
          <label className="flex items-center gap-2 cursor-pointer flex-1">
            <input type="checkbox" checked={selected.has(id)} onChange={() => toggleCheck(id)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
            <span className={`text-sm ${selected.has(id) ? 'font-medium text-blue-700' : 'text-gray-700'}`}>{node.name}</span>
          </label>
        </div>
        {hasChildren && isOpen && <ul className="ml-0 border-l border-gray-100 ml-2">{node.children.map(child => <Row key={child._id} node={child} level={level + 1} />)}</ul>}
      </li>
    );
  };

  return (
    <div className="border rounded-lg p-2 max-h-[300px] overflow-y-auto bg-white shadow-inner">
      <ul>{roots.map(node => <Row key={node._id} node={node} level={0} />)}</ul>
    </div>
  );
}

/* ================= PAGE MAIN ================= */
export default function ProductsPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);
  const [imageTab, setImageTab] = useState('upload');
  
  // Dữ liệu gợi ý (Autocomplete)
  const [suggestAuthors, setSuggestAuthors] = useState([]);
  const [suggestPublishers, setSuggestPublishers] = useState([]);
  const [suggestSizes, setSuggestSizes] = useState(['13 x 19 cm', '13 x 20.5 cm', '14 x 20.5 cm', '14.5 x 20.5 cm', '16 x 24 cm']);

  const initDraft = () => ({
      title: '', author: '', coverUrl: '', price: 0, discountPercent: 0, stock: 0, categoryIds: [],
      description: '', 
      publisher: '', publicationYear: '', pages: '', format: 'Bìa mềm', size: '', weight: '',
      isFeatured: false, isActive: true
  });
  const [draft, setDraft] = useState(initDraft());

  // Load danh sách sách
  const load = async () => {
    setLoading(true);
    try {
      const res = await listBooks({ q });
      const items = res.items || res;
      setRows(items);
      
      // Trích xuất dữ liệu có sẵn để làm gợi ý
      const authors = [...new Set(items.map(b => b.author).filter(Boolean))];
      const pubs = [...new Set(items.map(b => b.publisher).filter(Boolean))];
      const sizes = [...new Set(items.map(b => b.size).filter(Boolean))];

      setSuggestAuthors(prev => [...new Set([...prev, ...authors])]);
      setSuggestPublishers(pubs);
      if (sizes.length) setSuggestSizes(prev => [...new Set([...prev, ...sizes])]);

    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Load danh sách tác giả từ hệ thống để gợi ý thêm
  useEffect(() => {
    (async () => {
        try {
            const res = await authorApi.list({ limit: 1000 });
            const systemAuthors = (res.items || []).map(a => a.name);
            setSuggestAuthors(prev => [...new Set([...prev, ...systemAuthors])]);
        } catch {}
    })();
  }, []);

  useEffect(() => { load(); }, [q]);

  useEffect(() => {
    (async () => {
      const r = await catApi.list();
      setCats(r.items || r);
    })();
  }, []);

  const { roots } = useMemo(() => buildTree(cats), [cats]);
  const flatParentMap = useMemo(() => buildParentMapFromFlat(cats), [cats]);

  const salePriceOf = (b) =>
    Math.round(Number(b.price || 0) * (1 - Math.max(0, Number(b.discountPercent || 0)) / 100));

  const expandWithAncestors = (ids) => {
    const out = new Set();
    (ids || []).forEach((raw) => {
      let cur = String(raw);
      while (cur) {
        out.add(cur);
        const parent = flatParentMap.get(cur);
        cur = parent || null;
      }
    });
    return Array.from(out);
  };

  // --- Actions ---
  const openNew = () => { 
    setEditing({ new: true }); 
    setDraft(initDraft());
    setImageTab('upload');
  };

  // ✅ SỬA LỖI QUAN TRỌNG: Gọi API getBook để lấy full description
  const openEdit = async (bookInList) => {
    setEditing(bookInList); 
    
    // 1. Điền tạm dữ liệu từ list (để hiện ngay)
    setDraft({
        ...initDraft(),
        title: bookInList.title || '',
        author: bookInList.author || '',
        coverUrl: bookInList.coverUrl || '',
        price: bookInList.price || 0,
        discountPercent: bookInList.discountPercent || 0,
        stock: bookInList.stock || 0,
        categoryIds: (bookInList.categoryIds || bookInList.categories || []).map(c => typeof c === 'object' ? c._id : String(c)),
        isFeatured: !!(bookInList.featured || bookInList.isFeatured),
        isActive: bookInList.isActive !== false,
    });
    setImageTab(bookInList.coverUrl?.startsWith('http') ? 'url' : 'upload');

    // 2. Gọi API lấy chi tiết (Description, Publisher, etc...)
    try {
        const fullBook = await getBook(bookInList._id || bookInList.id);
        setDraft(prev => ({
            ...prev,
            description: fullBook.description || '', // Lấy mô tả từ server
            publisher: fullBook.publisher || '',
            publicationYear: fullBook.publicationYear || '',
            pages: fullBook.pages || '',
            format: fullBook.format || 'Bìa mềm',
            size: fullBook.size || '',
            weight: fullBook.weight || '',
        }));
    } catch (e) {
        console.error("Lỗi tải chi tiết sách:", e);
    }
  };

  const handleImageChange = (url) => setDraft(prev => ({ ...prev, coverUrl: url }));

  const handleToggleFeatured = async (book) => {
    try {
      const updatedBook = await toggleFeatured(book._id || book.id);
      setRows(prev => prev.map(r => (r._id === updatedBook._id ? updatedBook : r))
        .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
      );
    } catch (err) {
      alert("Lỗi: " + (err.message || "Không thể cập nhật"));
    }
  };

  const save = async (e) => {
    e?.preventDefault();
    if (!draft.title.trim()) return alert('Nhập tên sách');

    const payload = {
      ...draft,
      price: Number(draft.price),
      discountPercent: Number(draft.discountPercent),
      stock: Number(draft.stock),
      publicationYear: draft.publicationYear ? Number(draft.publicationYear) : undefined,
      pages: draft.pages ? Number(draft.pages) : undefined,
      weight: draft.weight ? Number(draft.weight) : undefined,
      status: Number(draft.stock) > 0 ? 'available' : 'out-of-stock',
      categoryIds: expandWithAncestors(draft.categoryIds).filter(Boolean),
      featured: draft.isFeatured, 
      description: draft.description // Đảm bảo gửi mô tả
    };

    try {
        if (editing?.new) await createBook(payload);
        else await updateBook(editing._id || editing.id, payload);
        setEditing(null);
        load();
    } catch(e) {
        alert("Lỗi lưu sách: " + e.message);
    }
  };

  const remove = async (row) => {
    if (window.confirm('Bạn có chắc muốn xóa sách này?')) {
        await deleteBook(row._id || row.id);
        load();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Quản lý Sách</h2>
            <p className="text-sm text-gray-500 mt-1">{rows.length} đầu sách trong kho</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              placeholder="Tìm sách, tác giả..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition" onClick={openNew}>
            <Plus size={18} /> Thêm Sách
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50/80 text-gray-600 uppercase font-semibold border-b">
              <tr>
                <th className="p-4 w-14 text-center">Top</th>
                <th className="p-4 text-left">Sản phẩm</th>
                <th className="p-4 text-left">Tác giả</th>
                <th className="p-4 text-right">Giá bán</th>
                <th className="p-4 text-center">Kho</th>
                <th className="p-4 text-right w-36">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((b) => {
                 const isStar = !!(b.featured || b.isFeatured);
                 return (
                    <tr key={b._id || b.id} className={`group hover:bg-gray-50/80 transition ${isStar ? 'bg-yellow-50/40' : ''}`}>
                        <td className="p-4 text-center">
                            <button 
                            onClick={() => handleToggleFeatured(b)} 
                            className={`p-2 rounded-full transition ${isStar ? 'text-yellow-500 bg-yellow-100' : 'text-gray-300 hover:bg-gray-100 hover:text-yellow-400'}`}
                            title="Đánh dấu nổi bật"
                            >
                            <Star size={18} fill={isStar ? 'currentColor' : 'none'} />
                            </button>
                        </td>
                        <td className="p-4">
                            <div className="flex items-start gap-4">
                            <div className="w-12 h-16 bg-gray-100 rounded-lg overflow-hidden border flex-shrink-0 shadow-sm">
                                {b.coverUrl ? <img src={getImageUrl(b.coverUrl)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No IMG</div>}
                            </div>
                            <div>
                                <div className="font-semibold text-gray-900 line-clamp-2 leading-snug mb-1">{b.title}</div>
                                {b.discountPercent > 0 && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">-{b.discountPercent}%</span>}
                            </div>
                            </div>
                        </td>
                        <td className="p-4 text-gray-600 font-medium">{b.author || '—'}</td>
                        <td className="p-4 text-right">
                            <div className="font-bold text-gray-900">{fmtVND(salePriceOf(b))}</div>
                            {b.discountPercent > 0 && <div className="text-xs text-gray-400 line-through">{fmtVND(b.price)}</div>}
                        </td>
                        <td className="p-4 text-center">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${b.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {b.stock}
                            </span>
                        </td>
                        <td className="p-4 text-right">
                            <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition">
                                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" onClick={() => openEdit(b)} title="Sửa"><Pencil size={18} /></button>
                                <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" onClick={() => remove(b)} title="Xóa"><Trash2 size={18} /></button>
                            </div>
                        </td>
                    </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ MODAL FORM CHÍNH THỨC */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <form 
             className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" 
             onClick={(e) => e.stopPropagation()} 
             onSubmit={save}
          >
            {/* Header */}
            <div className="px-8 py-5 border-b flex justify-between items-center bg-white sticky top-0 z-10">
               <div>
                  <div className="text-xl font-bold text-gray-900">{editing?.new ? 'Thêm sách mới' : 'Chỉnh sửa sách'}</div>
                  <p className="text-sm text-gray-500 mt-0.5">Điền đầy đủ thông tin bên dưới</p>
               </div>
               <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none bg-yellow-50 px-4 py-2 rounded-xl border border-yellow-200 hover:bg-yellow-100 transition">
                     <input type="checkbox" className="w-5 h-5 accent-yellow-500 rounded" checked={draft.isFeatured} onChange={e => setDraft({...draft, isFeatured: e.target.checked})} />
                     <span className="text-sm font-bold text-yellow-800">Sách Nổi Bật</span>
                  </label>
                  <button type="button" onClick={() => setEditing(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"><X size={24} /></button>
               </div>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* CỘT TRÁI (4/12): ẢNH, GIÁ, DANH MỤC */}
                <div className="lg:col-span-4 space-y-6">
                   {/* Ảnh Bìa */}
                   <div className="bg-white p-5 rounded-2xl border shadow-sm">
                      <div className="flex justify-between mb-3 items-center">
                        <label className="text-sm font-bold text-gray-800">Ảnh bìa</label>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                           <TabButton label="Upload" active={imageTab==='upload'} onClick={() => setImageTab('upload')} />
                           <TabButton label="URL" active={imageTab==='url'} onClick={() => setImageTab('url')} />
                        </div>
                      </div>
                      {imageTab === 'upload' ? (
                        <ImageUploader value={draft.coverUrl} onChange={handleImageChange} />
                      ) : (
                        <input className="input w-full" placeholder="https://..." value={draft.coverUrl} onChange={e => setDraft({...draft, coverUrl: e.target.value})} />
                      )}
                   </div>

                   {/* Giá & Kho */}
                   <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-gray-900 border-b pb-2 mb-2 flex items-center gap-2"><Hash size={16}/> Thiết lập bán hàng</h3>
                      <div className="grid grid-cols-2 gap-4">
                         <Field label="Giá gốc (đ)">
                            <input type="number" className="input w-full font-bold text-gray-800" value={draft.price} onChange={e => setDraft({...draft, price: e.target.value})} />
                         </Field>
                         <Field label="Giảm giá (%)">
                            <input type="number" className="input w-full text-red-600 font-bold bg-red-50 border-red-200" value={draft.discountPercent} onChange={e => setDraft({...draft, discountPercent: e.target.value})} />
                         </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <Field label="Tồn kho">
                            <input type="number" className="input w-full" value={draft.stock} onChange={e => setDraft({...draft, stock: e.target.value})} />
                         </Field>
                         <Field label="Trạng thái">
                            <select className="input w-full" value={draft.isActive} onChange={e => setDraft({...draft, isActive: e.target.value === 'true'})}>
                               <option value="true">Đang bán</option>
                               <option value="false">Ẩn</option>
                            </select>
                         </Field>
                      </div>
                   </div>

                   {/* DANH MỤC (Bên trái cho cân đối) */}
                   <div className="bg-white p-5 rounded-2xl border shadow-sm">
                      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><Layers size={16} className="text-blue-600"/> Danh mục sản phẩm</h3>
                      <CategoryTreeSelect roots={roots} value={draft.categoryIds} onChange={(ids) => setDraft({ ...draft, categoryIds: ids })} />
                   </div>
                </div>

                {/* CỘT PHẢI (8/12): THÔNG TIN CHI TIẾT */}
                <div className="lg:col-span-8 space-y-6">
                   <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-5">
                      <Field label="Tên sách" icon={BookOpen}>
                         <input className="input w-full text-lg font-semibold" placeholder="Nhập tên sách..." value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} required />
                      </Field>
                      
                      {/* ✅ GỢI Ý TÁC GIẢ */}
                      <Field label="Tác giả" icon={User}>
                          <input 
                             className="input w-full" 
                             list="author-list" // ID của datalist
                             placeholder="Nhập hoặc chọn tên tác giả..." 
                             value={draft.author} 
                             onChange={e => setDraft({ ...draft, author: e.target.value })} 
                          />
                          <datalist id="author-list">
                              {suggestAuthors.map((a, i) => <option key={i} value={a} />)}
                          </datalist>
                      </Field>

                      {/* Box Thông tin chi tiết */}
                      <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                           <h4 className="font-bold text-blue-800 text-sm mb-4 uppercase tracking-wide flex items-center gap-2"><Store size={16}/> Thông tin chi tiết</h4>
                           <div className="grid grid-cols-2 gap-5">
                              {/* Cột 1 */}
                              <div>
                                  <Field label="Nhà xuất bản" icon={Store}>
                                      <input className="input w-full bg-white" list="pub-list" value={draft.publisher} onChange={e => setDraft({...draft, publisher: e.target.value})} placeholder="Chọn hoặc nhập..." />
                                      <datalist id="pub-list">{suggestPublishers.map((p,i)=><option key={i} value={p}/>)}</datalist>
                                  </Field>
                                  
                                  <Field label="Hình thức" icon={Layers}>
                                     <select className="input w-full bg-white" value={draft.format} onChange={e => setDraft({...draft, format: e.target.value})}>
                                        <option value="Bìa mềm">Bìa mềm</option>
                                        <option value="Bìa cứng">Bìa cứng</option>
                                        <option value="Bìa da">Bìa da</option>
                                        <option value="Boxset">Boxset</option>
                                     </select>
                                  </Field>

                                  <Field label="Khổ sách" icon={Ruler}>
                                      <input className="input w-full bg-white" list="size-list" placeholder="VD: 13 x 20.5 cm" value={draft.size} onChange={e => setDraft({...draft, size: e.target.value})} />
                                      <datalist id="size-list">
                                          {suggestSizes.map((s,i)=><option key={i} value={s}/>)}
                                      </datalist>
                                  </Field>
                              </div>

                              {/* Cột 2 */}
                              <div>
                                  <Field label="Năm xuất bản" icon={Calendar}>
                                      <input type="number" className="input w-full bg-white" placeholder="VD: 2024" value={draft.publicationYear} onChange={e => setDraft({...draft, publicationYear: e.target.value})} />
                                  </Field>
                                  <Field label="Số trang" icon={FileText}>
                                      <input type="number" className="input w-full bg-white" placeholder="VD: 300" value={draft.pages} onChange={e => setDraft({...draft, pages: e.target.value})} />
                                  </Field>
                                  <Field label="Trọng lượng (g)" icon={Weight}>
                                      <input type="number" className="input w-full bg-white" placeholder="VD: 500" value={draft.weight} onChange={e => setDraft({...draft, weight: e.target.value})} />
                                  </Field>
                              </div>
                           </div>
                      </div>

                      {/* MÔ TẢ SÁCH */}
                      <Field label="Mô tả chi tiết" icon={FileText}>
                         <textarea 
                            className="input w-full h-48 leading-relaxed font-normal" 
                            value={draft.description || ''} 
                            onChange={e => setDraft({...draft, description: e.target.value})} 
                            placeholder="Nhập nội dung giới thiệu sách..." 
                         />
                      </Field>
                   </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t bg-white flex justify-end gap-3 sticky bottom-0 z-10">
              <button type="button" className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium text-gray-700" onClick={() => setEditing(null)}>Hủy bỏ</button>
              <button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-lg shadow-blue-200">
                {editing?.new ? 'Tạo Sách Mới' : 'Lưu Thay Đổi'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}