import { AUTHORS, BOOKS } from '../../model/books'
import { Link } from 'react-router-dom'

const slug = (s)=> encodeURIComponent(s)

export default function Authors(){
  const items = AUTHORS.map(name=>{
    const count = BOOKS.filter(b=>b.author===name).length
    return { name, count }
  })
  return (
    <div className="container px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Tác giả</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map(a=>(
          <Link key={a.name} to={`/authors/${slug(a.name)}`} className="card p-4 hover:shadow-lg transition">
            <div className="text-xl font-semibold">{a.name}</div>
            <div className="text-gray-600 text-sm mt-1">{a.count} tựa sách</div>
            <div className="mt-3 inline-block btn bg-gray-100 hover:bg-gray-200">Xem sách</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
