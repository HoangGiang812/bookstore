// src/view/layout/Header.jsx
import {
  Book,
  ShoppingCart,
  Heart,
  Menu,
  Search,
  Home,
  BookOpen,
  PenTool,
  MessageSquare,
  Info,
  User as UserIcon,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo, useRef } from "react";
import { searchSuggestions } from "../../services/catalog";
import { useAuth } from "../../store/useAuth";
import CategoryMegaMenu from "../components/CategoryMenu"; // ✅ đúng path

function readCartCount(userId) {
  try {
    const wrap = JSON.parse(localStorage.getItem("bookstore_data_v1") || "{}");
    if (userId) {
      const itemsU = wrap?.["cart_" + userId];
      if (Array.isArray(itemsU)) return itemsU.reduce((s, i) => s + Number(i.quantity ?? i.qty ?? 1), 0);
    } else {
      const guest = wrap?.cart_guest;
      if (Array.isArray(guest)) return guest.reduce((s, i) => s + Number(i.quantity ?? i.qty ?? 1), 0);
    }
    const items1 = wrap?.cart?.items;
    if (Array.isArray(items1)) return items1.reduce((s, i) => s + Number(i.quantity ?? i.qty ?? 1), 0);
    const items2 = JSON.parse(localStorage.getItem("cart") || "[]");
    if (Array.isArray(items2)) return items2.reduce((s, i) => s + Number(i.quantity ?? i.qty ?? 1), 0);
  } catch {}
  return 0;
}

