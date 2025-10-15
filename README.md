# 🚀 Sales CRM with Analytics - Production Ready

A comprehensive, mobile-responsive Sales CRM system with advanced analytics, drag-and-drop pipeline, and real-time features. Built with modern technologies and ready for production deployment.

## ✨ Live Demo

**Frontend**: https://yourdomain.com  
**API Docs**: https://yourdomain.com/api/docs  
**Status**: ✅ Production Ready

## 🏗️ Architecture

```
📁 CRM/
├── 📁 frontend/          # React + Vite + Tailwind CSS
├── 📁 backend/           # Python FastAPI + SQLAlchemy
├── 📁 database/          # PostgreSQL schema & migrations
├── 📁 docs/             # Documentation & API specs
└── 📁 assets/           # Images, icons, resources
```

## 🚀 Tech Stack

### Frontend
- **React 18** - Modern UI library
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Beautiful analytics charts
- **React Query** - Data fetching & caching
- **React Router** - Navigation
- **React Hook Form** - Form handling
- **Framer Motion** - Animations

### Backend  
- **Python 3.11+** - Programming language
- **FastAPI** - High-performance API framework
- **SQLAlchemy** - ORM for database operations
- **Pydantic** - Data validation
- **JWT** - Authentication
- **Redis** - Caching & real-time features
- **Celery** - Background tasks
- **WebSockets** - Real-time updates

### Database
- **PostgreSQL** - Primary database
- **Redis** - Caching & sessions

## 🌟 Features

### 📊 Analytics & Reporting
- ✅ **Interactive Charts** - Revenue trends, pipeline distribution, activity metrics
- ✅ **Real-time KPIs** - Total revenue, win rate, deals won, average deal size
- ✅ **Pipeline Analytics** - Visual conversion rates by stage with Recharts
- ✅ **Lead Source Tracking** - Pie charts showing lead distribution
- ✅ **Conversion Funnel** - Visual funnel analysis
- ✅ **Activity Metrics** - Calls, emails, meetings tracking
- ✅ **Custom Date Ranges** - Filter by last 7/30/90 days or custom
- ✅ **Export to CSV** - Download analytics data

### 💼 CRM Features
- ✅ **Drag & Drop Pipeline** - Touch-enabled deal movement across stages
- ✅ **Contact Management** - Grid view with search and filters
- ✅ **Bulk Import** - CSV/Excel import with validation
- ✅ **Activity Tracking** - Calls, meetings, emails, tasks
- ✅ **File Management** - Document upload and organization
- ✅ **Quote Generation** - Create and manage quotes
- ✅ **Smart Search** - Global search with suggestions
- ✅ **Quick Actions** - Floating action button for fast data entry

### 📱 Mobile Experience
- ✅ **Fully Responsive** - Works on all devices (320px+)
- ✅ **Mobile Navigation** - Hamburger menu with smooth animations
- ✅ **Touch Optimized** - Large touch targets, swipe gestures
- ✅ **Mobile Modals** - Centered, scrollable, keyboard-friendly
- ✅ **Performance** - Fast loading, smooth scrolling
- ✅ **PWA Ready** - Can be installed as app

### 🔐 Security
- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Role-Based Access Control** - Admin, Manager, User roles
- ✅ **Audit Logging** - Track all user actions
- ✅ **Data Encryption** - Secure data storage
- ✅ **API Rate Limiting** - Prevent abuse
- ✅ **CORS Protection** - Configured origins

## 📸 Screenshots

### Desktop View
![Dashboard](docs/screenshots/dashboard.png)
![Deals Pipeline](docs/screenshots/deals.png)
![Analytics](docs/screenshots/analytics.png)

### Mobile View
![Mobile Dashboard](docs/screenshots/mobile-dashboard.png)
![Mobile Menu](docs/screenshots/mobile-menu.png)
![Mobile Deals](docs/screenshots/mobile-deals.png)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.11+
- PostgreSQL 14+
- Redis 7+

### Installation

1. **Clone & Setup**
   ```bash
   git clone <repository-url>
   cd CRM
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb sales_crm
   
   # Run migrations
   cd backend
   python -m alembic upgrade head
   ```

5. **Environment Variables**
   ```bash
   # Copy example env files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

6. **Start Development**
   ```bash
   # Terminal 1: Backend
   cd backend
   uvicorn main:app --reload --port 8000
   
   # Terminal 2: Frontend  
   cd frontend
   npm run dev
   ```

Visit `http://localhost:5173` to see the application!

**Default Login:**
- Email: demo@example.com
- Password: demo123

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 🎨 UI Design

The UI is designed to match **Pipedrive's** clean and professional interface with modern enhancements:

### Key UI Components
- 📋 **Pipeline View** - Kanban-style drag-and-drop with touch support
- 📊 **Analytics Dashboard** - Interactive Recharts with responsive design
- 👥 **Contact Management** - Grid layout with advanced filtering
- 📧 **Activity Center** - Timeline view for all activities
- ⚙️ **Settings Panel** - Comprehensive user preferences
- 📱 **Mobile Navigation** - Smooth hamburger menu with animations
- 🎯 **Floating Action Button** - Quick access to common actions

### Color Scheme
- **Primary**: #EF4444 (Red - Modern CRM style)
- **Secondary**: #0EA5E9 (Blue)  
- **Success**: #10B981 (Green)
- **Warning**: #F97316 (Orange)
- **Background**: #F9FAFB (Light Gray)

