import { useState, useEffect } from 'react'
import { Package, AlertTriangle, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({ totalItems: 0, lowStock: 0, totalMutations: 0 })
  const [lowItems, setLowItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${import.meta.env.BASE_URL}api/items?limit=1000`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const items = await res.json()

        const low = items.filter(i => i.stock <= i.min_stock)
        setLowItems(low)
        setStats({
          totalItems: items.length,
          lowStock: low.length,
          totalMutations: 0 // nanti dari API terpisah
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div className="text-center py-10">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Total Barang</p>
              <p className="text-2xl font-bold">{stats.totalItems}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-sm text-gray-500">Stok Menipis</p>
              <p className="text-2xl font-bold text-amber-600">{stats.lowStock}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Total Mutasi</p>
              <p className="text-2xl font-bold">{stats.totalMutations}</p>
            </div>
          </div>
        </div>
      </div>

      {lowItems.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">⚠️ Barang dengan Stok Menipis</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">SKU</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Nama</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Stok</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Min Stok</th>
                </tr>
              </thead>
              <tbody>
                {lowItems.map(item => (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-2 text-sm">{item.sku}</td>
                    <td className="px-4 py-2 text-sm">{item.name}</td>
                    <td className="px-4 py-2 text-sm text-red-600 font-medium">{item.stock}</td>
                    <td className="px-4 py-2 text-sm">{item.min_stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}