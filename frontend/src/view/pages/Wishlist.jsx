import { useAuth } from '../../store/useAuth'
import { list as listWL, toggle as toggleWL } from '../../controller/wishlistController'
import { useEffect, useState } from 'react'
import BookCard from '../components/BookCard'

export default function Wishlist(){
  const { user } = useAuth()
  const [items,setItems] = useState([])

  useEffect(()=>{ if(user){ setItems(listWL(user.id)) } },[user])
  if(!user) return <div className="container px-4 py-8"><h1 className="text-3xl font-bold">Yêu thích</h1><p className="text-gray-600 mt-2">Vui lòng đăng nhập để xem danh sách yêu thích.</p></div>

  return (
    <div className="container px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Yêu thích</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(b=>(<BookCard key={b.id} book={b}/>))}
      </div>
      {items.length===0 && <div className="text-gray-600">Chưa có sản phẩm yêu thích.</div>}
    </div>
  )
}
