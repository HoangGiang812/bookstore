import { useState } from 'react'
import { importBooksCSV } from '@/services/admin'

export default function ImportCSV(){
  const [file,setFile] = useState(null)
  const [msg,setMsg] = useState('')
  const submit = async (e)=>{
    e.preventDefault(); setMsg('')
    if (!file) return setMsg('Chọn file CSV/Excel trước')
    try { 
      const r = await importBooksCSV(file)
      setMsg(`Import thành công: ${r?.inserted||0} thêm mới, ${r?.updated||0} cập nhật`)
    } catch (e) {
      setMsg(e.message || 'Import lỗi')
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3 max-w-md">
      <h2 className="text-lg font-bold">Import sách từ CSV/Excel</h2>
      <input type="file" accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={e=>setFile(e.target.files?.[0]||null)} />
      <button className="btn">Tải lên</button>
      {msg && <div className="text-sm mt-2">{msg}</div>}
    </form>
  )
}
