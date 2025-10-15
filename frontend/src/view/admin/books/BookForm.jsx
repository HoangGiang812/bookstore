// frontend/src/view/admin/books/BookForm.jsx
import { useEffect, useMemo, useState } from 'react';
import { getBook, createBook, updateBook, categories as catApi } from '@/services/admin';
import { useParams, useNavigate } from 'react-router-dom';

/* ==== Helpers để build tree và flatten options ==== */
function buildTree(items) {
  const byId = new Map(items.map(i => [String(i._id), { ...i, children: [] }]));
  const roots = [];
  for (const n of byId.values()) {
    if (n.parentId) {
      const p = byId.get(String(n.parentId));
      if (p) p.children.push(n); else roots.push(n);
    } else roots.push(n);
  }
  const sortRec = (arr) => {
    arr.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name));
    arr.forEach(x => sortRec(x.children));
  };
  sortRec(roots);
  return { roots, byId };
}

function flattenWithIndent(nodes, level = 0, out = []) {
  for (const n of nodes) {
    out.push({ _id: String(n._id), name: `${'  '.repeat(level)}${n.name}`, level });
    if (n.children?.length) flattenWithIndent(n.children, level + 1, out);
  }
  return out;
}

export default function BookForm(){
  const { id } = useParams();
  const isNew = id === 'new';
  const nav = useNavigate();

  const [f, setF] = useState({
    title:'', isbn:'', price:0, stock:0,
    active:true, featured:false, flashSale:false,
    description:'', cover:'', categoryIds:[]
  });

  const [loading, setLoading] = useState(!isNew);
  const [cats, setCats] = useState([]);

  // Load categories (phẳng) rồi build tree tại FE
  useEffect(() => {
    (async () => {
      try {
        const res = await catApi.list(); // /api/categories → { items, total }
        setCats(res?.items || []);
      } catch {}
    })();
  }, []);

  const { roots } = useMemo(() => buildTree(cats), [cats]);
  const catOptions = useMemo(() => flattenWithIndent(roots), [roots]);

  // Load book when editing
  useEffect(() => {
    if (!isNew) (async () => {
      try {
        const data = await getBook(id); // /admin/books/:id
        setF({
          title: data?.title || '',
          isbn: data?.isbn || '',
          price: Number(data?.price || 0),
          stock: Number(data?.stock || 0),
          active: data?.isActive ?? true,
          featured: !!data?.featured,
          flashSale: !!data?.isFlashSale,
          description: data?.description || '',
          cover: data?.coverUrl || data?.image || '',
          categoryIds: Array.isArray(data?.categoryIds)
            ? data.categoryIds.map(String)
            : (Array.isArray(data?.categories) ? data.categories.map(String) : []),
        });
      } catch {}
      setLoading(false);
    })();
  }, [id, isNew]);

  const submit = async (e)=>{
    e.preventDefault();
    const payload = {
      ...f,
      coverUrl: f.cover || '',               // map về BE
      categoryIds: (f.categoryIds || []).filter(Boolean),
    };
    if (isNew) await createBook(payload);
    else await updateBook(id, payload);
    nav('/admin/books');
  };

  return (
    <form onSubmit={submit} className="space-y-3 max-w-2xl">
      <h2 className="text-lg font-bold">{isNew ? 'Thêm sách' : 'Sửa sách'}</h2>
      {loading ? '...' : (
        <>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Tiêu đề">
              <input className="input" value={f.title} onChange={e=>setF({...f, title:e.target.value})} required/>
            </Field>
            <Field label="ISBN">
              <input className="input" value={f.isbn} onChange={e=>setF({...f, isbn:e.target.value})}/>
            </Field>
            <Field label="Giá">
              <input type="number" className="input" value={f.price} onChange={e=>setF({...f, price:Number(e.target.value)})}/>
            </Field>
            <Field label="Tồn kho">
              <input type="number" className="input" value={f.stock} onChange={e=>setF({...f, stock:Number(e.target.value)})}/>
            </Field>
            <Field label="Ảnh bìa URL">
              <input className="input" value={f.cover||''} onChange={e=>setF({...f, cover:e.target.value})}/>
            </Field>

            {/* Multi-select danh mục */}
            <Field label="Danh mục (có thể chọn nhiều)">
              <select
                multiple
                className="input min-h-[160px]"
                value={f.categoryIds}
                onChange={e => setF({
                  ...f,
                  categoryIds: Array.from(e.target.selectedOptions).map(o => o.value)
                })}
              >
                {catOptions.map(opt => (
                  <option key={opt._id} value={opt._id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Mô tả">
            <textarea
              className="input min-h-[120px]"
              value={f.description||''}
              onChange={e=>setF({...f, description:e.target.value})}
            />
          </Field>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!f.active} onChange={e=>setF({...f, active:e.target.checked})}/>
              Hiển thị
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!f.featured} onChange={e=>setF({...f, featured:e.target.checked})}/>
              Nổi bật
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!f.flashSale} onChange={e=>setF({...f, flashSale:e.target.checked})}/>
              Flash sale
            </label>
          </div>

          <div className="flex gap-2">
            <button className="btn">Lưu</button>
            <button type="button" onClick={()=>nav(-1)} className="btn-outline">Huỷ</button>
          </div>
        </>
      )}
    </form>
  );
}

function Field({label, children}) {
  return <label className="block">{label}<div className="mt-1">{children}</div></label>;
}
