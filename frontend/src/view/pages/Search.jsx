import { useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getBooks, getAuthors } from '../../services/catalog'
import BookCard from '../components/BookCard'

export default function SearchPage(){
  const sp = new URLSearchParams(useLocation().search)
  const q = (sp.get('q') || '').trim()
  const by = sp.get('by') // 'book' | 'author'

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let stopped = false

    async function fetchBooksByAuthor(keyword) {
      // Tìm 1 tác giả phù hợp nhất
      const authors = await getAuthors({ q: keyword, limit: 1 })
      const a = Array.isArray(authors) ? authors[0] : null
      if (!a) {
        // Không có tác giả -> fallback tìm theo q chung
        return await getBooks({ q: keyword, limit: 30 })
      }
      // Ưu tiên ObjectId (_id/id) -> gửi authorId
      const params = (a?._id || a?.id)
        ? { authorId: a._id || a.id, limit: 30 }
        : { author: a?.slug, limit: 30 } // fallback slug (string)
      return await getBooks(params)
    }

    async function run(){
      setLoading(true)
      try {
        if (!q) { setList([]); return }

        let books = []
        if (by === 'author') {
          books = await fetchBooksByAuthor(q)
        } else {
          // book (mặc định): tìm theo tiêu đề/mô tả
          books = await getBooks({ q, limit: 30 })
        }

        if (!stopped) setList(Array.isArray(books) ? books : (books.items || []))
      } catch (e) {
        if (!stopped) setList([])
        // tuỳ ý log nếu cần: console.error(e)
      } finally {
        if (!stopped) setLoading(false)
      }
    }

    run()
    return () => { stopped = true }
  }, [q, by])

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Kết quả tìm kiếm cho: “{q}”</h1>

      {loading ? (
        <div className="text-gray-600">Đang tải...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.map(b => (<BookCard key={b._id || b.id} book={b} />))}
          </div>
          {list.length === 0 && (
            <div className="text-gray-600">Không tìm thấy kết quả.</div>
          )}
        </>
      )}
    </div>
  )
}
