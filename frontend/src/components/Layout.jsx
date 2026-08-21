import { Outlet, Link, useNavigate } from 'react-router-dom'
import { LogOut, Package, QrCode, Home, ShoppingCart } from 'lucide-react'

export default function Layout() {
  const navigate = useNavigate()

  const logout = () => {
    localStorage.removeItem('token')
    navigate('/')
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <Link to="/" className="flex items-center gap-2 text-gray-900 hover:text-blue-600">
                <Home className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </Link>
              <Link to="/items" className="flex items-center gap-2 text-gray-900 hover:text-blue-600">
                <Package className="w-5 h-5" />
                <span className="font-medium">Barang</span>
              </Link>
              <Link to="/opname" className="flex items-center gap-2 text-gray-900 hover:text-blue-600">
                <QrCode className="w-5 h-5" />
                <span className="font-medium">Opname</span>
              </Link>
              <Link to="/kasir" className="flex items-center gap-2 text-gray-900 hover:text-blue-600">
                <ShoppingCart className="w-5 h-5" />
                <span className="font-medium">Kasir</span>
              </Link>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600"
            >
              <LogOut className="w-5 h-5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}