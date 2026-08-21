# Inventory App — Stock Opname & Operasional Toko Kelontong

Aplikasi web untuk membantu stock opname dan operasional toko kelontong dengan dukungan QR Code.

## 🚀 Fitur

- **Manajemen Barang**: CRUD item dengan SKU dan QR Code
- **Opname Stok**: Scan QR Code untuk update stok aktual
- **Riwayat Mutasi**: Catat setiap perubahan stok (restock, sale, opname)
- **Notifikasi Stok Menipis**: Celery task periodik untuk alert
- **Login Sederhana**: Role-based (admin/staff)
- **Docker & Podman Ready**: Jalankan di mana saja

## 🛠️ Stack Teknologi

| Layer | Teknologi |
|-------|-----------|
| Backend | FastAPI (Python 3.11) |
| Database | PostgreSQL 16 |
| Cache & Queue | Redis 7 + Celery 5 |
| Frontend | React 18 + Vite + Tailwind CSS |
| Web Server | Nginx (opsional) |
| Container | Docker / Podman |

## 📦 Persyaratan

- **Docker** atau **Podman** (dengan `podman-compose` atau `docker-compose`)
- **Git** (untuk clone)

> ✅ Sudah teruji di **ARM64 (Oracle Linux 9)** dan **x86_64**.

## 🔧 Instalasi & Menjalankan

### 🚀 Cara Termudah (Cross-Platform)

Kami menyediakan script instalasi otomatis untuk berbagai sistem operasi:

#### Linux / macOS
```bash
git clone https://github.com/abrahamlay/inventory-app.git
cd inventory-app
chmod +x install.sh
./install.sh
```

#### Windows (PowerShell)
```powershell
git clone https://github.com/abrahamlay/inventory-app.git
cd inventory-app
.\install.ps1
```

Script ini akan:
- Mengecek Docker/Podman yang terinstal
- Membuat file `.env` jika belum ada
- Build & jalankan semua container
- Membuat user admin (opsional)

#### Non-Interaktif (CI/CD)
```bash
./setup.sh admin password123 "Administrator"
```

---

### 📦 Instalasi Manual (Docker Compose)

#### 1. Clone Repository

```bash
git clone https://github.com/abrahamlay/inventory-app.git
cd inventory-app
```

#### 2. Konfigurasi (opsional tapi disarankan)

Buat file `.env` dan sesuaikan:

```bash
cat > .env <<EOF
BASE_PATH=/inventory-app/
WEB_PORT=8081
BACKEND_PORT=8000
POSTGRES_USER=inventory
POSTGRES_PASSWORD=***
POSTGRES_DB=inventory
SECRET_KEY=*** rand -hex 32)
EOF
```

> ⚠️ **Ganti `SECRET_KEY` dan password database di produksi!**

#### 3. Build & Jalankan

```bash
docker compose up -d --build
# atau dengan podman:
podman-compose up -d --build
```

Akses di `http://localhost:8081/inventory-app/` (semua layanan — frontend, API, proxy — ada di dalam satu container `web`).

#### 4. Buat User Admin (Pertama Kali)

```bash
curl -X POST http://localhost:8081/inventory-app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password": "***","full_name":"Administrator","role":"admin"}'
```

#### 5. Deploy di Balik Reverse Proxy (opsional, untuk domain)

Jika VM sudah punya nginx + SSL, arahkan sub-path ke container web:

```nginx
location /inventory-app/ {
    proxy_pass http://127.0.0.1:8081/inventory-app/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

> 💡 `BASE_PATH` di `.env` menentukan URL prefix. Untuk deploy di root domain (tanpa sub-path), set `BASE_PATH=/` dan `proxy_pass http://127.0.0.1:8081/;`

#### 6. Backup & Restore Database

```bash
# Backup
docker compose exec db pg_dump -U inventory inventory > backup.sql
# atau: podman exec inventory-db pg_dump -U inventory inventory > backup.sql

# Restore
cat backup.sql | docker compose exec -T db psql -U inventory inventory
```

#### 2. Build & Jalankan dengan Docker Compose

> ⚠️ Untuk deployment manual tanpa container (jarang diperlukan), backend FastAPI bisa dijalankan langsung dengan `uvicorn` — namun cara yang disarankan adalah docker compose di atas.

## 📂 Struktur Proyek

```
inventory-app/
├── backend/
│   ├── app/
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── routes/          # API endpoints (auth, items, stock)
│   │   ├── database.py      # DB connection
│   │   ├── tasks.py         # Celery tasks
│   │   └── main.py          # FastAPI app
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/                 # React components & pages
│   ├── Dockerfile
│   └── package.json
├── nginx/
│   └── conf.d/default.conf
├── docker-compose.yml
└── README.md
```

## 🧪 Testing API (Contoh)

### Tambah Barang

```bash
curl -X POST http://localhost:8000/items \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Indomie Goreng","category":"Makanan","unit":"pcs","price":3500,"min_stock":10}'
```

### Opname Stok (Scan QR)

```bash
curl -X POST http://localhost:8000/stock/opname \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"qr_data":"INV-ABC123","actual_stock":50,"note":"Opname bulanan"}'
```

## 🐳 Menjalankan dengan Podman (Manual)

Jika `podman-compose` tidak tersedia, jalankan container satu per satu:

```bash
# Buat network
podman network create inventory-net

# Jalankan database
podman run -d --name inventory-db --network inventory-net \
  -e POSTGRES_USER=inventory -e POSTGRES_PASSWORD=inventory123 \
  -e POSTGRES_DB=inventory -p 5432:5432 docker.io/postgres:16-alpine

# Jalankan Redis
podman run -d --name inventory-redis --network inventory-net \
  -p 6379:6379 docker.io/redis:7-alpine

# Build backend image
podman build -t inventory-backend -f backend/Dockerfile backend/

# Jalankan backend
podman run -d --name inventory-backend --network inventory-net \
  -p 8000:8000 \
  -e DATABASE_URL=postgresql://inventory:inventory123@inventory-db:5432/inventory \
  -e REDIS_URL=redis://inventory-redis:6379/0 \
  -e SECRET_KEY=change-this-in-production \
  inventory-backend

# Jalankan Celery worker & beat
podman run -d --name inventory-celery-worker --network inventory-net \
  -e DATABASE_URL=postgresql://inventory:inventory123@inventory-db:5432/inventory \
  -e REDIS_URL=redis://inventory-redis:6379/0 \
  inventory-backend celery -A app.tasks worker --loglevel=info

podman run -d --name inventory-celery-beat --network inventory-net \
  -e DATABASE_URL=postgresql://inventory:inventory123@inventory-db:5432/inventory \
  -e REDIS_URL=redis://inventory-redis:6379/0 \
  inventory-backend celery -A app.tasks beat --loglevel=info
```

## 🛡️ Keamanan

- Ganti `SECRET_KEY` di environment variable.
- Gunakan HTTPS di production (misal dengan Let's Encrypt + Nginx).
- Jangan expose port database (5432) ke publik.

## 📌 Roadmap

- [x] Backend API (FastAPI)
- [x] Database (PostgreSQL)
- [x] Celery untuk background tasks
- [x] Frontend React dasar (Login, Dashboard, Items, Opname)
- [x] QR Code generation & scanning
- [ ] Laporan PDF/Excel
- [ ] Integrasi kasir (fase 2)
- [ ] Multi-user & role management lebih lanjut

## 📄 Lisensi

MIT

---

Dibuat dengan ❤️ oleh [Abraham Lay](https://bamboy.my.id)