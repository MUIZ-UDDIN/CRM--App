# Sunstone CRM

A comprehensive Sales CRM system with advanced analytics and automation features.

## Features

- 📊 **Dashboard** - Real-time analytics and metrics
- 👥 **Contact Management** - Advanced contact and lead management
- 💼 **Deal Pipeline** - Visual deal tracking with drag-and-drop
- 📈 **Analytics** - Comprehensive sales analytics and reporting
- 📧 **Email Integration** - Inbox management
- 💬 **SMS & Calls** - Communication tracking
- ⚙️ **Settings** - Team and user management

## Tech Stack

**Backend:**
- FastAPI (Python)
- PostgreSQL
- SQLAlchemy ORM
- JWT Authentication

**Frontend:**
- React 18 + TypeScript
- Vite
- TailwindCSS
- React Router

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/MUIZ-UDDIN/CRM--App.git
cd CRM--App
```

2. **Setup Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Setup Database**
```bash
# Create PostgreSQL database
createdb sales_crm
createuser crm_user -P  # Set password when prompted

# Update backend/.env with your database credentials
```

4. **Setup Frontend**
```bash
cd frontend
npm install
```

5. **Run Application**

Terminal 1 (Backend):
```bash
cd backend
python -m app.main
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

6. **Access Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for production deployment instructions.

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/sales_crm
SECRET_KEY=your-secret-key
ALLOWED_ORIGINS=["http://localhost:5173"]
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
```

## License

MIT License
