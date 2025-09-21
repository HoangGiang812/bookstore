import { useEffect, useState } from 'react'
import { overview } from '@/services/admin'
import { DollarSign, PackageCheck, Users2, BookOpen } from 'lucide-react'

export default function Dashboard(){
  const [range, setRange] = useState('7d') // 7d|30d|month
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    (async ()=>{
      setLoading(true)
      try { setData(await overview({ range })) }
      catch { setData({ revenue:0, ordersByStatus:{}, topBooks:[], topCustomers:[] }) }
      finally { setLoading(false) }
    })()
  },[range])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tổng quan</h1>
        <select className="input w-32" value={range} onChange={e=>setRange(e.target.value)}>
          <option value="7d">7 ngày</option>
          <option value="30d">30 ngày</option>
          <option value="month">Tháng này</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat icon={DollarSign} title="Doanh thu" value={fmtVND(data?.revenue||0)} loading={loading}/>
        <Stat icon={PackageCheck} title="Đơn (completed)" value={data?.ordersByStatus?.completed||0} loading={loading}/>
        <Stat icon={Users2} title="Khách mới" value={data?.newCustomers||0} loading={loading}/>
        <Stat icon={BookOpen} title="Sách bán" value={data?.soldItems||0} loading={loading}/>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Top sách bán chạy">
          <ul className="divide-y">
            {(data?.topBooks||[]).map((b)=>(
              <li key={b._id} className="py-2 flex items-center justify-between">
                <span className="truncate">{b.title}</span>
                <span className="font-semibold">{b.qty}</span>
              </li>
            ))}
            {(!data?.topBooks || data.topBooks.length===0) && <Empty/>}
          </ul>
        </Panel>

        <Panel title="Top khách hàng">
          <ul className="divide-y">
            {(data?.topCustomers||[]).map((c)=>(
              <li key={c._id} className="py-2 flex items-center justify-between">
                <span className="truncate">{c.name || c.email}</span>
                <span className="font-semibold">{fmtVND(c.revenue||0)}</span>
              </li>
            ))}
            {(!data?.topCustomers || data.topCustomers.length===0) && <Empty/>}
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function Stat({ icon:Icon, title, value, loading }) {
  return (
    <div className="rounded-xl border bg-white p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-gray-100"><Icon className="w-5 h-5 text-gray-700"/></div>
      <div>
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-xl font-bold">{loading ? '...' : value}</div>
      </div>
    </div>
  )
}
function Panel({ title, children }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="font-semibold mb-2">{title}</div>
      {children}
    </div>
  )
}
function Empty(){ return <div className="text-sm text-gray-500">Chưa có dữ liệu</div> }
function fmtVND(n){ return Number(n||0).toLocaleString('vi-VN', { style:'currency', currency:'VND' }) }
