// src/pages/admin/ProductsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { listBooks, createBook, updateBook, deleteBook, categories as catApi } from '@/services/admin';

const fmtVND = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n || 0));

/* ==== Helpers ==== */
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
function buildParentMap(roots) {
  const map = new Map();
  const walk = (node, parentId=null) => {
    const id = String(node._id);
    map.set(id, parentId);
    (node.children || []).forEach(c => walk(c, id));
  };
  roots.forEach(r => walk(r, null));
  return map;
}
// map id -> parentId từ danh sách phẳng (dùng khi lưu để mở rộng cha/ông)
function buildParentMapFromFlat(items) {
  const map = new Map();
  (items || []).forEach(c => {
    map.set(String(c._id), c.parentId ? String(c.parentId) : null);
  });
  return map;
}

/* ================= CategoryTreeSelect (không nhảy lên đầu + xử lý cha–con) ================= */
function CategoryTreeSelect({ roots, value, onChange }) {
  // mặc định đóng hết
  const [openMap, setOpenMap] = useState({});
  const parentMap = useMemo(() => buildParentMap(roots || []), [roots]);
  const selected = useMemo(() => new Set((value || []).map(String)), [value]);

  // tra cứu node theo id để duyệt subtree nhanh
  const nodeById = useMemo(() => {
    const m = new Map();
    const walk = (n) => { m.set(String(n._id), n); (n.children || []).forEach(walk); };
    (roots || []).forEach(walk);
    return m;
  }, [roots]);

  // Khung cuộn + helper giữ vị trí cuộn (double rAF để chắc chắn)
  const boxRef = useRef(null);
  const preserveScroll = (fn) => {
    const box = boxRef.current;
    const top = box ? box.scrollTop : 0;
    fn();
    // Đảm bảo DOM đã cập nhật rồi mới restore
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (boxRef.current) boxRef.current.scrollTop = top;
      });
    });
  };

  // khi có giá trị đang chọn -> tự mở ancestor (còn lại vẫn đóng)
  useEffect(() => {
    if (!Array.isArray(value) || value.length === 0) return;
    setOpenMap(prev => {
      const next = { ...prev };
      const openAncestorsOf = (id) => {
        let cur = parentMap.get(String(id));
        while (cur != null) {
          next[String(cur)] = true;
          cur = parentMap.get(String(cur));
        }
      };
      value.forEach(openAncestorsOf);
      return next;
    });
  }, [value, parentMap]);

  // tính trạng thái checked/indeterminate bottom-up
  const states = useMemo(() => {
    const cache = new Map();
    const dfs = (node) => {
      const id = String(node._id);
      const children = node.children || [];
      if (!children.length) {
        const checked = selected.has(id);
        const st = { checked, indeterminate: false };
        cache.set(id, st);
        return st;
      }
      const cs = children.map(dfs);
      const all = cs.every(s => s.checked);
      const some = cs.some(s => s.checked || s.indeterminate);
      const checked = selected.has(id) || all;
      const indeterminate = !checked && some;
      const st = { checked, indeterminate };
      cache.set(id, st);
      return st;
    };
    (roots || []).forEach(dfs);
    return cache;
  }, [roots, selected]);

  const collectIds = (node, out = []) => {
    out.push(String(node._id));
    for (const c of node.children || []) collectIds(c, out);
    return out;
  };

  const getAncestors = (id) => {
    const res = [];
    let cur = parentMap.get(String(id));
    while (cur != null) { res.push(String(cur)); cur = parentMap.get(cur); }
    return res;
  };

  const subtreeHasAnySelected = (rootId, set) => {
    const n = nodeById.get(String(rootId));
    if (!n) return false;
    const stack = [n];
    while (stack.length) {
      const x = stack.pop();
      const xid = String(x._id);
      if (set.has(xid)) return true;
      (x.children || []).forEach(ch => stack.push(ch));
    }
    return false;
  };

  const toggleOpen = (id) => {
    const k = String(id);
    preserveScroll(() => setOpenMap(prev => ({ ...prev, [k]: !prev[k] })));
  };

  // ✔️ Thêm/giữ cha khi tick; gỡ cha nếu không còn con nào khi bỏ tick
  const toggleCheck = (node) => {
    preserveScroll(() => {
      const ids = collectIds(node);
      const next = new Set(selected);
      const nodeId = String(node._id);
      const selecting = ids.some((id) => !next.has(id));

      if (selecting) {
        // 1) thêm node + toàn bộ con
        ids.forEach((id) => next.add(id));
        // 2) thêm tất cả cha
        getAncestors(nodeId).forEach((aid) => next.add(aid));
      } else {
        // 1) bỏ node + toàn bộ con
        ids.forEach((id) => next.delete(id));
        // 2) gỡ các cha KHÔNG còn con nào đang chọn
        getAncestors(nodeId).forEach((anc) => {
          const stillHas = subtreeHasAnySelected(anc, next);
          if (!stillHas) next.delete(anc);
        });
      }
      onChange(Array.from(next));
    });
  };

  const Row = ({ node, level }) => {
    const id = String(node._id);
    const st = states.get(id) || { checked: false, indeterminate: false };
    const hasChildren = (node.children || []).length > 0;
    const opened = !!openMap[id];

    return (
      <li className="py-1">
        <div
          className="flex items-center"
          style={{ paddingLeft: level * 16 }}  // dùng padding-left để hitbox chuẩn
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleOpen(id); }}
              onMouseDown={(e) => e.preventDefault()} // chặn focus gây scroll
              className="w-7 h-7 mr-1 grid place-items-center rounded hover:bg-gray-100 shrink-0"
              title={opened ? 'Thu gọn' : 'Mở rộng'}
              aria-label={opened ? 'Thu gọn' : 'Mở rộng'}
            >
              {opened ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
            </button>
          ) : (
            <span className="w-7 h-7 mr-1 shrink-0" />
          )}

          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={st.checked}
              ref={(el) => { if (el) el.indeterminate = st.indeterminate; }}
              onMouseDown={(e) => e.preventDefault()} // chặn focus gây scroll
              onChange={() => toggleCheck(node)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">{node.name}</span>
          </label>
        </div>

        {hasChildren && opened && (
          <ul className="ml-0">
            {node.children.map((c) => (
              <Row key={String(c._id)} node={c} level={level + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  };

  if (!roots?.length) return <div className="text-sm text-gray-500">Chưa có danh mục</div>;

  return (
    <div
      ref={boxRef}
      className="rounded border p-2 max-h-[280px] overflow-auto bg-white"
      style={{ overscrollBehavior: 'contain' }}  // tránh bật cuộn ra ngoài
    >
      <ul>
        {roots.map((n) => <Row key={String(n._id)} node={n} level={0} />)}
      </ul>
    </div>
  );
}

/* ================= Trang ProductsPage (giữ nguyên ngoài phần Tree) ================= */
export default function ProductsPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(initDraft());

  function initDraft() {
    return {
      title: '',
      author: '',
      coverUrl: '',
      price: 0,
      discountPercent: 0,
      stock: 0,
      status: 'available',
      categoryIds: [],
      isActive: true,
    };
  }

  const load = async () => {
    setLoading(true);
    const res = await listBooks({ q });
    setRows(res.items || res);
    setLoading(false);
  };

  useEffect(() => { load(); }, [q]);

  useEffect(() => {
    (async () => {
      const r = await catApi.list();
      setCats(r.items || r);
    })();
  }, []);

  const { roots } = useMemo(() => buildTree(cats), [cats]);

  const salePriceOf = (b) =>
    Math.round(Number(b.price || 0) * (1 - Math.max(0, Number(b.discountPercent || 0)) / 100));

  const openNew = () => { setEditing({ new: true }); setDraft(initDraft()); };
  const openEdit = (b) => {
    setEditing(b);
    setDraft({
      title: b.title || '',
      author: b.author || b.authorName || '',
      coverUrl: b.coverUrl || '',
      price: b.price || 0,
      discountPercent: b.discountPercent || 0,
      stock: b.stock || 0,
      status: b.status || (Number(b.stock) > 0 ? 'available' : 'out-of-stock'),
      categoryIds: (b.categoryIds || b.categories || []).map(String),
      isActive: b.isActive !== false,
    });
  };
  const close = () => setEditing(null);

  // ✓ Mở rộng danh mục với tổ tiên khi LƯU (đảm bảo BE nhận đủ cha/ông)
  const flatParentMap = useMemo(() => buildParentMapFromFlat(cats), [cats]);
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

  const save = async (e) => {
    e?.preventDefault?.();
    if (!draft.title.trim()) return alert('Nhập tên sách');

    const payload = {
      title: draft.title.trim(),
      author: draft.author?.trim(),
      coverUrl: draft.coverUrl?.trim(),
      price: Number(draft.price || 0),
      discountPercent: Math.max(0, Number(draft.discountPercent || 0)),
      stock: Math.max(0, Number(draft.stock || 0)),
      status: draft.status,
      categoryIds: expandWithAncestors(draft.categoryIds || []).filter(Boolean),
      isActive: !!draft.isActive,
    };

    if (editing?.new) await createBook(payload);
    else await updateBook(editing._id || editing.id, payload);

    close();
    load();
  };

  const remove = async (row) => {
    if (!confirm('Xoá sách này?')) return;
    await deleteBook(row._id || row.id);
    load();
  };

  const salePreview = Math.round(Number(draft.price || 0) * (1 - Math.max(0, Number(draft.discountPercent || 0)) / 100));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Quản lý sản phẩm</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-7 pr-3 py-2 border rounded-lg text-sm"
              placeholder="Tìm theo tên, tác giả..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg" onClick={openNew}>
            <Plus className="w-4 h-4" /> Thêm
          </button>
        </div>
      </div>

      {/* Bảng */}
      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Tên sách</th>
              <th className="p-2">Tác giả</th>
              <th className="p-2">Giá gốc</th>
              <th className="p-2">Giảm giá (%)</th>
              <th className="p-2">Giá sau giảm</th>
              <th className="p-2">Trạng thái</th>
              <th className="p-2">Kho hàng</th>
              <th className="p-2 w-44"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="p-4 text-center text-gray-500">{loading ? 'Đang tải...' : 'Không có dữ liệu'}</td></tr>
            ) : (
              rows.map((b) => (
                <tr key={b._id || b.id} className="border-t">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {b.coverUrl ? <img src={b.coverUrl} alt="" className="w-8 h-10 object-cover rounded" /> : null}
                      <span className="font-medium">{b.title}</span>
                    </div>
                  </td>
                  <td className="p-2 text-center">{b.author || b.authorName || '-'}</td>
                  <td className="p-2 text-right">{fmtVND(b.price)}</td>
                  <td className="p-2 text-center">{Number(b.discountPercent || 0)}</td>
                  <td className="p-2 text-right font-semibold">{fmtVND(salePriceOf(b))}</td>
                  <td className="p-2 text-center">{b.status === 'available' ? 'Còn hàng' : 'Hết hàng'}</td>
                  <td className="p-2 text-center">{b.stock ?? 0}</td>
                  <td className="p-2 text-right">
                    <button className="btn-outline mr-2 inline-flex items-center gap-1 px-2 py-1 border rounded-lg" onClick={() => openEdit(b)}>
                      <Pencil className="w-4 h-4" /> Sửa
                    </button>
                    <button className="btn-danger inline-flex items-center gap-1 px-2 py-1 border rounded-lg text-red-600" onClick={() => remove(b)}>
                      <Trash2 className="w-4 h-4" /> Xoá
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={close}>
          <form className="bg-white rounded-xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="text-lg font-semibold mb-3">{editing?.new ? 'Thêm sách' : 'Sửa sách'}</div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Tên sách"><input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required /></Field>
              <Field label="Tác giả"><input className="input" value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} /></Field>
              <Field label="Giá"><input type="number" min={0} className="input" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) || 0 })} /></Field>
              <Field label="Giảm giá (%)"><input type="number" min={0} max={100} className="input" value={draft.discountPercent} onChange={(e) => setDraft({ ...draft, discountPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} /></Field>
              <Field label="Ảnh (URL)"><input className="input" value={draft.coverUrl} onChange={(e) => setDraft({ ...draft, coverUrl: e.target.value })} /></Field>
              <Field label="Trạng thái">
                <select className="input" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                  <option value="available">Còn hàng</option>
                  <option value="out-of-stock">Hết hàng</option>
                </select>
              </Field>
              <Field label="Kho hàng"><input type="number" min={0} className="input" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) || 0 })} /></Field>

              <Field label="Danh mục (cha–con, chọn được nhiều)">
                <CategoryTreeSelect roots={roots} value={draft.categoryIds} onChange={(ids) => setDraft({ ...draft, categoryIds: ids })} />
              </Field>
            </div>

            <div className="mt-3 text-sm">
              <span className="text-gray-500 mr-2">Giá hiển thị:</span>
              {draft.discountPercent > 0 ? (
                <>
                  <span className="line-through mr-2">{fmtVND(draft.price)}</span>
                  <span className="font-semibold">
                    {fmtVND(Math.round(Number(draft.price || 0) * (1 - Math.max(0, Number(draft.discountPercent || 0)) / 100)))}
                  </span>
                </>
              ) : (
                <span className="font-semibold">{fmtVND(draft.price)}</span>
              )}
            </div>

            <div className="flex gap-2 mt-4 justify-end">
              <button type="button" className="px-3 py-2 border rounded-lg" onClick={close}>Huỷ</button>
              <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-lg">Lưu</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-sm">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
