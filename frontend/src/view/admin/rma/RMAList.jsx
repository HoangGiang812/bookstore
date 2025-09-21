import { useEffect, useState } from 'react'
import { rma } from '@/services/admin'

export default function RMAList(){
  const [rows,setRows] = useState([])
  const [status,setStatus] = useState('') // pending|approved|denied|received|refunded...

  const load = async ()=> setRows((await rma.list({ status })).items || [])
  useEffect(()=>{ load() },[status])

  const act = async (row, action)=> {
    await rma.update(row._id, { action }) // ví dụ: approve/deny/receive/restock/refund...
    load()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Đổi/Trả (RMA)</h2>
        <select className="input w-48" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">Tất cả</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="denied">denied</option>
          <option value="received">received</option>
          <option value="refunded">refunded</option>
        </select>
      </div>

      <div className="rounded-xl border bg-white">
        {rows.map(r=>(
          <div key={r._id} className="p-3 border-t">
            <div className="font-semibold">{r.orderCode || r.orderId}</div>
            <div className="text-sm text-gray-600">{r.reason}</div>
            <div className="text-sm mt-1">Trạng thái: <b>{r.status}</b></div>
            <div className="flex gap-2 mt-2">
              <button className="btn-outline" onClick={()=>act(r,'approve')}>Duyệt</button>
              <button className="btn-outline" onClick={()=>act(r,'deny')}>Từ chối</button>
              <button className="btn-outline" onClick={()=>act(r,'receive')}>Đã nhận hàng</button>
              <button className="btn-outline" onClick={()=>act(r,'restock')}>Nhập lại kho</button>
              <button className="btn-outline" onClick={()=>act(r,'refund')}>Hoàn tiền</button>
            </div>
          </div>
        ))}
        {rows.length===0 && <div className="p-4 text-gray-500">Không có yêu cầu</div>}
      </div>
    </div>
  )
}
