import { useEffect, useState } from 'react'
import { listBooks, stockIntake } from '@/services/admin'

export default function StockIntake(){
  const [books,setBooks] = useState([])
  const [bookId,setBookId] = useState('')
  const [qty,setQty] = useState(0)
  const [note,setNote] = useState('')
  const [msg,setMsg] = useState('')

  useEffect(()=>{
    (async ()=>{
      const res = await listBooks({ limit: 200 })
      setBooks(res.items || res)
    })()
  },[])

  const submit = async (e)=>{
    e.preventDefault(); setMsg('')
    if (!bookId || qty<=0) return setMsg('Chọn sách và số lượng > 0')
    await stockIntake(bookId, Number(qty), note)
    setMsg('Đã nhập kho thành công!')
    setQty(0); setNote('')
  }

  return (
    <form onSubmit={submit} className="space-y-3 max-w-xl">
      <h2 className="text-lg font-bold">Nhập kho</h2>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="block">Chọn sách
          <select className="input mt-1" value={bookId} onChange={e=>setBookId(e.target.value)}>
            <option value="">-- chọn --</option>
            {books.map(b=><option key={b._id} value={b._id}>{b.title}</option>)}
          </select>
        </label>
        <label className="block">Số lượng
          <input type="number" className="input mt-1" value={qty} onChange={e=>setQty(e.target.value)} min={1}/>
        </label>
      </div>
      <label className="block">Ghi chú
        <input className="input mt-1" value={note} onChange={e=>setNote(e.target.value)} placeholder="Phiếu nhập, nhà cung cấp..."/>
      </label>
      <button className="btn">Nhập kho</button>
      {msg && <div className="text-sm mt-2 text-green-600">{msg}</div>}
    </form>
  )
}
