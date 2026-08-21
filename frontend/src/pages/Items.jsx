import { useState, useEffect } from 'react'
import { Plus, Search, QrCode } from 'lucide-react'

export default function Items() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', category: '', unit: 'pcs', price: 0, min_stock: 0, sku: '', qr_data: '' })
  const [search, setSearch] = useState('')

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.BASE_URL}api/items?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setItems(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.BASE_URL}api/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price),
          min_stock: parseFloat(form.min_stock)
        })
      })
      if (res.ok) {
        setShowModal(false)
        setForm({ name: '', category: '', unit: 'pcs', price: 0, min_stock: 0, sku: '', qr_data: '' })
        fetchItems()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.sku.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="text-center py-10">Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Daftar Barang</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Tambah Barang
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Cari barang..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">SKU</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Nama</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Kategori</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Stok</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Harga</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">QR</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono">{item.sku}</td>
                <td className="px-4 py-3 text-sm">{item.name}</td>
                <td className="px-4 py-3 text-sm">{item.category || '-'}</td>
                <td className="px-4 py-3 text-sm font-medium">{item.stock}</td>
                <td className="px-4 py-3 text-sm">Rp {item.price.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm">
                  <QrCode className="w-5 h-5 text-gray-500" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">Belum ada barang</div>
        )}
      </div>

      {/* Modal Tambah */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Tambah Barang</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nama *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kategori</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Harga</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Min Stok</label>
                <input
                  type="number"
                  value={form.min_stock}
                  onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SKU (kosongkan untuk auto-generate)</label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">QR Data (kosongkan pakai SKU)</label>
                <input
                  type="text"
                  value={form.qr_data}
                  onChange={(e) => setForm({ ...form, qr_data: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  Simpan
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}