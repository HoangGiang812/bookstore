// frontend/src/services/catalog.js
import api from './api'

// ===== Books =====
export const getBooks = async (params = {}) => {
  // BE hỗ trợ: ?group=bestsellers|new|deals&limit=&start=
  const q = new URLSearchParams(params).toString()
  const data = await api.get(`/api/books${q ? `?${q}` : ''}`)
  // BE trả mảng -> trả thẳng; nếu sau này trả {items} thì vẫn an toàn
  return Array.isArray(data) ? data : (data.items || [])
}

export const getBook = async (id) => {
  if (!id) throw new Error('Missing book id')
  return api.get(`/api/books/${id}`)
}

// Nếu BE chưa có endpoint liên quan, tạm suy luận theo "bestsellers"
export const relatedBooks = async (book) => {
  const bookId = book?._id || book?.id
  if (!bookId) return []
  try {
    // Nếu bạn có route /api/books/:id/related thì bật dòng dưới và bỏ fallback
    // return await api.get(`/api/books/${bookId}/related`)
    const items = await getBooks({ group: 'bestsellers', limit: 6 })
    return items.filter(b => (b._id || b.id) !== bookId).slice(0, 6)
  } catch {
    return []
  }
}

// ===== Collections / Authors / Publishers (nếu BE có thì sửa lại tương ứng) =====
export const getCollections  = async () => []
export const getCollection   = async (id) => ({ id, books: [] })
export const getAuthors      = async () => []
export const getPublishers   = async () => []

// ===== Reviews (giữ nguyên nếu BE có), còn không thì trả rỗng để không lỗi UI =====
export const getReviews = async (bookId) => {
  try { return await api.get(`/api/reviews/${bookId}`) } catch { return [] }
}
export const addReview  = async (payload) => {
  try { return await api.post('/api/reviews', payload) } catch { return null }
}

// ===== Wishlist (nếu BE chưa có thì giả lập an toàn) =====
export const getWishlist = async () => []
export const toggleWishlist = async (_userId, book) => {
  const id = book?._id || book?.id
  if (!id) return []
  try {
    await api.post('/api/wishlist', { bookId: id })
  } catch {
    try { await api.delete(`/api/wishlist/${id}`) } catch {}
  }
  return getWishlist()
}

// ===== Search suggestions (BE hiện tại chưa hỗ trợ ?q -> fallback từ getBooks) =====
export const searchSuggestions = async (q) => {
  if (!q) return []
  try {
    // lấy 1 nhóm bất kỳ làm gợi ý tạm thời
    const items = await getBooks({ group: 'bestsellers', limit: 5 })
    return items
      .filter(b => (b.title || '').toLowerCase().includes(q.toLowerCase()))
      .slice(0, 5)
      .map(b => ({ type: 'book', id: b._id || b.id, label: b.title }))
  } catch { return [] }
}
