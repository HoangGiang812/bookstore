import { list, cancel, rma } from '../../controller/orderController'
import { useAuth } from '../../store/useAuth'
import { useEffect, useState } from 'react'

export default function Orders(){
  const { user } = useAuth()
  const [items,setItems] = useState([])
  const [filter,setFilter] = useState('all')

  useEffect(()=>{ if(user){ setItems(list(user.id)) } },[user])

  const filtered = items.filter(o=> filter==='all' ? true : o.status===filter)

  return (
    <div className="container px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Đơn hàng của tôi</h1>
      <div className="mb-4">
        <select className="input max-w-xs" value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="all">Tất cả</option>
          <option value="pending">Chờ xử lý</option>
          <option value="processing">Đang xử lý</option>
          <option value="shipped">Đang giao</option>
          <option value="delivered">Đã giao</option>
          <option value="cancelled">Đã hủy</option>
        </select>
      </div>
      <div className="space-y-4">
        {filtered.map(o=>(
          <div key={o.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Đơn #{o.id.slice(-6)}</div>
                <div className="text-sm text-gray-600">Ngày: {o.createdAt} • Trạng thái: <b>{o.status}</b></div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-purple-600">{o.total.toLocaleString()}đ</div>
                {o.status==='pending' && (
                  <div className="flex gap-2 justify-end mt-2">
                    <button onClick={()=>{ const x=cancel(user.id,o.id); setItems(list(user.id)); }} className="btn bg-gray-100 hover:bg-gray-200">Hủy đơn</button>
                    <button onClick={()=>{ const x=rma(user.id,o.id,'Không phù hợp'); alert('Đã gửi yêu cầu đổi/trả'); setItems(list(user.id)); }} className="btn bg-gray-100 hover:bg-gray-200">Yêu cầu đổi/trả</button>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 text-sm">
              {o.items.map(i=>(<div key={i.id} className="flex justify-between"><span>{i.title} × {i.quantity}</span><b>{(i.price*i.quantity).toLocaleString()}đ</b></div>))}
            </div>
          </div>
        ))}
        {filtered.length===0 && <div className="text-gray-600">Chưa có đơn phù hợp</div>}
      </div>
    </div>
  )
}
