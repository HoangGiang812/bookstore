// src/pages/admin/ProductsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { listBooks, createBook, updateBook, deleteBook } from '@/services/admin';
import { categories as catApi } from '@/services/admin';

const fmtVND = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n || 0));

export default function ProductsPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null); // null | book | {new:true}
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

  useEffect(() => {
    load();
  }, [q]);

  useEffect(() => {
    (async () => {
      const r = await catApi.list();
      setCats(r.items || r);
    })();
  }, []);

  const filtered = useMemo(() => rows, [rows]);

  const salePriceOf = (b) =>
    Math.round(Number(b.price || 0) * (1 - Math.max(0, Number(b.discountPercent || 0)) / 100));

  const openNew = () => {
    setEditing({ new: true });
    setDraft(initDraft());
  };
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
      categoryIds: b.categoryIds || [],
      isActive: b.isActive !== false,
    });
  };
  const close = () => setEditing(null);

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
      categoryIds: draft.categoryIds,
      isActive: !!draft.isActive,
    };

    if (editing?.new) {
      await createBook(payload);
    } else {
      await updateBook(editing._id || editing.id, payload);
    }
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

      {/* Table */}
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
            {loading ? (
              <tr><td colSpan={8} className="p-4 text-center text-gray-500">Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>
            ) : (
              filtered.map((b) => (
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

      {/* Modal editor */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={close}>
          <form className="bg-white rounded-xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="text-lg font-semibold mb-3">{editing?.new ? 'Thêm sách' : 'Sửa sách'}</div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Tên sách">
                <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
              </Field>
              <Field label="Tác giả">
                <input className="input" value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} />
              </Field>

              <Field label="Giá">
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) || 0 })}
                />
              </Field>

              <Field label="Giảm giá (%)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="input"
                  value={draft.discountPercent}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                    setDraft({ ...draft, discountPercent: v });
                  }}
                />
              </Field>

              <Field label="Ảnh (URL)">
                <input className="input" value={draft.coverUrl} onChange={(e) => setDraft({ ...draft, coverUrl: e.target.value })} />
              </Field>

              <Field label="Trạng thái">
                <select
                  className="input"
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                >
                  <option value="available">Còn hàng</option>
                  <option value="out-of-stock">Hết hàng</option>
                </select>
              </Field>

              <Field label="Kho hàng">
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={draft.stock}
                  onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) || 0 })}
                />
              </Field>

              <Field label="Danh mục">
                <select
                  className="input"
                  multiple
                  value={draft.categoryIds}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      categoryIds: Array.from(e.target.selectedOptions).map((o) => o.value),
                    })
                  }
                >
                  {(cats || []).map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-gray-500 mt-1">Giữ Ctrl/Cmd để chọn nhiều mục</div>
              </Field>
            </div>

            {/* Preview giá */}
            <div className="mt-3 text-sm">
              <span className="text-gray-500 mr-2">Giá hiển thị:</span>
              {draft.discountPercent > 0 ? (
                <>
                  <span className="line-through mr-2">{fmtVND(draft.price)}</span>
                  <span className="font-semibold">{fmtVND(salePreview)}</span>
                </>
              ) : (
                <span className="font-semibold">{fmtVND(draft.price)}</span>
              )}
            </div>

            <div className="flex gap-2 mt-4 justify-end">
              <button type="button" className="px-3 py-2 border rounded-lg" onClick={close}>
                Huỷ
              </button>
              <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-lg">
                Lưu
              </button>
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
