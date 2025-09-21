import { useEffect, useState } from 'react'
import { categories } from '@/services/admin'

export default function Categories(){
  const [rows,setRows] = useState([])
  const [name,setName] = useState('')
  const load = async ()=> setRows(await categories.list())
  useEffect(()=>{ load() },[])
  const add = async (e)=>{ e.preventDefault(); await categories.create({ name }); setName(''); load() }
  const update = async (row)=>{ const name = prompt('Tên mới', row.name); if(!name) return; await categories.update(row._id, { name }); load() }
  const remove = async (row)=>{ if(!confirm('Xoá?')) return; await categories.remove(row._id); load() }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Danh mục</h2>
      <form onSubmit={add} className="flex gap-2">
        <input className="input" placeholder="Tên danh mục" value={name} onChange={e=>setName(e.target.value)} required/>
        <button className="btn">Thêm</button>
      </form>
      <div className="rounded-xl border bg-white">
        <ul>
          {rows.map(r=>(
            <li key={r._id} className="p-2 border-t flex items-center justify-between">
              <span>{r.name}</span>
              <div className="flex gap-2">
                <button className="btn-outline" onClick={()=>update(r)}>Sửa</button>
                <button className="btn-danger" onClick={()=>remove(r)}>Xoá</button>
              </div>
            </li>
          ))}
          {rows.length===0 && <div className="p-3 text-gray-500">Chưa có danh mục</div>}
        </ul>
      </div>
    </div>
  )
}
