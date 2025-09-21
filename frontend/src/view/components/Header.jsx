import { Book, ShoppingCart, Heart, Menu, Search, Home, BookOpen, PenTool, MessageSquare, Info, User as UserIcon } from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { searchSuggestions } from '../../services/catalog'
import { useAuth } from '../../store/useAuth' // ✅ chỉ import 1 nơi

// Đọc tổng số lượng trong giỏ từ localStorage (hỗ trợ nhiều kiểu lưu)
function readCartCount() {
  try {
    const wrap = JSON.parse(localStorage.getItem('bookstore_data_v1') || '{}')
    const items1 = wrap?.cart?.items
    if (Array.isArray(items1)) {
      return items1.reduce((s, i) => s + Number(i.quantity ?? i.qty ?? 1), 0)
    }
    const items2 = JSON.parse(localStorage.getItem('cart') || '[]')
    if (Array.isArray(items2)) {
      return items2.reduce((s, i) => s + Number(i.quantity ?? i.qty ?? 1), 0)
    }
  } catch {}
  return 0
}

export default function Header(){
  const { user, logoutAll } = useAuth()
  const nav = useNavigate()
  const { pathname } = useLocation()

  // ⬇️ Ẩn toàn bộ Header/Subnav khi đang ở trang quản trị
  if (pathname.startsWith('/admin')) return null

  const [q,setQ] = useState('')
  const [sugs,setSugs] = useState([])
  const [open,setOpen] = useState(false)
  const [count,setCount] = useState(readCartCount())

  // Cập nhật badge khi user đổi & khi giỏ thay đổi
  useEffect(()=>{ setCount(readCartCount()) },[user])
  useEffect(()=>{
    const onStorage = (e)=>{ if (e.key==='bookstore_data_v1' || e.key==='cart') setCount(readCartCount()) }
    const onCartChanged = ()=> setCount(readCartCount())
    window.addEventListener('storage', onStorage)
    window.addEventListener('cart:changed', onCartChanged)
    const t = setInterval(()=>setCount(readCartCount()), 1000)
    return ()=>{ window.removeEventListener('storage', onStorage); window.removeEventListener('cart:changed', onCartChanged); clearInterval(t) }
  },[])

  // Gợi ý tìm kiếm
  useEffect(()=>{
    const t = setTimeout(async ()=>{
      if(q.trim()){
        const r = await searchSuggestions(q.trim())
        setSugs(r); setOpen(true)
      } else { setSugs([]); setOpen(false) }
    }, 200)
    return ()=>clearTimeout(t)
  },[q])

  const submit = (e)=>{ e.preventDefault(); nav(`/search?q=${encodeURIComponent(q)}`); setOpen(false) }

  // Tên hiển thị
  const displayName = useMemo(
    () =>
      (user?.name && user.name.trim().split(/\s+/)[0]) ||
      (user?.email && user.email.split('@')[0]) || 'bạn',
    [user]
  )

  // Subnav
  const subNavItems = [
    { to: '/', label: 'Trang chủ', icon: Home, match: p => p === '/' },
    { to: '/categories', label: 'Sách', icon: BookOpen, match: p => p.startsWith('/categories') || p.startsWith('/book') },
    { to: '/authors', label: 'Tác giả', icon: PenTool, match: p => p.startsWith('/authors') },
    { to: '/articles', label: 'Bài viết', icon: MessageSquare, match: p => p.startsWith('/articles') },
    { to: '/about', label: 'Giới thiệu về chúng tôi', icon: Info, match: p => p.startsWith('/about') },
  ]

  return (
    <header className="bg-white shadow sticky top-0 z-40">
      <div className="container px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Book className="w-7 h-7 text-[var(--brand)]"/><span className="text-2xl font-bold text-[var(--brand)]">BookStore</span>
        </Link>

        <form onSubmit={submit} className="hidden md:flex relative flex-1 max-w-xl mx-8">
          <div className="relative w-full">
            <input
              className="input pr-10"
              placeholder="Tìm kiếm sách, tác giả, NXB..."
              value={q}
              onChange={e=>setQ(e.target.value)}
              onFocus={()=>q&&setOpen(true)}
            />
            <button className="absolute right-3 top-2.5" type="submit">
              <Search className="w-5 h-5 text-gray-500"/>
            </button>
          </div>
          {open && sugs.length>0 && (
            <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border z-50">
              {sugs.map((s,i)=>(
                <button
                  key={i}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100"
                  onMouseDown={(e)=>{
                    e.preventDefault();
                    if(s.type==='book') nav(`/book/${s.id}`)
                    else nav(`/search?q=${encodeURIComponent(s.label)}&by=${s.type}`)
                    setOpen(false)
                  }}
                >
                  {s.label} <span className="text-xs text-gray-500">({s.type})</span>
                </button>
              ))}
            </div>
          )}
        </form>

        <nav className="flex items-center gap-3">
          <Link to="/wishlist" className="p-2 hover:bg-gray-100 rounded-lg"><Heart className="w-6 h-6"/></Link>
          <Link to="/cart" className="relative p-2 hover:bg-gray-100 rounded-lg">
            <ShoppingCart className="w-6 h-6"/>
            {count>0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{count}</span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              {/* Nút Quản trị cho admin/staff */}
              {['admin','staff'].includes(String(user?.role || '').toLowerCase()) && (
                <button onClick={()=>nav('/admin')} className="px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600">
                  Quản trị
                </button>
              )}

              <button onClick={()=>nav('/account')} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg" title="Tài khoản">
                {user?.avatar
                  ? <img src={user.avatar} alt={user.name || 'user'} className="w-8 h-8 rounded-full object-cover" onError={(e)=>{ e.currentTarget.style.display='none' }} />
                  : <div className="w-8 h-8 rounded-full bg-[var(--brand)] text-white flex items-center justify-center"><UserIcon size={18}/></div>
                }
                <span className="hidden md:block">Hi, {displayName}</span>
              </button>

              <button onClick={()=>{ logoutAll(); nav('/'); }} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-primary">Đăng nhập</Link>
          )}

          <button className="md:hidden p-2 hover:bg-gray-100 rounded-lg"><Menu className="w-6 h-6"/></button>
        </nav>
      </div>

      {/* Sub navigation */}
      <div className="border-t bg-white/80 backdrop-blur" data-subnav>
        <div className="container px-4">
          <nav
            className="
              relative flex items-center justify-center gap-3 md:gap-4 py-2 text-sm font-semibold
              overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden
            "
            aria-label="Danh mục nhanh"
          >
            {subNavItems.map(({ to, label, icon:Icon, match })=>{
              const active = match(pathname)
              return active ? (
                <Link
                  key={to}
                  to={to}
                  aria-current="page"
                  className="led-border"
                  title={label}
                >
                  <span className="pill-inner">
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                  </span>
                </Link>
              ) : (
                <Link
                  key={to}
                  to={to}
                  className="pill"
                  title={label}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
        {/* Thanh dưới theo bảng màu mới */}
        <div className="h-[2px] bg-gradient-to-r from-[var(--brand)] via-[var(--brand-light)] to-[var(--brand)]"></div>
      </div>
    </header>
  )
}
