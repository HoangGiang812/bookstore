import { useAuth } from '../../store/useAuth'
import { useState } from 'react'
import { list, add, update, remove, setDefault } from '../../controller/addressController'

export default function Account(){
  const { user } = useAuth()
  const [tab,setTab] = useState('profile')
  const [profile,setProfile] = useState({name:user?.name||'', phone:'', avatar:user?.avatar||''})
  const [addresses,setAddresses] = useState(list(user?.id||''))
  const [form,setForm] = useState({fullName:user?.name||'', phone:'', address:''})

  const addAddr = ()=>{
    const l = add(user.id, form); setAddresses(l); setForm({fullName:user.name, phone:'', address:''})
  }

  return (
    <div className="container px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Tài khoản</h1>
      <div className="card p-4">
        <div className="flex gap-4 border-b mb-4">
          {['profile','addresses'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 ${tab===t?'border-b-2 border-purple-600 text-purple-600':'text-gray-600'}`}>{t==='profile'?'Hồ sơ':'Sổ địa chỉ'}</button>
          ))}
        </div>
        {tab==='profile' ? (
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <img src={profile.avatar} className="w-32 h-32 rounded-full object-cover"/>
            </div>
            <div className="md:col-span-2 space-y-3">
              <div><label className="block text-sm mb-1">Họ tên</label><input className="input" value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/></div>
              <div><label className="block text-sm mb-1">SĐT</label><input className="input" value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})}/></div>
              <button className="btn bg-gray-100 hover:bg-gray-200">Lưu</button>
            </div>
          </div>
        ):(
          <div>
            <div className="grid md:grid-cols-3 gap-3">
              <input className="input" placeholder="Họ và tên" value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/>
              <input className="input" placeholder="Số điện thoại" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
              <input className="input" placeholder="Địa chỉ" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/>
            </div>
            <div className="mt-3"><button onClick={addAddr} className="btn bg-gray-100 hover:bg-gray-200">Thêm địa chỉ</button></div>
            <div className="mt-4 space-y-3">
              {addresses.map(a=>(
                <div key={a.id} className="border rounded-lg p-3 flex items-center justify-between">
                  <div><b>{a.fullName}</b> • {a.phone}<div className="text-sm text-gray-600">{a.address}</div></div>
                  <div className="flex gap-2">
                    {!a.isDefault && <button onClick={()=>setAddresses(setDefault(user.id,a.id))} className="btn bg-gray-100 hover:bg-gray-200">Đặt mặc định</button>}
                    <button onClick={()=>setAddresses(remove(user.id,a.id))} className="btn bg-gray-100 hover:bg-gray-200">Xóa</button>
                  </div>
                </div>
              ))}
              {addresses.length===0 && <div className="text-gray-600">Chưa có địa chỉ</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