export default function Header() {
  const { user, logoutAll } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return null;

  const [q, setQ] = useState("");
  const [sugs, setSugs] = useState([]);
  const [open, setOpen] = useState(false);            // mở/đóng mega menu Sách
  const anchorRef = useRef(null);                     // neo panel dưới nút Sách
  const [count, setCount] = useState(readCartCount(user?.id));

  // fly-to-cart + toast
  const [flyItems, setFlyItems] = useState([]);
  const [toasts, setToasts] = useState([]);

  useEffect(() => { setCount(readCartCount(user?.id)); }, [user?.id]);

  useEffect(() => {
    const onStorage = (e) => {
      if (["bookstore_data_v1","__cart_bump__","cart"].includes(e.key)) setCount(readCartCount(user?.id));
    };
    const onCartChanged = () => setCount(readCartCount(user?.id));
    window.addEventListener("storage", onStorage);
    window.addEventListener("cart:changed", onCartChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cart:changed", onCartChanged);
    };
  }, [user?.id]);

  useEffect(() => {
    function onFly(e) {
      try {
        const { book, fromEl } = e.detail || {};
        const target = document.querySelector("[data-cart-target]");
        if (!fromEl || !target) return;
        const s = fromEl.getBoundingClientRect(), t = target.getBoundingClientRect();
        const startX = s.left + s.width/2, startY = s.top + s.height/2;
        const endX = t.left + t.width/2, endY = t.top + t.height/2;
        const id = Date.now() + Math.random();
        setFlyItems(list => [...list, {
          id, image: book?.image || book?.coverUrl || "/placeholder.jpg",
          style: {
            "--sx": `${startX}px`, "--sy": `${startY}px`,
            "--dx": `${endX - startX}px`, "--dy": `${endY - startY}px`,
            "--dxh": `${(endX - startX) * 0.5}px`,
            "--dyh": `${(endY - startY) * 0.5 - 100}px`,
          }
        }]);
        target.classList.add("cart-shake");
        setTimeout(() => target.classList.remove("cart-shake"), 600);
        setTimeout(() => {
          setFlyItems(list => list.filter(x => x.id !== id));
          const tid = Date.now() + Math.random();
          setToasts(t => [...t, { id: tid, title: "Đã thêm vào giỏ hàng!", name: book?.title }]);
          setTimeout(() => setToasts(t => t.filter(x => x.id !== tid)), 3000);
        }, 800);
      } catch {}
    }
    window.addEventListener("ui:flyToCart", onFly);
    return () => window.removeEventListener("ui:flyToCart", onFly);
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (q.trim()) { const r = await searchSuggestions(q.trim()); setSugs(r); }
      else setSugs([]);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const submit = (e) => { e.preventDefault(); nav(`/search?q=${encodeURIComponent(q)}`); };

  const displayName = useMemo(
    () => (user?.name && user.name.trim().split(/\s+/)[0]) || (user?.email && user.email.split("@")[0]) || "bạn",
    [user]
  );

  const isCategories = pathname.startsWith("/categories") || pathname.startsWith("/book");

  return (
    <header className="bg-white shadow sticky top-0 z-40">
      <div className="container px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Book className="w-7 h-7 text-[var(--brand)]" />
          <span className="text-2xl font-bold text-[var(--brand)]">BookStore</span>
        </Link>

        <form onSubmit={submit} className="hidden md:flex relative flex-1 max-w-xl mx-8">
          <div className="relative w-full">
            <input
              className="input pr-10"
              placeholder="Tìm kiếm sách, tác giả, NXB..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="absolute right-3 top-2.5" type="submit"><Search className="w-5 h-5 text-gray-500" /></button>
          </div>
          {sugs.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border z-50">
              {sugs.map((s, i) => (
                <button
                  key={i}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (s.type === "book") nav(`/book/${s.id}`);
                    else nav(`/search?q=${encodeURIComponent(s.label)}&by=${s.type}`);
                  }}
                >
                  {s.label} <span className="text-xs text-gray-500">({s.type})</span>
                </button>
              ))}
            </div>
          )}
        </form>

        <nav className="flex items-center gap-3">
          <Link to="/wishlist" className="p-2 hover:bg-gray-100 rounded-lg"><Heart className="w-6 h-6" /></Link>

          <Link to="/cart" data-cart-target className="relative p-2 hover:bg-gray-100 rounded-lg" aria-label="Giỏ hàng">
            <ShoppingCart className="w-6 h-6" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              {["admin","staff"].includes(String(user?.role || "").toLowerCase()) && (
                <button onClick={() => nav("/admin")} className="px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600">
                  Quản trị
                </button>
              )}
              <button onClick={() => nav("/account")} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg" title="Tài khoản">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name || "user"} className="w-8 h-8 rounded-full object-cover"
                       onError={(e) => { e.currentTarget.style.display = "none"; }} />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--brand)] text-white flex items-center justify-center"><UserIcon size={18} /></div>
                )}
                <span className="hidden md:block">Hi, {displayName}</span>
              </button>
              <button onClick={() => { logoutAll(); nav("/"); }} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Đăng xuất</button>
            </div>
          ) : (
            <Link to="/login" className="btn-primary">Đăng nhập</Link>
          )}

          <button className="md:hidden p-2 hover:bg-gray-100 rounded-lg"><Menu className="w-6 h-6" /></button>
        </nav>
      </div>

      {/* Sub navigation – hiệu ứng như cũ: LED chỉ theo active */}
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
            {/* Trang chủ */}
<Link
  to="/"
  aria-current={pathname === "/" ? "page" : undefined}
  className={pathname === "/" ? "led-border" : "pill"}
  title="Trang chủ"
  onMouseEnter={() => setOpen(false)}
  onFocus={() => setOpen(false)}
>
  <span className="pill-inner">
    <Home className="w-5 h-5" />
    <span>Trang chủ</span>
  </span>
</Link>

{/* Sách – giữ nguyên (mở khi hover, không tự tắt ở đây) */}
<Link
  to="/categories"
  ref={anchorRef}
  onMouseEnter={() => setOpen(true)}
  className={isCategories ? "led-border" : "pill"}
  title="Sách"
>
  <span className="pill-inner">
    <BookOpen className="w-5 h-5" />
    <span>Sách</span>
  </span>
