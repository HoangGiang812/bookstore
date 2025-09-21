// src/view/layouts/PublicLayout.jsx
import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Toast from '../components/Toast'

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Toast />
      <Footer />
    </div>
  )
}
