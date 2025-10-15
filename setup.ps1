# Sales CRM Setup Script for Windows (PowerShell)
# This script sets up the development environment

Write-Host "🚀 Sales CRM Development Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Function to check if command exists
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

$prerequisites = @()

if (-not (Test-Command "node")) {
    $prerequisites += "Node.js 18+ (https://nodejs.org/)"
}

if (-not (Test-Command "python")) {
    $prerequisites += "Python 3.11+ (https://python.org/)"
}

if (-not (Test-Command "psql")) {
    $prerequisites += "PostgreSQL 14+ (https://postgresql.org/)"
}

if (-not (Test-Command "redis-cli")) {
    $prerequisites += "Redis 7+ (https://redis.io/)"
}

if ($prerequisites.Count -gt 0) {
    Write-Host "❌ Missing prerequisites:" -ForegroundColor Red
    foreach ($req in $prerequisites) {
        Write-Host "   - $req" -ForegroundColor Red
    }
    Write-Host "Please install the missing prerequisites and run this script again." -ForegroundColor Red
    exit 1
}

Write-Host "✅ All prerequisites found!" -ForegroundColor Green

# Setup environment files
Write-Host "⚙️ Setting up environment files..." -ForegroundColor Yellow

if (-not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "✅ Created backend/.env from template" -ForegroundColor Green
} else {
    Write-Host "⚠️ backend/.env already exists, skipping..." -ForegroundColor Yellow
}

if (-not (Test-Path "frontend\.env")) {
    Copy-Item "frontend\.env.example" "frontend\.env"
    Write-Host "✅ Created frontend/.env from template" -ForegroundColor Green
} else {
    Write-Host "⚠️ frontend/.env already exists, skipping..." -ForegroundColor Yellow
}

# Setup backend
Write-Host "🐍 Setting up Python backend..." -ForegroundColor Yellow

Set-Location backend

# Create virtual environment
if (-not (Test-Path "venv")) {
    python -m venv venv
    Write-Host "✅ Created Python virtual environment" -ForegroundColor Green
} else {
    Write-Host "⚠️ Virtual environment already exists" -ForegroundColor Yellow
}

# Activate virtual environment and install dependencies
& "venv\Scripts\Activate.ps1"
pip install --upgrade pip
pip install -r requirements.txt
Write-Host "✅ Installed Python dependencies" -ForegroundColor Green

Set-Location ..

# Setup frontend
Write-Host "⚛️ Setting up React frontend..." -ForegroundColor Yellow

Set-Location frontend

# Install dependencies
npm install
Write-Host "✅ Installed Node.js dependencies" -ForegroundColor Green

Set-Location ..

# Setup database
Write-Host "🗄️ Setting up database..." -ForegroundColor Yellow

$dbExists = $false
try {
    $result = psql -U postgres -lqt | Select-String "sales_crm"
    if ($result) {
        $dbExists = $true
        Write-Host "⚠️ Database 'sales_crm' already exists" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Could not check if database exists. Please ensure PostgreSQL is running." -ForegroundColor Yellow
}

if (-not $dbExists) {
    try {
        createdb -U postgres sales_crm
        Write-Host "✅ Created database 'sales_crm'" -ForegroundColor Green
        
        # Import schema
        psql -U postgres -d sales_crm -f database/schema.sql
        Write-Host "✅ Imported database schema" -ForegroundColor Green
        
        # Import sample data
        psql -U postgres -d sales_crm -f database/sample_data.sql
        Write-Host "✅ Imported sample data" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to setup database. Please check PostgreSQL connection." -ForegroundColor Red
        Write-Host "Make sure PostgreSQL is running and you have the correct permissions." -ForegroundColor Red
    }
}

# Final instructions
Write-Host ""
Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 To start the development servers:" -ForegroundColor Cyan
Write-Host "   1. Backend: cd backend && venv\Scripts\Activate.ps1 && uvicorn main:app --reload" -ForegroundColor White
Write-Host "   2. Frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Application URLs:" -ForegroundColor Cyan
Write-Host "   • Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   • Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "   • API Documentation: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "🐳 Or use Docker: docker-compose up -d" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Default Login Credentials:" -ForegroundColor Cyan
Write-Host "   • Email: admin@company.com" -ForegroundColor White
Write-Host "   • Password: admin123 (from sample data)" -ForegroundColor White