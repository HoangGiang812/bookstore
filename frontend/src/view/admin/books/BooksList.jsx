import { useEffect, useState } from 'react'
import { listBooks, deleteBook } from '@/services/admin'
import { Link, useNavigate } from 'react-router-dom'

export default function BooksList(){
  const [q,setQ] = useState('')
  const [rows,setRows] = useState([])
  const [loading,setLoading] = useState(true)
  const nav = useNavigate()

  useEffect(()=>{
    (async ()=>{
      setLoading(true)
      try { setRows((await listBooks({ q })).items || []) }
      catch { setRows([]) }
      finally { setLoading(false) }
    })()
  },[q])

  const remove = async (id)=>{
    if (!confirm('Xoá sách này?')) return
    await deleteBook(id)
    setRows((rows)=>rows.filter(r=>r._id!==id))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Sách</h2>
        <div className="flex items-center gap-2">
          <input className="input" placeholder="Tìm..." value={q} onChange={e=>setQ(e.target.value)} />
          <button className="btn" onClick={()=>nav('/admin/books/new')}>+ Thêm</button>
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Tiêu đề</th>
              <th className="p-2">ISBN</th>
              <th className="p-2">Giá</th>
              <th className="p-2">Tồn</th>
              <th className="p-2">Hiển thị</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-4 text-center text-gray-500">Đang tải...</td></tr>
            ) : rows.length===0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>
            ) : rows.map(b=>(
              <tr key={b._id} className="border-t">
                <td className="p-2">
                  <Link className="text-indigo-600 hover:underline" to={`/admin/books/${b._id}`}>{b.title}</Link>
                </td>
                <td className="p-2 text-center">{b.isbn}</td>
                <td className="p-2 text-right">{Number(b.price||0).toLocaleString('vi-VN')}</td>
                <td className="p-2 text-center">{b.stock}</td>
                <td className="p-2 text-center">{b.active ? '✓' : '✗'}</td>
                <td className="p-2 text-right">
                  <button onClick={()=>nav(`/admin/books/${b._id}`)} className="btn-outline mr-2">Sửa</button>
                  <button onClick={()=>remove(b._id)} className="btn-danger">Xoá</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
