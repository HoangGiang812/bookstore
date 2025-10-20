// frontend/src/services/catalog.js
import api from './api'

// ===== Books =====
export const getBooks = async (params = {}) => {
  const q = new URLSearchParams(params).toString()
  const data = await api.get(`/api/books${q ? `?${q}` : ''}`)
  const items = Array.isArray(data) ? data : (data.items || [])

  // ✅ Chuẩn hoá trường cho UI: luôn có rating & reviewCount
  return items.map(b => ({
    ...b,
    rating: b.rating ?? b.ratingAvg ?? 0,
    reviewCount: b.reviewCount ?? b.ratingCnt ?? b.reviewsCount ?? 0,
  }))
}

export const getBook = async (id) => {
  if (!id) throw new Error('Missing book id')
  const b = await api.get(`/api/books/${id}`)
  // ✅ Chuẩn hoá trường cho UI: luôn có rating & reviewCount
  return {
    ...b,
    rating: b.rating ?? b.ratingAvg ?? 0,
    reviewCount: b.reviewCount ?? b.ratingCnt ?? b.reviewsCount ?? 0,
  }
}

export const relatedBooks = async (book) => {
  const bookId = book?._id || book?.id
  if (!bookId) return []
  try {
    // Nếu bạn có route BE /api/books/:id/related thì dùng trực tiếp:
    // return await api.get(`/api/books/${bookId}/related`)
    const items = await getBooks({ group: 'bestsellers', limit: 6 })
    return items.filter(b => (b._id || b.id) !== bookId).slice(0, 6)
  } catch {
    return []
  }
}

// ===== Collections / Authors / Publishers =====
export const getCollections  = async () => []
export const getCollection   = async (id) => ({ id, books: [] })

// FE có thể truyền ?q=&limit=&start= (nếu BE hỗ trợ lọc theo q)
export const getAuthors = async (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return await api.get(`/api/authors${q ? `?${q}` : ''}`)
}

export const getPublishers = async () => []

// ===== Reviews (giữ wrapper để không vỡ code cũ, trỏ đúng endpoint BE mới) =====
export const getReviews = async (bookId, params = {}) => {
  if (!bookId) return []
  const q = new URLSearchParams(params).toString()
  try {
    return await api.get(`/api/books/${bookId}/reviews${q ? `?${q}` : ''}`)
  } catch {
    return []
  }
}

// Với code cũ đang gọi addReview(payload) thì payload cần có bookId
export const addReview  = async (payload = {}) => {
  try {
    const { bookId, ...rest } = payload
    if (!bookId) throw new Error('Missing bookId')
    return await api.post(`/api/books/${bookId}/reviews`, rest)
  } catch {
    return null
  }
}

// ===== Search suggestions (match 1 phần: sách + tác giả) =====
export const searchSuggestions = async (q) => {
  if (!q) return []

  const kw = String(q).trim()
  const params = `?q=${encodeURIComponent(kw)}&limit=12`

  try {
    // ƯU TIÊN: endpoint hợp nhất từ BE trả { type:'book'|'author', id, label }
    const unified = await api.get(`/api/books/suggest${params}`)
    if (Array.isArray(unified) && unified.length) {
      // loại trùng phòng backend trùng dữ liệu
      const seen = new Set()
      const uniq = []
      for (const it of unified) {
        const key = `${it.type}:${it.id || it.label}`
        if (!seen.has(key)) { seen.add(key); uniq.push(it) }
      }
      return uniq.slice(0, 12)
    }

    // ---- Fallback: nếu BE /api/books/suggest chỉ trả sách ----
    const [books, authors] = await Promise.all([
      api.get(`/api/books/suggest${params}`).catch(() => []),
      api.get(`/api/authors?q=${encodeURIComponent(kw)}&limit=6`).catch(() => []),
    ])

    const bookSugs = (Array.isArray(books) ? books : []).map(b => ({
      type: 'book',
      id: b.slug || b._id || b.id,
      label: b.title
    }))

    const authorSugs = (Array.isArray(authors) ? authors : []).map(a => ({
      type: 'author',
      id: a.slug || a._id || a.id,
      label: a.name || a.displayName || a.fullName
    }))

    // Trộn xen kẽ để luôn thấy cả 2 nhóm
    const maxLen = Math.max(bookSugs.length, authorSugs.length)
    const mixed = []
    for (let i = 0; i < maxLen; i++) {
      if (authorSugs[i]) mixed.push(authorSugs[i])
      if (bookSugs[i])   mixed.push(bookSugs[i])
    }

    // Lọc trùng + cắt 12 gợi ý
    const seen = new Set()
    const uniq = []
    for (const it of mixed) {
      const key = `${it.type}:${it.id || it.label}`
      if (!seen.has(key)) { seen.add(key); uniq.push(it) }
    }
    return uniq.slice(0, 12)
  } catch (e) {
    console.error('searchSuggestions failed', e)
    return []
  }
}
