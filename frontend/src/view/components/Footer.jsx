import { Mail, Phone, MapPin, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Footer(){
  return (
    <footer className="mt-16 bg-white border-t">
      <div className="container px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h4 className="text-lg font-semibold mb-3">Giới thiệu</h4>
          <p className="text-gray-600 text-sm">
            BookStore là nền tảng mua sách trực tuyến với hàng nghìn tựa sách chất lượng, giao nhanh toàn quốc, ưu đãi mỗi ngày.
          </p>
          <Link to="/about" className="mt-3 inline-flex items-center gap-1 text-purple-600 hover:text-purple-700">
            Tìm hiểu thêm <ArrowRight className="w-4 h-4"/>
          </Link>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-3">Chính sách</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/policies#shipping" className="text-gray-700 hover:text-purple-600">Giao hàng & vận chuyển</Link></li>
            <li><Link to="/policies#return" className="text-gray-700 hover:text-purple-600">Đổi/trả & bảo hành</Link></li>
            <li><Link to="/policies#privacy" className="text-gray-700 hover:text-purple-600">Bảo mật thông tin</Link></li>
            <li><Link to="/policies#payment" className="text-gray-700 hover:text-purple-600">Thanh toán</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-3">Ưu đãi</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/promotions" className="text-gray-700 hover:text-purple-600">Mã giảm giá & Flash sale</Link></li>
            <li><Link to="/articles" className="text-gray-700 hover:text-purple-600">Bài viết & gợi ý đọc</Link></li>
            <li><Link to="/categories" className="text-gray-700 hover:text-purple-600">Danh mục nổi bật</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-3">Liên hệ</h4>
          <div className="text-sm text-gray-700 space-y-2">
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4"/> 123 Đường ABC, Q.1, TP.HCM</div>
            <div className="flex items-center gap-2"><Phone className="w-4 h-4"/> 0123 456 789</div>
            <div className="flex items-center gap-2"><Mail className="w-4 h-4"/> support@bookstore.vn</div>
          </div>
          <Link to="/support" className="mt-3 inline-flex items-center gap-1 text-purple-600 hover:text-purple-700">
            Trung tâm hỗ trợ <ArrowRight className="w-4 h-4"/>
          </Link>
        </div>
      </div>
      <div className="border-t py-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} BookStore. All rights reserved.
      </div>
    </footer>
  )
}
