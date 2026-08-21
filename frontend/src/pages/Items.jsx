import { useState, useEffect } from 'react'
import { Plus, Search, QrCode, Printer } from 'lucide-react'

export default function Items() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', category: '', unit: 'pcs', price: 0, min_stock: 0, sku: '', qr_data: '' })
  const [search, setSearch] = useState('')
  const [qrModal, setQrModal] = useState(null)
  const [qrImage, setQrImage] = useState('')
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkLabels, setBulkLabels] = useState([])
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 })
  const [bulkLoading, setBulkLoading] = useState(false)

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(i => i.id)))
    }
  }

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

  const openQrModal = async (item) => {
    setQrModal(item)
    setQrImage('')
    setQrError('')
    setQrLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.BASE_URL}api/items/qr-image/${item.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Gagal memuat QR')
      const data = await res.json()
      setQrImage(data.qr_image)
    } catch (err) {
      setQrError(err.message)
    } finally {
      setQrLoading(false)
    }
  }

  const closeQrModal = () => {
    setQrModal(null)
    setQrImage('')
    setQrError('')
  }

  const downloadQr = () => {
    if (!qrImage || !qrModal) return
    const a = document.createElement('a')
    a.href = qrImage
    a.download = `qr-${qrModal.sku}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const printQr = () => {
    if (!qrImage || !qrModal) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(
      `<html><head><title>Label QR ${qrModal.sku}</title></head>` +
      `<body style="text-align:center;font-family:sans-serif;padding-top:40px">` +
      `<img src="${qrImage}" style="width:260px;height:260px"/><br/>` +
      `<p style="margin-top:8px">${qrModal.name}<br/><b>${qrModal.sku}</b></p>` +
      `<script>window.onload=function(){window.print()}</script>` +
      `</body></html>`
    )
    w.document.close()
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.sku.toLowerCase().includes(search.toLowerCase())
  )

  // ===== Cetak Label QR Massal =====
  const openBulkPrint = async () => {
    if (selected.size === 0) return
    setBulkOpen(true)
    setBulkLoading(true)
    setBulkLabels([])
    const chosen = items.filter(i => selected.has(i.id))
    setBulkProgress({ done: 0, total: chosen.length })
    const token = localStorage.getItem('token')
    const labels = []
    for (let idx = 0; idx < chosen.length; idx++) {
      const item = chosen[idx]
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}api/items/qr-image/${item.id}`, {
          headers: { Authorization: 'Bearer ' + token }
        })
        if (res.ok) {
          const data = await res.json()
          labels.push({ ...item, qr: data.qr_image })
        }
      } catch (err) {
        console.error(err)
      }
      setBulkProgress({ done: idx + 1, total: chosen.length })
      setBulkLabels([...labels])
    }
    setBulkLoading(false)
  }

  const doBulkPrint = () => {
    const w = window.open('', '_blank')
    if (!w) return
    const labelsHtml = bulkLabels
      .map(l =>
        `<div style="display:inline-block;width:48mm;border:1px dashed #999;margin:2mm;padding:2mm;text-align:center;page-break-inside:avoid">` +
        `<img src="${l.qr}" style="width:30mm;height:30mm"/><br/>` +
        `<div style="font-size:9px;font-weight:bold;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.name}</div>` +
        `<div style="font-size:8px;font-family:monospace">${l.sku}</div>` +
        `</div>`
      )
      .join('')
    w.document.write(
      `<html><head><title>Label QR - ${bulkLabels.length} barang</title></head>` +
      `<body style="font-family:sans-serif;margin:5mm">${labelsHtml}` +
      `<script>window.onload=function(){window.print()}</script>` +
      `</body></html>`
    )
    w.document.close()
  }

  if (loading) return <div className="text-center py-10">Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Daftar Barang</h1>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button
              onClick={openBulkPrint}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
            >
              <Printer className="w-4 h-4" /> Cetak Label ({selected.size})
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Tambah Barang
          </button>
        </div>
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
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4"
                />
              </th>
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
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="w-4 h-4"
                  />
                </td>
                <td className="px-4 py-3 text-sm font-mono">{item.sku}</td>
                <td className="px-4 py-3 text-sm">{item.name}</td>
                <td className="px-4 py-3 text-sm">{item.category || '-'}</td>
                <td className="px-4 py-3 text-sm font-medium">{item.stock}</td>
                <td className="px-4 py-3 text-sm">Rp {item.price.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm">
                  <button
                    onClick={() => openQrModal(item)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Lihat QR Code"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
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

      {/* Modal QR Code */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeQrModal}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-1">QR Code Barang</h2>
            <p className="text-sm text-gray-600 mb-4">
              {qrModal.name} — <span className="font-mono">{qrModal.sku}</span>
            </p>
            {qrLoading ? (
              <div className="py-10 text-gray-500">Memuat QR...</div>
            ) : qrImage ? (
              <img src={qrImage} alt={`QR ${qrModal.sku}`} className="w-56 h-56 mx-auto mb-3 border rounded-lg" />
            ) : (
              <div className="py-10 text-red-500">{qrError || 'Gagal memuat QR'}</div>
            )}
            <p className="text-xs text-gray-400 mb-4 break-all">Isi QR: {qrModal.qr_data}</p>
            <div className="flex gap-3">
              <button
                onClick={downloadQr}
                disabled={!qrImage}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Download
              </button>
              <button
                onClick={printQr}
                disabled={!qrImage}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Cetak
              </button>
              <button onClick={closeQrModal} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Cetak Label Massal */}
      {bulkOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setBulkOpen(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-2">Preview Label QR</h2>
            <p className="text-sm text-gray-600 mb-4">
              {bulkLabels.length} label siap cetak (ukuran ±48mm per label, bisa digunting)
            </p>
            {bulkLoading ? (
              <div className="py-6 text-center text-gray-500">
                Memuat QR... ({bulkProgress.done}/{bulkProgress.total})
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                {bulkLabels.map(l => (
                  <div key={l.id} className="border border-dashed border-gray-300 rounded p-2 text-center">
                    <img src={l.qr} alt={l.sku} className="w-full max-w-[100px] mx-auto" />
                    <p className="text-xs font-medium truncate mt-1">{l.name}</p>
                    <p className="text-xs font-mono text-gray-500">{l.sku}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={doBulkPrint}
                disabled={bulkLoading || bulkLabels.length === 0}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Cetak Semua
              </button>
              <button onClick={() => setBulkOpen(false)} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}