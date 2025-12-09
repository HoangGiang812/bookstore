import { Heart, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../../store/useCart'
import { useWishlist } from '../../store/useWishlist'

const toVND = (n) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(n || 0))

export default function BookCard({ book = {}, layout = 'grid' }) {
  const cart = useCart()
  
  // 1. SỬA: Lấy đúng hàm 'toggleWishlist' mà store của bạn đang cung cấp
  const { wishlist, toggleWishlist } = useWishlist()
  
  // Kiểm tra sách đã có trong wishlist chưa
  const isLiked = wishlist.some(i => (i._id || i.id) === (book._id || book.id))

  const price = Number(book.price ?? 0)
  const originalPrice = Number(
    book.originalPrice ?? book.listPrice ?? 0
  )
  const discount =
    originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0

  const rating = Number(book.rating ?? 0)
  const reviewCount = book.reviewCount ?? 0

  const imgSrc = book.image || book.cover || book.coverUrl || '/placeholder.png'
  const id = book.id || book._id
  
  // Link chi tiết sách
  const linkUrl = `/books/${book.slug || id}`

  const coverW = layout === 'list' ? 'max-w-[160px]' : 'max-w-[233px]'
  const coverH = layout === 'list' ? 'h-[220px]' : 'h-[341px]'

  const handleToggleWishlist = (e) => {
    // Ngăn sự kiện nổi bọt để không click nhầm vào Link
    e.stopPropagation(); 

    // 2. SỬA: Gọi hàm toggle thay vì add/remove riêng lẻ
    toggleWishlist(book);

    // 3. Logic hiệu ứng bay (Chỉ bay khi THÊM vào wishlist)
    if (!isLiked) {
        const imgEl = e.currentTarget.closest('.card')?.querySelector('img');
        window.dispatchEvent(new CustomEvent("ui:flyToWishlist", {
            detail: { 
                image: imgSrc,
                fromEl: imgEl || e.currentTarget 
            }
        }));
    }
  };

  const handleAddToCart = (e) => {
      e.preventDefault(); 
      cart.add(book, 1);
      
      const imgEl = e.currentTarget.closest('.card')?.querySelector('img');
      window.dispatchEvent(new CustomEvent("ui:flyToCart", {
          detail: { book, fromEl: imgEl }
      }));
  };

  return (
    <div
      className={`card group relative overflow-hidden transition hover:shadow-lg bg-white rounded-xl border border-gray-100 ${
        layout === 'list' ? 'flex gap-4 p-4' : 'flex flex-col'
      }`}
    >
      {/* --- PHẦN ẢNH BÌA (COVER) --- */}
      <div className={`relative ${layout === 'list' ? 'shrink-0' : 'p-4 pb-0'}`}>
        
        {/* Link bao quanh ảnh */}
        <Link to={linkUrl} className="block relative">
          <div
            className={`relative mx-auto w-full ${coverW} ${coverH} rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden`}
            title={book.title}
          >
            {discount > 0 && (
              <div className="absolute left-2 top-2 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow z-10">
                -{discount}%
              </div>
            )}

            <img
              src={imgSrc}
              alt={book.title}
              loading="lazy"
              className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-105"
              onError={(e) => { e.currentTarget.src = '/placeholder.png' }}
            />
          </div>
        </Link>

        {/* NÚT TIM (Đã sửa logic onClick) */}
        <button
          type="button"
          className={`absolute top-6 right-6 z-20 p-2 rounded-full shadow-sm transition-all active:scale-90 ${
              isLiked 
              ? 'bg-rose-100 text-rose-500' 
              : 'bg-white/90 text-gray-400 hover:text-rose-500 hover:bg-white'
          }`}
          onClick={handleToggleWishlist}
          title={isLiked ? "Bỏ thích" : "Yêu thích"}
        >
          <Heart size={18} className={isLiked ? 'fill-current' : ''} />
        </button>
      </div>

      {/* --- PHẦN THÔNG TIN (BODY) --- */}
      <div className={`flex flex-col ${layout === 'list' ? 'flex-1 py-2' : 'p-4 flex-1'}`}>
        <div className="flex-1">
            <Link
            to={linkUrl}
            className="font-bold text-gray-800 mb-1 line-clamp-2 hover:text-indigo-600 transition-colors text-sm"
            title={book.title}
            >
            {book.title}
            </Link>

            {book.author && (
            <p className="text-gray-500 text-xs mb-2 truncate">{book.author}</p>
            )}

            <div className="flex items-center gap-1 mb-3">
                <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} fill={i < Math.round(rating) ? "currentColor" : "none"} className={i >= Math.round(rating) ? "text-gray-300" : ""} />
                    ))}
                </div>
                <span className="text-xs text-gray-400">({reviewCount})</span>
            </div>
        </div>

        <div className="mt-auto">
            <div className="flex items-baseline gap-2 mb-3">
                <span className="text-lg font-bold text-indigo-600">
                {toVND(price)}
                </span>
                {originalPrice > price && (
                <span className="text-xs text-gray-400 line-through">
                    {toVND(originalPrice)}
                </span>
                )}
            </div>

            <button
            type="button"
            onClick={handleAddToCart}
            className="w-full py-2.5 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-indigo-600 transition-colors shadow-sm active:scale-95"
            >
            Thêm vào giỏ
            </button>
        </div>
      </div>
    </div>
  )
}