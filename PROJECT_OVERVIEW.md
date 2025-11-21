# 📊 Sunstone CRM - Complete Project Overview

**Generated:** November 21, 2025  
**Repository:** https://github.com/MUIZ-UDDIN/CRM--App.git

---

## 🏗️ **Project Structure**

```
CRM--App/
├── 📁 backend/                    # FastAPI Backend (Python 3.11)
│   ├── 📁 app/                    # Main application code
│   │   ├── 📁 api/                # API endpoints (calls, emails, sms, etc.)
│   │   ├── 📁 models/             # SQLAlchemy database models
│   │   ├── 📁 schemas/            # Pydantic schemas for validation
│   │   ├── 📁 core/               # Core utilities (auth, config, etc.)
│   │   └── main.py                # Application entry point
│   ├── 📁 migrations/             # Database migrations (Alembic)
│   ├── .env                       # Environment variables (local)
│   ├── .env.production            # Production environment variables
│   ├── requirements.txt           # Python dependencies
│   └── alembic.ini                # Alembic configuration
│
├── 📁 frontend/                   # React Frontend (TypeScript)
│   ├── 📁 src/
│   │   ├── 📁 components/         # React components
│   │   ├── 📁 pages/              # Page components
│   │   ├── 📁 services/           # API service calls
│   │   ├── 📁 hooks/              # Custom React hooks
│   │   ├── 📁 utils/              # Utility functions
│   │   ├── 📁 types/              # TypeScript type definitions
│   │   └── App.tsx                # Main app component
│   ├── 📁 public/                 # Static assets
│   ├── .env                       # Frontend environment variables
│   ├── package.json               # Node.js dependencies
│   ├── vite.config.ts             # Vite configuration
│   └── tailwind.config.js         # TailwindCSS configuration
│
├── 📁 database/                   # Database scripts
│   ├── schema.sql                 # Database schema
│   └── sample_data.sql            # Sample data for testing
│
├── 📁 .agent/                     # Agent workflows
│   └── 📁 workflows/
│       └── deploy-to-vps.md       # Deployment workflow
│
├── 📄 README.md                   # Project documentation
├── 📄 DEPLOYMENT_INSTRUCTIONS.md  # Deployment guide
├── 📄 GITHUB_TO_VPS_WORKFLOW.md   # Quick deployment reference
├── 📄 deploy.sh                   # Full deployment script
├── 📄 deploy_vps.sh               # VPS deployment script
├── 📄 docker-compose.yml          # Docker configuration
└── 📄 .gitignore                  # Git ignore rules
```

---

## 🛠️ **Technology Stack**

### **Backend**
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Programming language |
| FastAPI | Latest | Web framework |
| PostgreSQL | 14+ | Database |
| SQLAlchemy | Latest | ORM |
| Alembic | Latest | Database migrations |
| Redis | Latest | Caching & sessions |
| JWT | - | Authentication |
| Twilio | Latest | SMS & Calls |

### **Frontend**
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18 | UI framework |
| TypeScript | Latest | Type safety |
| Vite | Latest | Build tool |
| TailwindCSS | Latest | Styling |
| React Router | Latest | Routing |
| Axios | Latest | HTTP client |

### **DevOps**
| Technology | Purpose |
|------------|---------|
| Nginx | Web server & reverse proxy |
| PM2 | Process manager |
| Certbot | SSL certificates |
| Git | Version control |
| GitHub | Code repository |

---

## 🎯 **Core Features**

### **1. Dashboard** 📊
- Real-time analytics and KPIs
- Sales performance metrics
- Revenue tracking
- Activity feed

### **2. Contact Management** 👥
- Lead tracking
- Contact profiles
- Custom fields
- Import/export contacts
- Contact segmentation

### **3. Deal Pipeline** 💼
- Visual kanban board
- Drag-and-drop deals
- Deal stages customization
- Win/loss tracking
- Revenue forecasting

### **4. Communication** 📧
- **Email Integration**
  - Inbox management
  - Email templates
  - Email campaigns
  - Email tracking

- **SMS & Calls** 📱
  - Twilio integration
  - SMS templates
  - Call logging
  - Phone number management
  - SMS campaigns

### **5. Analytics** 📈
- Sales reports
- Performance dashboards
- Custom reports
- Export capabilities

### **6. Automation** ⚙️
- Workflow automation
- Email sequences
- Task automation
- Notifications

