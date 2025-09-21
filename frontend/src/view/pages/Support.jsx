import { useState } from 'react'
export default function Support(){
  const [f,setF] = useState({name:'', email:'', message:''})
  const send = ()=>{ if(!f.name||!f.email||!f.message) return alert('Vui lòng điền đầy đủ'); alert('Đã gửi liên hệ (mock). Chúng tôi sẽ phản hồi qua email!'); setF({name:'',email:'',message:''}) }
  return (
    <div className="container px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Hỗ trợ & Liên hệ</h1>
      <div className="card p-4 max-w-2xl">
        <div className="grid md:grid-cols-2 gap-3">
          <input className="input" placeholder="Họ và tên" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
          <input className="input" type="email" placeholder="Email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/>
        </div>
        <textarea className="input mt-3" rows="5" placeholder="Nội dung" value={f.message} onChange={e=>setF({...f,message:e.target.value})}/>
        <button onClick={send} className="btn-primary mt-3">Gửi</button>
      </div>
    </div>
  )
}
