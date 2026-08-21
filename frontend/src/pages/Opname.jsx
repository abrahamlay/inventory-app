import { useState, useRef } from 'react'
import { QrCode, Camera, Check, X } from 'lucide-react'

export default function Opname() {
  const [scanning, setScanning] = useState(false)
  const [qrData, setQrData] = useState('')
  const [item, setItem] = useState(null)
  const [actualStock, setActualStock] = useState('')
  const [note, setNote] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const startScan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)
      setError('')
      // Simulasi scan: setelah 3 detik, ambil qr_data dari input manual (demo)
      // Di produksi pakai library html5-qrcode
    } catch (err) {
      setError('Tidak bisa akses kamera. Pastikan izin kamera diberikan.')
      console.error(err)
    }
  }

  const stopScan = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  const handleManualScan = async () => {
    if (!qrData.trim()) {
      setError('Masukkan QR data atau scan')
      return
    }
    await lookupItem(qrData.trim())
  }

  const lookupItem = async (qr) => {
    setLoading(true)
    setError('')
    setItem(null)
    setResult(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.BASE_URL}api/items/qr/${encodeURIComponent(qr)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        throw new Error('Barang tidak ditemukan')
      }
      const data = await res.json()
      setItem(data)
      setActualStock(data.stock.toString())
      stopScan()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!item) return

    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.BASE_URL}api/stock/opname`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          qr_data: item.qr_data,
          actual_stock: parseFloat(actualStock),
          note: note || undefined
        })
      })
      if (!res.ok) throw new Error('Gagal menyimpan opname')
      const data = await res.json()
      setResult(data)
      setItem(null)
      setQrData('')
      setActualStock('')
      setNote('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <QrCode className="w-6 h-6" /> Opname Stok
      </h1>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">QR Code / SKU</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={qrData}
                onChange={(e) => setQrData(e.target.value)}
                placeholder="Scan QR atau ketik SKU..."
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleManualScan}
                disabled={loading || !qrData}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Cari
              </button>
              <button
                onClick={scanning ? stopScan : startScan}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${scanning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'} text-white`}
              >
                <Camera className="w-4 h-4" />
                {scanning ? 'Stop' : 'Scan'}
              </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        </div>

        {scanning && (
          <div className="mt-4 relative bg-black rounded-lg overflow-hidden">
            <video ref={videoRef} className="w-full max-h-96 object-cover" />
            <div className="absolute inset-0 border-4 border-blue-500 pointer-events-none m-8 rounded" />
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-4 py-1 rounded text-sm">
              Arahkan ke QR code
            </p>
          </div>
        )}
      </div>

      {item && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" /> Item Ditemukan
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div><span className="text-gray-500 text-sm">SKU</span><p className="font-mono">{item.sku}</p></div>
            <div><span className="text-gray-500 text-sm">Nama</span><p className="font-medium">{item.name}</p></div>
            <div><span className="text-gray-500 text-sm">Stok Sistem</span><p className="font-bold">{item.stock}</p></div>
            <div><span className="text-gray-500 text-sm">Unit</span><p>{item.unit}</p></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Stok Aktual *</label>
              <input
                type="number"
                value={actualStock}
                onChange={(e) => setActualStock(e.target.value)}
                className="w-full max-w-xs px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Catatan</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Misal: rusak, hilang, dll"
                className="w-full max-w-md px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan Opname'}
            </button>
          </form>
        </div>
      )}

      {result && (
        <div className="mt-6 bg-green-50 border border-green-200 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">✅ Opname Berhasil</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
            <div><span className="text-gray-600">Item:</span> {result.name}</div>
            <div><span className="text-gray-600">Stok lama:</span> {result.old_stock}</div>
            <div><span className="text-gray-600">Stok baru:</span> <strong>{result.new_stock}</strong></div>
            <div><span className="text-gray-600">Selisih:</span> {result.difference}</div>
          </div>
        </div>
      )}
    </div>
  )
}