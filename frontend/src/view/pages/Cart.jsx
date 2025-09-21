import { useEffect, useMemo, useState } from 'react'
import { useCart } from '../../store/useCart'
import { useAuth } from '../../store/useAuth'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { applyCoupon, shippingFee } from '../../services/cart'
import { create as createOrder } from '../../controller/orderController'
import { list as listAddr } from '../../controller/addressController'
import { useNavigate } from 'react-router-dom'

export default function CartPage(){
  const cart = useCart()
  const { user } = useAuth()
  const nav = useNavigate()
  const [coupon,setCoupon] = useState('')
  const [discount,setDiscount] = useState(0)
  const [addressId,setAddressId] = useState('')
  const [pay,setPay] = useState('COD')

  useEffect(()=>{ cart.init() },[user])
  const subtotal = cart.items.reduce((s,i)=>s+i.price*i.quantity,0)
  const ship = shippingFee(subtotal)
  const total = subtotal - discount + ship

  const addresses = listAddr(user?.id||'')
  useEffect(()=>{ if(addresses[0]) setAddressId(addresses.find(a=>a.isDefault)?.id || addresses[0].id) }, [])

  const apply = ()=>{
    const r = applyCoupon(coupon, subtotal); if(r.valid) setDiscount(subtotal - r.total); else setDiscount(0);
  }

  const order = ()=>{
    if(!user) return nav('/login')
    if(cart.items.length===0) return alert('Giỏ hàng trống')
    const address = addresses.find(a=>a.id===addressId) || null
    const o = createOrder(user.id, {items:cart.items, address, payment:pay, discount, shipping:ship})
    cart.clear()
    alert('Tạo đơn hàng thành công!')
    nav('/orders')
  }

  return (
    <div className="container px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Giỏ hàng</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-4">
          {cart.items.length===0 ? <div className="text-gray-600">Giỏ hàng trống</div> : cart.items.map(i=>(
            <div key={i.id} className="flex items-center gap-4 py-4 border-b last:border-b-0">
              <img src={i.image} className="w-20 h-24 object-cover rounded"/>
              <div className="flex-1">
                <div className="font-medium">{i.title}</div>
                <div className="text-sm text-gray-600">{i.author}</div>
                <div className="text-purple-600 font-semibold">{i.price.toLocaleString()}đ</div>
              </div>
              <div className="flex items-center border rounded-lg">
                <button onClick={()=>cart.update(i.id, i.quantity-1)} className="p-2 hover:bg-gray-100"><Minus className="w-4 h-4"/></button>
                <span className="px-3">{i.quantity}</span>
                <button onClick={()=>cart.update(i.id, i.quantity+1)} className="p-2 hover:bg-gray-100"><Plus className="w-4 h-4"/></button>
              </div>
              <button onClick={()=>cart.remove(i.id)} className="p-2 hover:bg-gray-100 rounded-lg"><Trash2 className="w-5 h-5"/></button>
            </div>
          ))}
        </div>
        <aside className="card p-4 space-y-4">
          <div className="flex gap-2">
            <input className="input" placeholder="Mã giảm giá (GIAM10)" value={coupon} onChange={e=>setCoupon(e.target.value)}/>
            <button onClick={apply} className="btn bg-gray-100 hover:bg-gray-200">Áp dụng</button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Địa chỉ giao hàng</label>
            <select className="input" value={addressId} onChange={e=>setAddressId(e.target.value)}>
              <option value="">-- Chọn địa chỉ --</option>
              {addresses.map(a=>(<option key={a.id} value={a.id}>{a.fullName} - {a.phone} - {a.address}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Thanh toán</label>
            <select className="input" value={pay} onChange={e=>setPay(e.target.value)}>
              <option value="COD">Thanh toán khi nhận hàng (COD)</option>
              <option value="ONLINE">Thanh toán online (giả lập)</option>
            </select>
          </div>
          <div className="text-sm space-y-1 border-t pt-3">
            <div className="flex justify-between"><span>Tạm tính</span><b>{subtotal.toLocaleString()}đ</b></div>
            <div className="flex justify-between"><span>Giảm giá</span><b>-{discount.toLocaleString()}đ</b></div>
            <div className="flex justify-between"><span>Phí vận chuyển</span><b>{ship.toLocaleString()}đ</b></div>
            <div className="flex justify-between text-lg pt-2"><span>Tổng</span><b className="text-purple-600">{total.toLocaleString()}đ</b></div>
          </div>
          <button onClick={order} className="btn-primary w-full">Tạo đơn hàng</button>
        </aside>
      </div>
    </div>
  )
}