### **7. Document Management** 📄
- Document upload
- Digital signatures
- Document templates
- Version control

### **8. User Management** 👤
- Role-based access control (RBAC)
- Team management
- Permission settings
- Multi-tenancy support

### **9. Quotes & Billing** 💰
- Quote generation
- Billing system
- Invoice management

---

## 🔐 **Multi-Tenancy Architecture**

The app supports **complete data isolation** between companies:

```
Company A                    Company B
    ↓                            ↓
company_id: xxx          company_id: yyy
    ↓                            ↓
┌─────────────┐          ┌─────────────┐
│  Contacts   │          │  Contacts   │
│  Deals      │          │  Deals      │
│  Calls      │          │  Calls      │
│  Emails     │          │  Emails     │
│  Documents  │          │  Documents  │
└─────────────┘          └─────────────┘
```

**All tables include `company_id`:**
- ✅ Users
- ✅ Contacts
- ✅ Deals
- ✅ Calls
- ✅ Emails
- ✅ SMS
- ✅ Documents
- ✅ Quotes
- ✅ Workflows
- ✅ Files
- ✅ Notifications
- ✅ Phone Numbers
- ✅ Email Templates
- ✅ SMS Templates

---

## 🚀 **Deployment Architecture**

```
┌─────────────────────────────────────────────────────┐
│                   Hostinger VPS                      │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │              Nginx (Port 80/443)            │    │
│  │         (SSL, Reverse Proxy, Static)        │    │
│  └──────────────┬─────────────────────────────┘    │
│                 │                                    │
│     ┌───────────┴──────────┐                        │
│     ↓                      ↓                        │
│  ┌─────────────┐    ┌──────────────┐               │
│  │  Frontend   │    │   Backend    │               │
│  │   (Dist)    │    │  (FastAPI)   │               │
│  │ Port: N/A   │    │  Port: 8000  │               │
│  └─────────────┘    └──────┬───────┘               │
│                             │                        │
│                    ┌────────┴────────┐              │
│                    ↓                 ↓              │
│              ┌──────────┐     ┌──────────┐         │
│              │PostgreSQL│     │  Redis   │         │
│              │Port: 5432│     │Port: 6379│         │
│              └──────────┘     └──────────┘         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**VPS Configuration:**
- **Path:** `/var/www/crm-app`
- **Backend Service:** `crm-backend` (systemd)
- **Database:** `sales_crm`
- **Database User:** `crm_user`
- **Domain:** `sunstonecrm.com`

---

## 📡 **API Endpoints Overview**

### **Authentication**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - User logout

### **Contacts**
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact
- `GET /api/contacts/{id}` - Get contact
- `PUT /api/contacts/{id}` - Update contact
- `DELETE /api/contacts/{id}` - Delete contact

### **Deals**
- `GET /api/deals` - List deals
- `POST /api/deals` - Create deal
- `PUT /api/deals/{id}` - Update deal
- `DELETE /api/deals/{id}` - Delete deal

### **Communication**
- `GET /api/emails` - List emails
- `POST /api/emails/send` - Send email
- `GET /api/sms` - List SMS
- `POST /api/sms/send` - Send SMS
- `GET /api/calls` - List calls
- `POST /api/calls` - Log call

### **Analytics**
- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/analytics/sales` - Sales analytics
- `GET /api/analytics/performance` - Performance metrics

### **Settings**
- `GET /api/settings/profile` - User profile
- `PUT /api/settings/profile` - Update profile
- `GET /api/settings/team` - Team members
- `POST /api/settings/team` - Add team member

**Full API Documentation:** `https://sunstonecrm.com/api/docs`

---

## 🔄 **Deployment Workflow**

```
┌──────────────┐
│ Local Dev    │
│ (Windows)    │
└──────┬───────┘
       │ git add .
       │ git commit -m "message"
       │ git push origin main
       ↓
┌──────────────┐
│   GitHub     │
│  Repository  │
└──────┬───────┘
       │ git pull origin main
       ↓
┌──────────────┐
│ Hostinger    │
│     VPS      │
│              │
│ 1. Pull code │
│ 2. Build     │
│ 3. Restart   │
└──────────────┘
```

**Quick Deploy Command:**
```bash
# On VPS
cd /var/www/crm-app
git pull origin main
cd frontend && npm run build
sudo systemctl restart crm-backend
```

---

## 📂 **Important Files**

