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
  Layers,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo, useRef } from "react";
import { searchSuggestions } from "../../services/catalog";
import { useAuth } from "../../store/useAuth";
import { useWishlist } from "../../store/useWishlist";
import CategoryMegaMenu from "../components/CategoryMenu";
import { getImageUrl } from "../../services/api";

const removeAccents = (str) => {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase();
};

/* ================== utils ================== */
const escapeReg = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function readCartCount(userId) {
  try {
    const wrap = JSON.parse(localStorage.getItem("bookstore_data_v1") || "{}");
    if (userId) {
      const itemsU = wrap?.["cart_" + userId];
      if (Array.isArray(itemsU))
        return itemsU.reduce((s, i) => s + Number(i.quantity ?? i.qty ?? 1), 0);
    } else {
      const guest = wrap?.cart_guest;
      if (Array.isArray(guest))
        return guest.reduce((s, i) => s + Number(i.quantity ?? i.qty ?? 1), 0);
    }
    const items1 = wrap?.cart?.items;
    if (Array.isArray(items1))
      return items1.reduce((s, i) => s + Number(i.quantity ?? i.qty ?? 1), 0);
    const items2 = JSON.parse(localStorage.getItem("cart") || "[]");
    if (Array.isArray(items2))
      return items2.reduce((s, i) => s + Number(i.quantity ?? i.qty ?? 1), 0);
  } catch {}
  return 0;
}
/* =========================================== */

