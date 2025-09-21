import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Files, Tags, UserCog, PackageCheck, RefreshCcw, TicketPercent, Users2, Image, FileText, Settings, Warehouse } from 'lucide-react'

const Item = ({ to, icon:Icon, label }) => (
  <NavLink
    to={to}
    className={({isActive}) =>
      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm ' +
      (isActive ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-gray-100')
    }
  >
    <Icon className="w-4 h-4"/>{label}
  </NavLink>
)

export default function AdminLayout(){
  return (
    <div className="min-h-screen grid grid-cols-12">
      <aside className="col-span-12 md:col-span-2 border-r bg-white">
        <div className="h-14 flex items-center px-4 font-bold text-indigo-600">Admin</div>
        <nav className="p-3 space-y-1">
          <Item to="/admin" icon={LayoutDashboard} label="Tổng quan" />
          <div className="mt-2 text-xs font-bold text-gray-500 px-2">Sản phẩm</div>
          <Item to="/admin/books" icon={BookOpen} label="Sách" />
          <Item to="/admin/import" icon={Files} label="Import CSV" />
          <Item to="/admin/catalog/categories" icon={Tags} label="Danh mục" />
          <Item to="/admin/catalog/authors" icon={Users2} label="Tác giả" />
          <Item to="/admin/catalog/publishers" icon={UserCog} label="NXB" />
          <Item to="/admin/stock" icon={Warehouse} label="Nhập kho" />

          <div className="mt-2 text-xs font-bold text-gray-500 px-2">Đơn hàng</div>
          <Item to="/admin/orders" icon={PackageCheck} label="Đơn hàng" />
          <Item to="/admin/rma" icon={RefreshCcw} label="Đổi/Trả (RMA)" />

          <div className="mt-2 text-xs font-bold text-gray-500 px-2">Khuyến mãi</div>
          <Item to="/admin/coupons" icon={TicketPercent} label="Mã giảm giá" />

          <div className="mt-2 text-xs font-bold text-gray-500 px-2">Người dùng</div>
          <Item to="/admin/users" icon={Users2} label="Khách hàng & phân quyền" />

          <div className="mt-2 text-xs font-bold text-gray-500 px-2">Nội dung</div>
          <Item to="/admin/banners" icon={Image} label="Banner" />
          <Item to="/admin/pages" icon={FileText} label="Trang tĩnh" />

          <div className="mt-2 text-xs font-bold text-gray-500 px-2">Cấu hình</div>
          <Item to="/admin/settings" icon={Settings} label="Cấu hình hệ thống" />
        </nav>
      </aside>

      <main className="col-span-12 md:col-span-10 bg-gray-50 min-h-screen">
        <div className="h-14 border-b bg-white flex items-center px-4 font-semibold">Bảng điều khiển</div>
        <div className="p-4">
          <Outlet/>
        </div>
      </main>
    </div>
  )
}
