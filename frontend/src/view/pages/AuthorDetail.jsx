import { useParams } from 'react-router-dom'
import { BOOKS } from '../../model/books'
import BookCard from '../components/BookCard'

export default function AuthorDetail(){
  const { name } = useParams()
  const author = decodeURIComponent(name||'')
  const list = BOOKS.filter(b=>b.author===author)
  return (
    <div className="container px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">{author}</h1>
      <div className="text-gray-600 mb-6">{list.length} tựa sách</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map(b=>(<BookCard key={b.id} book={b}/>))}
      </div>
      {list.length===0 && <div className="text-gray-600">Chưa có sách.</div>}
    </div>
  )
}