export default function Header() {
  const { user, logoutAll, setUser } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return null;

  const [q, setQ] = useState("");
  const [sugs, setSugs] = useState([]);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const inputRef = useRef(null);
  const [count, setCount] = useState(readCartCount(user?.id));
  const { wishlist, fetchWishlist, clearWishlist } = useWishlist();
  const wishlistCount = wishlist.length;

  // nhớ loại gợi ý đã chọn gần nhất
  const [lastPick, setLastPick] = useState(null);
  // index gợi ý đang focus bằng phím
  const [activeIdx, setActiveIdx] = useState(-1);

  // fly-to-cart + toast
  const [flyItems, setFlyItems] = useState([]);
  const [toasts, setToasts] = useState([]);

  // --- trạng thái dropdown tài khoản ---
  const [openAcc, setOpenAcc] = useState(false);
  const accRef = useRef(null);
  const menuRef = useRef(null);
  const hoverTimer = useRef(null);

  // helpers giữ/đóng menu có độ trễ nhỏ
  const openNow = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setOpenAcc(true);
  };
  const scheduleClose = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpenAcc(false), 150);
  };
  const cancelClose = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  };

  // đóng khi click ra ngoài
  useEffect(() => {
    function onDocDown(e) {
      if (!openAcc) return;
      const t = e.target;
      if (
        accRef.current?.contains(t) ||
        menuRef.current?.contains(t)
      ) return;
      setOpenAcc(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [openAcc]);

  useEffect(() => {
    setCount(readCartCount(user?.id));
  }, [user?.id]);

  useEffect(() => {
    const onStorage = (e) => {
      if (["bookstore_data_v1", "__cart_bump__", "cart"].includes(e.key))
        setCount(readCartCount(user?.id));
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
    function onFlyWishlist(e) {
      try {
        const { image, fromEl } = e.detail || {};
        // Tìm icon trái tim trên header
        const target = document.querySelector("[data-wishlist-target]"); 
        if (!fromEl || !target) return;

        const s = fromEl.getBoundingClientRect();
        const t = target.getBoundingClientRect();

        const startX = s.left + s.width / 2;
        const startY = s.top + s.height / 2;
        const endX = t.left + t.width / 2;
        const endY = t.top + t.height / 2;

        const id = Date.now() + Math.random();
        
        // Tạo vật thể bay
        setFlyItems((list) => [
          ...list,
          {
            id,
            image: image || "/placeholder.png",
            style: {
              "--sx": `${startX}px`,
              "--sy": `${startY}px`,
              "--dx": `${endX - startX}px`,
              "--dy": `${endY - startY}px`,
              "--dxh": `${(endX - startX) * 0.5}px`,
              "--dyh": `${(endY - startY) * 0.5 - 100}px`, // Bay vòng cung
            },
          },
        ]);

        // Rung icon trái tim
        target.classList.add("cart-shake"); // Tận dụng class rung cũ
        setTimeout(() => target.classList.remove("cart-shake"), 600);

        // Dọn dẹp sau khi bay xong
        setTimeout(() => {
          setFlyItems((list) => list.filter((x) => x.id !== id));
        }, 800);
      } catch {}
    }

    window.addEventListener("ui:flyToWishlist", onFlyWishlist);
    return () => window.removeEventListener("ui:flyToWishlist", onFlyWishlist);
  }, []);

  /* ====== Gợi ý: fetch theo chữ gõ + filter partial + trộn tác giả & sách ====== */
  useEffect(() => {
    const t = setTimeout(async () => {
      const kw = q.trim();
      setActiveIdx(-1);
      if (!kw) {
        setSugs([]);
        return;
      }

      try {
        const server = await searchSuggestions(kw); 
        
        const seen = new Set();
        const unique = [];
        for (const it of (server || [])) {
          const key = `${it.type}:${it.id || it.label}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(it);
          }
        }

        // Tách 2 nhóm để trộn
        const authors = unique.filter((x) => x.type === "author");
        const books = unique.filter((x) => x.type === "book");

        // TRỘN XEN KẼ (1 Tác giả - 1 Sách)
        const maxLen = Math.max(authors.length, books.length);
        const merged = [];
        for (let i = 0; i < maxLen; i++) {
          if (authors[i]) merged.push(authors[i]);
          if (books[i]) merged.push(books[i]);
        }

        setSugs(merged.slice(0, 12));
      } catch {
        setSugs([]);
      }
    }, 200); // Debounce
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    clearWishlist();
    if (user) {
      fetchWishlist();
    }
  }, [user, fetchWishlist, clearWishlist]);

  // tô đậm màu tím/ xanh tím cho phần khớp
  const highlight = (label) => {
    if (!q || !label) return label;
    
    const labelNorm = removeAccents(label);
    const qNorm = removeAccents(q);
    const index = labelNorm.indexOf(qNorm);

    if (index === -1) return label;

    // Cắt chuỗi gốc dựa trên index tìm được ở chuỗi không dấu
    const before = label.slice(0, index);
    const match = label.slice(index, index + qNorm.length);
    const after = label.slice(index + qNorm.length);

    return (
      <>
        {before}
        <span className="text-violet-600 font-bold bg-violet-50 rounded-sm px-0.5">
          {match}
        </span>
        {after}
      </>
    );
  };

  useEffect(() => {
    const onStorageChange = () => {
      try {
        const data = JSON.parse(localStorage.getItem("bookstore_data_v1") || "{}");
        // Nếu trong storage có user mới -> cập nhật vào state của Auth Context
        if (data?.state?.user) {
            setUser(data.state.user);
        }
      } catch (e) { console.error(e); }
    };

    // Lắng nghe sự kiện 'storage' (do AccountInfo phát ra)
    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, [setUser]); // Chạy lại nếu setUser thay đổi (thực ra là chỉ 1 lần)

  // submit dùng chung cho Enter / click kính lúp
  const submit = (e) => {
    e.preventDefault();
    const base = `/search?q=${encodeURIComponent(q.trim())}`;
    if (lastPick?.type === "author") nav(`${base}&by=author`);
    else if (lastPick?.type === "book") nav(`${base}&by=book`);
    else nav(base);
  };

  const handleKeyDown = (e) => {
    if (!sugs.length) {
      if (e.key === "Enter") submit(e);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % sugs.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? sugs.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0) {
        e.preventDefault();
        const s = sugs[activeIdx];
        const base = `/search?q=${encodeURIComponent(s.label)}`;
        if (s.type === "author") nav(`${base}&by=author`);
        else if (s.type === "book") nav(`${base}&by=book`);
        else nav(base);
      } else {
        submit(e);
      }
    } else if (e.key === "Escape") {
      setSugs([]);
      setActiveIdx(-1);
    }
  };

  const displayName = useMemo(
    () =>
      (user?.name && user.name.trim().split(/\s+/)[0]) ||
      (user?.email && user.email.split("@")[0]) ||
      "bạn",
    [user]
  );

  const isCategories =
    pathname.startsWith("/categories") || pathname.startsWith("/book");

  return (
    <header className="bg-white shadow sticky top-0 z-40">
      <div className="container px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Book className="w-7 h-7 text-[var(--brand)]" />
          <span className="text-2xl font-bold text-[var(--brand)]">
            BookStore
          </span>
        </Link>

        <form onSubmit={submit} className="hidden md:flex relative flex-1 max-w-xl mx-8">
          <div className="relative w-full">
            <input
              ref={inputRef}
              className="input pr-10"
              placeholder="Tìm kiếm sách, tác giả,..."
              value={q}
              autoComplete="off"
              onChange={(e) => {
                setQ(e.target.value);
                setLastPick(null);
              }}
              onKeyDown={handleKeyDown}
            />
            <button className="absolute right-3 top-2.5" type="submit" aria-label="Tìm kiếm">
              <Search className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Panel gợi ý */}
          {q.trim() && (
            <div
              className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border z-50"
              onMouseDown={(e) => e.preventDefault()}
              role="listbox"
            >
              {sugs.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  Không có kết quả phù hợp.
                </div>
              ) : (
                <ul>
                  {sugs.map((s, i) => (
                    <li key={`${s.type}:${s.id || s.label}`}>
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                          i === activeIdx ? "bg-gray-100" : ""
                        }`}
                        role="option"
                        aria-selected={i === activeIdx}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          setQ(s.label);
                          setSugs([]);
                          setLastPick(s);

                          requestAnimationFrame(() => {
                            inputRef.current?.focus();
                            const end = s.label.length;
                            try {
                              inputRef.current?.setSelectionRange(end, end);
                            } catch {}
                          });

                          const base = `/search?q=${encodeURIComponent(s.label)}`;
                          if (s.type === "author") nav(`${base}&by=author`);
                          else if (s.type === "book") nav(`${base}&by=book`);
                          else nav(base);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{highlight(s.label)}</span>
                          {/* Chip tiếng Việt thay cho (book)/(author) */}
                          <span
                            className="ml-3 text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700"
                            aria-label={s.type === "book" ? "Sách" : "Tác giả"}
                          >
                            {s.type === "book" ? "Sách" : "Tác giả"}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </form>

        <nav className="flex items-center gap-3">
          <Link to="/wishlist" data-wishlist-target className="relative p-2 hover:bg-gray-100 rounded-lg"> {/* */}
            <Heart className="w-6 h-6" /> {/* */}
            {/* THÊM BADGE COUNT */}
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {wishlistCount > 99 ? "99+" : wishlistCount}
              </span>
            )}
          </Link>

        <Link
            to="/cart"
            data-cart-target
            className="relative p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Giỏ hàng"
          >
            <ShoppingCart className="w-6 h-6" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              {(() => {
                // Lấy mảng 'roles' mới, nếu không có thì tạo mảng từ 'role' cũ
                const userRoles = user?.roles || [user?.role] || []; 
                
                const isAdmin = userRoles.includes('admin');
                const isStaff = userRoles.includes('staff');
                const isShipper = userRoles.includes('shipper');

                // Chỉ hiển thị nếu có ít nhất 1 trong 3 quyền này
                if (!isAdmin && !isStaff && !isShipper) return null;

                // Logic đặt tên nút: Nếu chỉ là Shipper -> "Giao hàng", còn lại -> "Quản trị"
                const label = (isShipper && !isAdmin && !isStaff) ? "Giao hàng" : "Quản trị";
                const icon = (isShipper && !isAdmin && !isStaff) ? "🚚" : "⚙️";

                return (
                  <button
                    onClick={() => nav("/admin")} // Dashboard đã tự điều hướng Shipper vào đúng tab
                    className="px-3 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-bold text-sm flex items-center gap-1 shadow-sm transition-colors"
                  >
                    <span>{icon}</span> {label}
                  </button>
                );
              })()}

              {/* Nút tài khoản + DROPDOWN (sửa: giữ mở khi rê chuột vào menu) */}
              <div
                className="relative"
                onMouseEnter={openNow}
                onMouseLeave={scheduleClose}
              >
                <button
                  ref={accRef}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Tài khoản"
                  onClick={() => setOpenAcc(!openAcc)}
                >
                  {/* LOGIC HIỂN THỊ AVATAR MỚI */}
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center shrink-0">
                    {(user?.avatarUrl || user?.avatar) ? (
                      <img
                        // Thêm key để React biết ảnh đã đổi và render lại ngay lập tức
                        key={user.avatarUrl || user.avatar} 
                        src={`${getImageUrl(user.avatarUrl || user.avatar)}?t=${Date.now()}`}
                        alt={user.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Khi ảnh lỗi, ẩn thẻ img này đi để lộ ra div cha (fallback)
                          e.currentTarget.style.display = "none";
                          // Hoặc set về ảnh mặc định: e.currentTarget.src = '/avatar.png';
                        }}
                      />
                    ) : (
                      <UserIcon size={18} className="text-gray-500" />
                    )}
                    
                    {/* Fallback: Nếu img bị ẩn do lỗi, UserIcon này sẽ hiện ra (vì nằm cùng cấp trong div) */}
                    {(user?.avatarUrl || user?.avatar) && (
                      <UserIcon size={18} className="text-gray-400 absolute z-[-1]" />
                    )}
                  </div>
                  
                  <span className="hidden md:block font-medium text-sm text-gray-700">
                    Hi, {displayName}
                  </span>
                </button>

                {openAcc && (
                  <div
                    ref={menuRef}
                    role="menu"
                    className="absolute right-0 mt-2 w-64 rounded-xl border bg-white shadow-lg p-2 z-50"
                    onMouseEnter={cancelClose}
                    onMouseLeave={scheduleClose}
                  >
                    <Link to="/account/info" className="block px-3 py-2 rounded-lg hover:bg-gray-50">Thông tin tài khoản</Link>
                    <Link to="/account/addresses" className="block px-3 py-2 rounded-lg hover:bg-gray-50">Địa chỉ</Link>
                    <Link to="/account/orders" className="block px-3 py-2 rounded-lg hover:bg-gray-50">Đơn hàng của tôi</Link>
                    <Link to="/account/reviews" className="block px-3 py-2 rounded-lg hover:bg-gray-50">Đánh giá sản phẩm</Link>
                    <Link to="/account/comments" className="block px-3 py-2 rounded-lg hover:bg-gray-50">Nhận xét của tôi</Link>
                    <button
                      onClick={async () => {
                        await logoutAll(); // 1. Đợi đăng xuất xong
                        clearWishlist();   // 2. Dọn dẹp wishlist
                        nav("/");          // 3. Điều hướng về trang chủ
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-rose-600"
                    >
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link to="/login" className="btn-primary">
              Đăng nhập
            </Link>
          )}

          <button className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
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

          <Link
            to="/collections"
            className={pathname.startsWith("/collections") ? "led-border" : "pill"}
            title="Bộ sưu tập"
            onMouseEnter={() => setOpen(false)}
            onFocus={() => setOpen(false)}
          >
            <span className="pill-inner">
              <Layers className="w-5 h-5" />
              <span>Bộ sưu tập</span>
            </span>
          </Link>

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

      {/* Mega menu Sách */}
      <CategoryMegaMenu open={open} setOpen={setOpen} anchorRef={anchorRef} />

      {/* Overlay: vật thể bay */}
      {flyItems.map((it) => (
        <div key={it.id} className="ftc-flying" style={it.style}>
          <img
            src={it.image}
            alt="book"
            className="w-14 h-18 object-cover rounded shadow-lg"
            onError={(e) => {
              e.currentTarget.src = "/placeholder.jpg";
            }}
          />
        </div>
      ))}

      {/* Toast */}
      <div className="fixed top-20 right-4 z-[9999] space-y-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-lg shadow-lg border border-green-200 p-4 flex items-start gap-3 min-w-[300px] max-w-md ftc-toast"
          >
            <div className="flex-1">
              <div className="font-semibold text-gray-900">{t.title}</div>
              {t.name && (
                <div className="text-sm text-gray-600 line-clamp-2 mt-1">
                  {t.name}
                </div>
              )}
            </div>
            <button
              onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Đóng"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* CSS hiệu ứng */}
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