### Design Principles
- **Mobile-First**: Designed for mobile, enhanced for desktop
- **Touch-Friendly**: 44px minimum touch targets
- **Accessible**: WCAG 2.1 AA compliant
- **Fast**: Optimized for performance
- **Consistent**: Unified design system

## 📈 API Endpoints

### Analytics
| Endpoint | Purpose |
|----------|---------|
| `GET /analytics/pipeline` | Pipeline conversion rates, stage durations |
| `GET /analytics/activities` | Activity counts, completion rates |
| `GET /analytics/emails` | Email opens, clicks, bounces |
| `GET /analytics/calls` | Call statistics and durations |  
| `GET /analytics/contacts` | Lead sources, conversion rates |
| `GET /analytics/documents` | Document signing statistics |
| `GET /analytics/custom` | Custom KPI queries |

## 🔧 Development

### Project Structure
```
CRM/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/           # Auth components
│   │   │   ├── common/         # Shared components
│   │   │   └── layout/         # Layout components
│   │   ├── contexts/           # React contexts
│   │   ├── pages/              # Route pages
│   │   │   ├── auth/           # Login, Register
│   │   │   ├── Dashboard.tsx   # Main dashboard
│   │   │   ├── Deals.tsx       # Drag-drop pipeline
│   │   │   ├── Contacts.tsx    # Contact management
│   │   │   ├── Analytics.tsx   # Charts & reports
│   │   │   └── ...             # Other pages
│   │   ├── services/           # API services
│   │   └── index.css           # Global styles
│   ├── package.json
│   └── tailwind.config.js      # Tailwind configuration
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py         # Authentication
│   │   │   ├── contacts.py     # Contacts API
│   │   │   ├── deals.py        # Deals API
│   │   │   ├── analytics.py    # Analytics API
│   │   │   └── ...             # Other APIs
│   │   ├── core/
│   │   │   ├── config.py       # Configuration
│   │   │   ├── database.py     # Database setup
│   │   │   ├── security.py     # Auth & security
│   │   │   └── redis.py        # Redis setup
│   │   └── models/             # Database models
│   ├── main.py                 # FastAPI app
│   └── requirements.txt        # Python dependencies
│
├── database/
│   ├── migrations/             # Alembic migrations
│   └── schema.sql              # Database schema
│
├── docs/
│   └── screenshots/            # App screenshots
│
├── DEPLOYMENT.md               # Deployment guide
├── MOBILE_TESTING.md           # Mobile testing guide
└── README.md                   # This file
```

### Key Technologies

**Frontend:**
- React 18 with TypeScript
- Vite for fast builds
- Tailwind CSS for styling
- Recharts for analytics
- react-beautiful-dnd for drag & drop
- React Query for data fetching
- React Router for navigation
- React Hot Toast for notifications

**Backend:**
- FastAPI (Python 3.11+)
- SQLAlchemy ORM
- PostgreSQL database
- Redis for caching
- JWT authentication
- Pydantic for validation

**DevOps:**
- PM2 for process management
- Nginx as reverse proxy
- Let's Encrypt for SSL
- GitHub Actions for CI/CD (optional)

## 🚀 Deployment

### Production Deployment (VPS)
Complete step-by-step guide in [DEPLOYMENT.md](DEPLOYMENT.md)

```bash
# Quick deployment commands
cd /var/www/sales-crm

# Backend
cd backend
source venv/bin/activate
pm2 start main.py --name crm-backend --interpreter python3

# Frontend
cd ../frontend
npm run build

# Nginx serves the built frontend
sudo systemctl restart nginx
```

### Docker (Alternative)
```bash
docker-compose up -d
```

### Environment Variables
See `.env.example` files in both frontend and backend directories.

**Critical Settings:**
- `SECRET_KEY` - Change in production!
- `DATABASE_URL` - Your PostgreSQL connection
- `ALLOWED_ORIGINS` - Your domain(s)
- `DEBUG` - Set to `False` in production

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
npm run test
```

### Backend Tests
```bash
cd backend
pytest
```

### Mobile Testing
See [MOBILE_TESTING.md](MOBILE_TESTING.md) for comprehensive mobile testing checklist.

### Performance Testing
```bash
# Lighthouse audit
lighthouse https://yourdomain.com --preset=mobile --view
```

## 📊 Performance Metrics

| Metric | Target | Status |
|--------|--------|--------|
| First Contentful Paint | < 1.5s | ✅ |
| Time to Interactive | < 3.5s | ✅ |
| Lighthouse Score | > 90 | ✅ |
| Mobile Performance | > 85 | ✅ |

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **Documentation**: See `/docs` folder
- **Issues**: GitHub Issues
- **Email**: support@yourdomain.com

## 🗺️ Roadmap

### Q1 2025
- [ ] Email integration (Gmail, Outlook)
- [ ] Calendar sync
- [ ] Mobile apps (iOS/Android)
- [ ] Advanced AI features

### Q2 2025
- [ ] Telephony integration (Twilio)
- [ ] Video calls
- [ ] Advanced reporting
- [ ] API webhooks

### Q3 2025
- [ ] Marketplace for integrations
- [ ] Custom fields
- [ ] Advanced automation
- [ ] Multi-language support

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **React** - UI framework
- **FastAPI** - Backend framework
- **Recharts** - Chart library
- **Tailwind CSS** - Styling
- **react-beautiful-dnd** - Drag and drop

---

**Built with ❤️ for modern sales teams**

**Ready for Production** ✅ | **Mobile Optimized** 📱 | **Fully Responsive** 💯