import { useEffect, useState } from 'react'
import { orders } from '@/services/admin'
import { Link } from 'react-router-dom'

const statusOptions = ['pending','processing','shipping','completed','canceled','refunded']

export default function OrdersList(){
  const [rows,setRows] = useState([])
  const [q,setQ] = useState('')
  const [status,setStatus] = useState('')

  const load = async ()=> {
    const res = await orders.list({ q, status })
    setRows(res.items || res)
  }
  useEffect(()=>{ load() },[q,status])

  const set = async (row, next)=> {
    await orders.updateStatus(row._id, next)
    load()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Đơn hàng</h2>
        <div className="flex gap-2">
          <input className="input" placeholder="Tìm (mã, email...)" value={q} onChange={e=>setQ(e.target.value)} />
          <select className="input" value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="">Tất cả</option>
            {statusOptions.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr><th className="p-2 text-left">Mã</th><th className="p-2">Khách</th><th className="p-2">Tổng</th><th className="p-2">TT</th><th className="p-2">Trạng thái</th><th className="p-2"></th></tr>
          </thead>
          <tbody>
            {rows.length===0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>
            ) : rows.map(r=>(
              <tr key={r._id} className="border-t">
                <td className="p-2"><Link className="text-indigo-600 hover:underline" to={`/admin/orders/${r._id}`}>{r.code || r._id.slice(-8)}</Link></td>
                <td className="p-2 text-center">{r.customer?.email}</td>
                <td className="p-2 text-right">{Number(r.total||0).toLocaleString('vi-VN')}</td>
                <td className="p-2 text-center">{r.paymentStatus || '-'}</td>
                <td className="p-2 text-center">{r.status}</td>
                <td className="p-2 text-right">
                  <select className="input" value="" onChange={e=>set(r, e.target.value)}>
                    <option value="">Đổi trạng thái...</option>
                    {statusOptions.filter(s=>s!==r.status).map(s=><option key={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