### **Configuration Files**
- `backend/.env` - Backend environment variables
- `frontend/.env` - Frontend environment variables
- `backend/alembic.ini` - Database migration config
- `nginx-config-example.conf` - Nginx configuration example

### **Deployment Scripts**
- `deploy.sh` - Full deployment automation
- `deploy_vps.sh` - VPS-specific deployment
- `deploy-backend.sh` - Backend-only deployment

### **Database Scripts**
- `database/schema.sql` - Database schema
- `database/sample_data.sql` - Sample data
- `backend/migrations/` - Alembic migrations

### **Documentation**
- `README.md` - Project overview
- `DEPLOYMENT_INSTRUCTIONS.md` - Deployment guide
- `GITHUB_TO_VPS_WORKFLOW.md` - Deployment workflow
- `DOCUMENTATION.md` - Full documentation
- Various audit and status reports (*.md files)

---

## 🔒 **Security Features**

- ✅ JWT-based authentication
- ✅ Password hashing (bcrypt)
- ✅ Role-based access control (RBAC)
- ✅ Multi-tenancy data isolation
- ✅ HTTPS/SSL encryption
- ✅ CORS protection
- ✅ SQL injection prevention (ORM)
- ✅ XSS protection
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Secure headers (Nginx)

---

## 📊 **Database Schema Overview**

### **Core Tables**
- `companies` - Company/tenant data
- `users` - User accounts
- `contacts` - Contact information
- `deals` - Sales deals
- `activities` - Activity tracking

### **Communication Tables**
- `emails` - Email records
- `email_templates` - Email templates
- `email_campaigns` - Email campaigns
- `sms_messages` - SMS records
- `sms_templates` - SMS templates
- `calls` - Call logs
- `phone_numbers` - Twilio phone numbers

### **Document Tables**
- `documents` - Document storage
- `document_signatures` - Digital signatures
- `files` - File uploads
- `folders` - Folder organization

### **Automation Tables**
- `workflows` - Workflow definitions
- `workflow_executions` - Workflow runs
- `notifications` - User notifications

### **Business Tables**
- `quotes` - Quote generation
- `billing` - Billing records
- `performance_alerts` - Performance tracking

---

## 🎨 **Frontend Pages**

- `/` - Dashboard
- `/contacts` - Contact management
- `/deals` - Deal pipeline
- `/analytics` - Analytics & reports
- `/inbox` - Email inbox
- `/sms` - SMS management
- `/calls` - Call logs
- `/documents` - Document management
- `/settings` - Settings & configuration
- `/login` - Login page
- `/register` - Registration page

---

## 🔧 **Environment Variables**

### **Backend (.env)**
```env
ENVIRONMENT=production
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/sales_crm
DATABASE_URL_SYNC=postgresql://user:pass@localhost:5432/sales_crm
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ALLOWED_HOSTS=["sunstonecrm.com"]
ALLOWED_ORIGINS=["https://sunstonecrm.com"]
LOG_LEVEL=INFO

# Twilio (optional)
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=your-number
```

### **Frontend (.env)**
```env
VITE_API_URL=https://sunstonecrm.com/api
VITE_APP_NAME=Sunstone CRM
VITE_APP_VERSION=1.0.0
```

---

## 📈 **Current Status**

### **Completed Features** ✅
- Multi-tenancy implementation
- Role-based permissions
- Contact & deal management
- Email & SMS integration
- Call logging with Twilio
- Document management
- Analytics dashboard
- Workflow automation
- Mobile responsiveness
- VPS deployment

### **Recent Updates** 🆕
- Multi-tenancy data isolation
- Company-based filtering
- Improved mobile UI
- Performance optimizations
- Security enhancements

---

## 🚀 **Quick Start Commands**

### **Local Development**
```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python -m app.main

# Frontend
cd frontend
npm install
npm run dev
```

### **Production Deployment**
```bash
# On VPS
cd /var/www/crm-app
git pull origin main
cd frontend && npm run build
sudo systemctl restart crm-backend
```

---

## 📞 **Support & Resources**

- **Repository:** https://github.com/MUIZ-UDDIN/CRM--App.git
- **API Docs:** https://sunstonecrm.com/api/docs
- **Deployment Guide:** See `DEPLOYMENT_INSTRUCTIONS.md`
- **Workflow:** See `.agent/workflows/deploy-to-vps.md`

---

**Last Updated:** November 21, 2025  
**Status:** ✅ Production Ready  
**Version:** 1.0.0
