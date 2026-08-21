import { useState, useEffect } from 'react'
import { ShoppingCart, Search, Plus, Minus, Trash2, Printer, History, Check } from 'lucide-react'

const BASE = import.meta.env.BASE_URL

export default function Kasir() {
  const [items, setItems] = useState([])
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [discount, setDiscount] = useState('')
  const [payment, setPayment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(BASE + 'api/items?limit=1000', {
        headers: { Authorization: 'Bearer ' + token }
      })
      const data = await res.json()
      setItems(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const addToCart = (item) => {
    if (item.stock <= 0) return
    setError('')
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) {
        if (existing.quantity >= item.stock) {
          setError('Stok tidak cukup untuk ' + item.name)
          return prev
        }
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const changeQty = (id, delta) => {
    setCart(prev => prev.map(c => {
      if (c.id !== id) return c
      const newQty = c.quantity + delta
      if (newQty <= 0) return c
      const src = items.find(i => i.id === id)
      if (src && newQty > src.stock) {
        setError('Stok tidak cukup untuk ' + c.name)
        return c
      }
      return { ...c, quantity: newQty }
    }))
  }

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(c => c.id !== id))
  }

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0)
  const disc = parseFloat(discount) || 0
  const grandTotal = Math.max(total - disc, 0)
  const paid = parseFloat(payment) || 0
  const change = paid > 0 ? paid - grandTotal : 0

  const submitSale = async () => {
    if (cart.length === 0) return
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(BASE + 'api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
          items: cart.map(c => ({ item_id: c.id, quantity: c.quantity })),
          discount: disc,
          payment_amount: paid
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Transaksi gagal')
      setReceipt(data)
      setCart([])
      setDiscount('')
      setPayment('')
      fetchItems()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(BASE + 'api/sales?limit=20', {
        headers: { Authorization: 'Bearer ' + token }
      })
      const data = await res.json()
      setHistory(data)
      setShowHistory(true)
    } catch (err) {
      console.error(err)
    }
  }

  const printReceipt = () => {
    if (!receipt) return
    const w = window.open('', '_blank')
    if (!w) return
    const rows = receipt.items
      .map(i =>
        '<tr><td style="padding:2px 0">' + i.item_name + '</td>' +
        '<td style="text-align:center">' + i.quantity + '</td>' +
        '<td style="text-align:right">' + i.subtotal.toLocaleString('id-ID') + '</td></tr>'
      )
      .join('')
    w.document.write(
      '<html><head><title>Struk ' + receipt.sale_number + '</title></head>' +
      '<body style="font-family:monospace;max-width:280px;margin:0 auto;padding:10px">' +
      '<h3 style="text-align:center;margin:4px 0">TOKO KELONTONG</h3>' +
      '<p style="text-align:center;margin:2px 0;font-size:12px">' + receipt.sale_number + '<br/>' +
      new Date(receipt.created_at).toLocaleString('id-ID') + '</p><hr/>' +
      '<table style="width:100%;font-size:12px">' + rows + '</table><hr/>' +
      '<p style="font-size:12px;margin:2px 0">Total: Rp ' + receipt.total_amount.toLocaleString('id-ID') + '<br/>' +
      'Diskon: Rp ' + receipt.discount.toLocaleString('id-ID') + '<br/>' +
      '<b>Grand Total: Rp ' + receipt.grand_total.toLocaleString('id-ID') + '</b><br/>' +
      'Bayar: Rp ' + receipt.payment_amount.toLocaleString('id-ID') + '<br/>' +
      'Kembali: Rp ' + receipt.change_amount.toLocaleString('id-ID') + '</p>' +
      '<p style="text-align:center;margin-top:8px;font-size:12px">Terima kasih!</p>' +
      '<script>window.onload=function(){window.print()}</script>' +
      '</body></html>'
    )
    w.document.close()
  }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.sku.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6" /> Kasir
        </h1>
        <button
          onClick={fetchHistory}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800"
        >
          <History className="w-4 h-4" /> Riwayat Transaksi
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daftar produk */}
        <div className="lg:col-span-2">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari barang atau SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map(item => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                disabled={item.stock <= 0}
                className="bg-white p-3 rounded-lg shadow text-left hover:ring-2 hover:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-gray-500 font-mono">{item.sku}</p>
                <p className="text-sm font-bold text-blue-600 mt-1">Rp {item.price.toLocaleString('id-ID')}</p>
                <p className="text-xs text-gray-500">Stok: {item.stock}</p>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">Tidak ada barang ditemukan</div>
            )}
          </div>
        </div>

        {/* Keranjang */}
        <div className="bg-white rounded-lg shadow p-4 h-fit sticky top-4">
          <h2 className="font-bold mb-3">Keranjang ({cart.length})</h2>
          {cart.length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">Klik barang untuk menambahkan</p>
          ) : (
            <div className="space-y-2 mb-4">
              {cart.map(c => (
                <div key={c.id} className="flex items-center gap-2 border-b pb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-gray-500">Rp {c.price.toLocaleString('id-ID')} x {c.quantity}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => changeQty(c.id, -1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm w-6 text-center">{c.quantity}</span>
                    <button onClick={() => changeQty(c.id, 1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button onClick={() => removeFromCart(c.id)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total</span>
              <span className="font-medium">Rp {total.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Diskon</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                className="w-24 px-2 py-1 border rounded text-right"
              />
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Grand Total</span>
              <span>Rp {grandTotal.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Bayar</span>
              <input
                type="number"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                placeholder={grandTotal.toString()}
                className="w-28 px-2 py-1 border rounded text-right"
              />
            </div>
            {paid > 0 && (
              <div className="flex justify-between">
                <span>Kembali</span>
                <span className={change < 0 ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>
                  Rp {change.toLocaleString('id-ID')}
                </span>
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          <button
            onClick={submitSale}
            disabled={cart.length === 0 || loading}
            className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Bayar'}
          </button>
        </div>
      </div>

      {/* Modal Struk */}
      {receipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setReceipt(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <Check className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <h2 className="text-xl font-bold">Transaksi Berhasil</h2>
              <p className="text-sm text-gray-500 font-mono">{receipt.sale_number}</p>
            </div>
            <div className="text-sm space-y-1 mb-4 max-h-48 overflow-y-auto">
              {receipt.items.map(i => (
                <div key={i.id} className="flex justify-between">
                  <span className="truncate">{i.item_name} x{i.quantity}</span>
                  <span>Rp {i.subtotal.toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
            <div className="text-sm border-t pt-2 space-y-1">
              <div className="flex justify-between"><span>Grand Total</span><b>Rp {receipt.grand_total.toLocaleString('id-ID')}</b></div>
              <div className="flex justify-between"><span>Bayar</span><span>Rp {receipt.payment_amount.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between"><span>Kembali</span><b className="text-green-600">Rp {receipt.change_amount.toLocaleString('id-ID')}</b></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={printReceipt} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                <Printer className="w-4 h-4" /> Cetak Struk
              </button>
              <button onClick={() => setReceipt(null)} className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300">
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Riwayat */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowHistory(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Riwayat Transaksi</h2>
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-6">Belum ada transaksi</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">No. Transaksi</th>
                    <th className="px-3 py-2 text-left">Waktu</th>
                    <th className="px-3 py-2 text-right">Item</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(s => (
                    <tr key={s.id} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{s.sale_number}</td>
                      <td className="px-3 py-2">{new Date(s.created_at).toLocaleString('id-ID')}</td>
                      <td className="px-3 py-2 text-right">{s.items.length}</td>
                      <td className="px-3 py-2 text-right font-medium">Rp {s.grand_total.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button onClick={() => setShowHistory(false)} className="mt-4 w-full bg-gray-200 py-2 rounded-lg hover:bg-gray-300">
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}