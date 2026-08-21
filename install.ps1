# Inventory App Installer for Windows (PowerShell)
# Usage: .\install.ps1

Write-Host "=== Inventory App Installer ===" -ForegroundColor Green

# Check Docker Desktop
$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-Host "Docker not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check Docker Compose
docker compose version | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker Compose not available. Please install Docker Desktop with Compose." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Docker found" -ForegroundColor Green

# Create .env if missing
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    @"
DATABASE_URL=postgresql://inventory:inventory123@db:5432/inventory
REDIS_URL=redis://redis:6379/0
SECRET_KEY=change-this-in-production
"@ | Out-File -FilePath .env
}

# Build and start containers
Write-Host "Building and starting containers..." -ForegroundColor Green
docker compose up -d --build

# Wait for backend
Write-Host "Waiting for backend to be ready..." -ForegroundColor Yellow
do {
    Start-Sleep -Seconds 2
    $response = Invoke-WebRequest -Uri "http://localhost:8000/" -UseBasicParsing -ErrorAction SilentlyContinue
} while (-not $response)

Write-Host "Backend is ready!" -ForegroundColor Green

# Ask to create admin
$createAdmin = Read-Host "Create admin user? (y/n)"
if ($createAdmin -eq "y") {
    $adminUser = Read-Host "Username (default: admin)"
    if (-not $adminUser) { $adminUser = "admin" }
    $adminPass = Read-Host -AsSecureString "Password"
    $adminPassPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPass))
    $adminName = Read-Host "Full name (default: Administrator)"
    if (-not $adminName) { $adminName = "Administrator" }
    
    $body = @{
        username = $adminUser
        password = $adminPassPlain
        full_name = $adminName
        role = "admin"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "http://localhost:8000/auth/register" -Method Post -Body $body -ContentType "application/json" | Out-Null
    Write-Host "Admin created." -ForegroundColor Green
}

Write-Host "=== Installation complete! ===" -ForegroundColor Green
Write-Host "Access API at: http://localhost:8000"
Write-Host "Swagger docs: http://localhost:8000/docs"
Write-Host "Frontend (if Nginx configured): http://localhost:8080"
EOF