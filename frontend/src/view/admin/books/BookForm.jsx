import { useEffect, useState } from 'react'
import { getBook, createBook, updateBook } from '@/services/admin'
import { useParams, useNavigate } from 'react-router-dom'

export default function BookForm(){
  const { id } = useParams()
  const isNew = id === 'new'
  const nav = useNavigate()
  const [f,setF] = useState({ title:'', isbn:'', price:0, stock:0, active:true, featured:false, flashSale:false, description:'', cover:'' })
  const [loading,setLoading] = useState(!isNew)

  useEffect(()=>{
    if(!isNew) (async ()=>{
      try { setF(await getBook(id)) } catch {}
      setLoading(false)
    })()
  },[id,isNew])

  const submit = async (e)=>{
    e.preventDefault()
    if (isNew) await createBook(f)
    else await updateBook(id, f)
    nav('/admin/books')
  }

  return (
    <form onSubmit={submit} className="space-y-3 max-w-2xl">
      <h2 className="text-lg font-bold">{isNew?'Thêm sách':'Sửa sách'}</h2>
      {loading ? '...' : (
        <>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Tiêu đề"><input className="input" value={f.title} onChange={e=>setF({...f, title:e.target.value})} required/></Field>
            <Field label="ISBN"><input className="input" value={f.isbn} onChange={e=>setF({...f, isbn:e.target.value})}/></Field>
            <Field label="Giá"><input type="number" className="input" value={f.price} onChange={e=>setF({...f, price:Number(e.target.value)})}/></Field>
            <Field label="Tồn kho"><input type="number" className="input" value={f.stock} onChange={e=>setF({...f, stock:Number(e.target.value)})}/></Field>
            <Field label="Ảnh bìa URL"><input className="input" value={f.cover||''} onChange={e=>setF({...f, cover:e.target.value})}/></Field>
          </div>
          <Field label="Mô tả"><textarea className="input min-h-[120px]" value={f.description||''} onChange={e=>setF({...f, description:e.target.value})}/></Field>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.active} onChange={e=>setF({...f, active:e.target.checked})}/> Hiển thị</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.featured} onChange={e=>setF({...f, featured:e.target.checked})}/> Nổi bật</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.flashSale} onChange={e=>setF({...f, flashSale:e.target.checked})}/> Flash sale</label>
          </div>
          <div className="flex gap-2">
            <button className="btn">Lưu</button>
            <button type="button" onClick={()=>nav(-1)} className="btn-outline">Huỷ</button>
          </div>
        </>
      )}
    </form>
  )
}
function Field({label, children}){ return <label className="block">{label}<div className="mt-1">{children}</div></label> }
