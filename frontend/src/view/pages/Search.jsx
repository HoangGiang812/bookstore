import { useLocation } from 'react-router-dom'
import { BOOKS } from '../../model/books'
import BookCard from '../components/BookCard'

export default function SearchPage(){
  const sp = new URLSearchParams(useLocation().search)
  const q = (sp.get('q')||'').toLowerCase()
  const by = sp.get('by') // book/author/publisher
  let list = BOOKS
  if(q){
    if(by==='author') list = list.filter(b=>b.author.toLowerCase().includes(q))
    else if(by==='publisher') list = list.filter(b=>b.publisher.toLowerCase().includes(q))
    else list = list.filter(b=> (b.title.toLowerCase().includes(q)||b.author.toLowerCase().includes(q)||b.publisher.toLowerCase().includes(q)))
  }
  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Kết quả tìm kiếm cho: “{sp.get('q')}”</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map(b=>(<BookCard key={b.id} book={b}/>))}
      </div>
      {list.length===0 && <div className="text-gray-600">Không tìm thấy kết quả.</div>}
    </div>
  )
}