</Link>

{/* Tác giả */}
<Link
  to="/authors"
  aria-current={pathname.startsWith("/authors") ? "page" : undefined}
  className={pathname.startsWith("/authors") ? "led-border" : "pill"}
  title="Tác giả"
  onMouseEnter={() => setOpen(false)}
  onFocus={() => setOpen(false)}
>
  <span className="pill-inner">
    <PenTool className="w-5 h-5" />
    <span>Tác giả</span>
  </span>
</Link>

{/* Bài viết */}
<Link
  to="/articles"
  aria-current={pathname.startsWith("/articles") ? "page" : undefined}
  className={pathname.startsWith("/articles") ? "led-border" : "pill"}
  title="Bài viết"
  onMouseEnter={() => setOpen(false)}
  onFocus={() => setOpen(false)}
>
  <span className="pill-inner">
    <MessageSquare className="w-5 h-5" />
    <span>Bài viết</span>
  </span>
</Link>

{/* Giới thiệu */}
<Link
  to="/about"
  aria-current={pathname.startsWith("/about") ? "page" : undefined}
  className={pathname.startsWith("/about") ? "led-border" : "pill"}
  title="Giới thiệu về chúng tôi"
  onMouseEnter={() => setOpen(false)}
  onFocus={() => setOpen(false)}
>
  <span className="pill-inner">
    <Info className="w-5 h-5" />
    <span>Giới thiệu về chúng tôi</span>
  </span>
</Link>
          
          </nav>
        </div>
        <div className="h-[2px] bg-gradient-to-r from-[var(--brand)] via-[var(--brand-light)] to-[var(--brand)]" />
      </div>

      {/* Mega menu Sách (đóng khi rời panel; không ảnh hưởng LED) */}
      <CategoryMegaMenu open={open} setOpen={setOpen} anchorRef={anchorRef} />

      {/* Overlay: vật thể bay */}
      {flyItems.map(it => (
        <div key={it.id} className="ftc-flying" style={it.style}>
          <img src={it.image} alt="book" className="w-14 h-18 object-cover rounded shadow-lg"
               onError={(e)=>{ e.currentTarget.src = "/placeholder.jpg"; }}/>
        </div>
      ))}

      {/* Toast */}
      <div className="fixed top-20 right-4 z-[9999] space-y-3">
        {toasts.map(t => (
          <div key={t.id} className="bg-white rounded-lg shadow-lg border border-green-200 p-4 flex items-start gap-3 min-w-[300px] max-w-md ftc-toast">
            <div className="flex-1">
              <div className="font-semibold text-gray-900">{t.title}</div>
              {t.name && <div className="text-sm text-gray-600 line-clamp-2 mt-1">{t.name}</div>}
            </div>
            <button onClick={()=>setToasts(s=>s.filter(x=>x.id!==t.id))}
                    className="text-gray-400 hover:text-gray-600" aria-label="Đóng">×</button>
          </div>
        ))}
      </div>

      {/* CSS hiệu ứng cũ (không đụng đến LED styles vì bạn đã có trong global) */}
      <style>{`
        @keyframes ftcFly {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          50% { transform: translate(var(--dxh), var(--dyh)) scale(0.8); opacity: .9; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity: 0; }
        }
        @keyframes ftcShake { 0%,100%{transform:translateX(0)} 10%,30%,50%,70%,90%{transform:translateX(-3px)} 20%,40%,60%,80%{transform:translateX(3px)} }
        @keyframes ftcToastIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
        .ftc-flying{position:fixed;left:var(--sx);top:var(--sy);z-index:9999;pointer-events:none;animation:ftcFly .8s cubic-bezier(.45,.05,.55,.95) forwards}
        [data-cart-target].cart-shake{animation:ftcShake .6s ease-in-out}
        .ftc-toast{animation:ftcToastIn .28s ease-out}
      `}</style>
    </header>
  );
}
