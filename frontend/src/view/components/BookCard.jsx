import { Heart, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../../store/useCart'

const toVND = (n) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(n || 0))

export default function BookCard({ book = {}, layout = 'grid' }) {
  const cart = useCart()

  const price = Number(book.price ?? 0)
  const originalPrice = Number(
    book.originalPrice ??
      book.priceOriginal ??
      book.listPrice ??
      book.price?.list ??
      0
  )
  const discount =
    originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0

  const rating = Number(book.rating ?? 0)
  const reviewCount =
    book.reviewCount ?? book.ratingCount ?? book.reviewsCount ?? 0

  const imgSrc = book.image || book.cover || book.coverUrl || '/placeholder.png'
  const id = book.id || book._id

  const coverW = layout === 'list' ? 'max-w-[160px]' : 'max-w-[233px]'
  const coverH = layout === 'list' ? 'h-[220px]' : 'h-[341px]'

  return (
    <div
      className={`card overflow-hidden transition group hover:shadow-lg ${
        layout === 'list' ? 'flex gap-4 p-4' : ''
      }`}
    >
      {/* COVER */}
      <div className={`${layout === 'list' ? 'shrink-0' : 'p-4'}`}>
        <Link to={`/book/${id}`} className="block">
          <div
            className={`relative mx-auto w-full ${coverW} ${coverH} rounded-xl bg-white flex items-center justify-center overflow-hidden`}
            title={book.title}
          >
            {discount > 0 && (
              <div className="absolute left-3 top-3 rounded-lg bg-red-500 px-2 py-1 text-xs font-semibold text-white shadow">
                -{discount}%
              </div>
            )}

            <img
              src={imgSrc}
              alt={book.title}
              loading="lazy"
              className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.png'
              }}
            />

            <button
              type="button"
              className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 hover:bg-white shadow"
              aria-label="Thêm vào yêu thích"
              onClick={(e) => e.preventDefault()}
            >
              <Heart className="w-4 h-4" />
            </button>
          </div>
        </Link>
      </div>

      {/* BODY */}
      <div className={`${layout === 'list' ? 'flex-1' : 'p-4'}`}>
        <Link
          to={`/book/${id}`}
          className="font-semibold mb-2 line-clamp-2 hover:text-purple-600 block"
          title={book.title}
        >
          {book.title}
        </Link>

        {book.author && (
          <p className="text-gray-600 text-sm mb-2">Tác giả: {book.author}</p>
        )}

        <div className="flex items-center gap-2 mb-3">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.round(rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">({reviewCount})</span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-lg font-bold text-purple-600">
              {toVND(price)}
            </span>
            {originalPrice > price && (
              <span className="block text-sm text-gray-500 line-through">
                {toVND(originalPrice)}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => cart.add(book, 1)}
          className="w-full btn-primary"
        >
          Thêm vào giỏ
        </button>
      </div>
    </div>
  )
}
