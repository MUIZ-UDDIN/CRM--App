# CRM Application - Complete Documentation

**Version:** 1.0  
**Last Updated:** October 29, 2025  
**Platform:** Web-based CRM with Mobile Responsive Design

---

## 📑 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Core Features](#core-features)
4. [Module Documentation](#module-documentation)
5. [API Reference](#api-reference)
6. [Mobile Features](#mobile-features)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## 📖 Overview

### What is this CRM?

A comprehensive Customer Relationship Management system designed to help businesses manage sales pipelines, customer interactions, and business processes efficiently.

### Key Features

- **Full-Stack Application**: React + FastAPI
- **Real-time Updates**: WebSocket integration
- **Mobile-First Design**: Fully responsive
- **Twilio Integration**: SMS, calls, voice
- **AI-Powered**: Claude AI for smart responses
- **Drag-and-Drop**: Kanban board interface
- **Automation**: Workflow engine
- **Secure**: JWT authentication with RBAC

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS
- React Router
- React Beautiful DnD
- Heroicons

**Backend:**
- FastAPI (Python)
- SQLAlchemy ORM
- PostgreSQL
- JWT authentication
- Twilio SDK

---

## 🏗️ System Architecture

### Application Structure

```
CRM--App/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── hooks/
│   └── package.json
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   └── schemas/
│   └── requirements.txt
└── Documentation/
```

### Database Schema

**Core Tables:**
- `users` - User accounts
- `contacts` - Customer information
- `deals` - Sales opportunities
- `activities` - Tasks and interactions
- `pipelines` - Sales pipeline definitions
- `stages` - Pipeline stages
- `quotes` - Proposals
- `files` - Documents
- `workflows` - Automation rules
- `phone_numbers` - Twilio numbers
- `sms_messages` - SMS history
- `call_logs` - Call records

---

## 🎯 Core Features

### 1. Dashboard

**Purpose:** Central hub for KPIs and quick actions

**Key Metrics:**
- Total Revenue
- Deals Won
- Win Rate
- Average Deal Size
- Total Pipeline Value
- Active Deals Count
- Activities Today

**Functions:**
- `fetchDashboardAnalytics()` - Get all metrics
- `calculateGrowth()` - Period comparison
- `formatCurrency()` - Format money values
- `highlightMaxStage()` - Find top pipeline stage

**Mobile:** KPI cards stack vertically (1→2→4 columns)

---

### 2. Deals Management

**Purpose:** Visual sales pipeline management

**Features:**
- Kanban board with drag-and-drop
- Customizable pipeline stages
- Deal cards with company logos
- Search and filter
- Status tracking (open/won/lost)
- Expected close date tracking

**Functions:**
- `fetchDeals()` - Get all deals
- `createDeal()` - Create new deal
- `updateDeal()` - Update deal
- `deleteDeal()` - Remove deal
- `moveDeal()` - Change stage
- `calculateStageTotal()` - Sum values

**Mobile:** Vertical accordion with tap-to-expand stages

**Deal Properties:**
- Title (required)
- Value (required)
- Company
- Contact
- Pipeline stage
- Expected close date
- Status
- Owner

---

### 3. Contacts Management

**Purpose:** Customer and lead database

**Features:**
- Contact list with search/filter
- Type classification (Lead, Customer, Prospect, Partner, MQL)
- Status tracking (Active/Inactive)
- Bulk CSV import
- Activity history
- Deal associations

**Functions:**
- `fetchContacts()` - Get all contacts
- `createContact()` - Add contact
- `updateContact()` - Update contact
- `deleteContact()` - Remove contact
- `importContacts()` - Bulk CSV import
- `searchContacts()` - Search by criteria

**Mobile:** Card view with clickable email/phone links

**Contact Properties:**
- First name (required)
- Last name (required)
- Email (required, unique)
- Phone
- Company
- Title
- Type
- Status
- Address
- Notes
- Owner

---

### 4. Activities Management

**Purpose:** Track customer interactions and tasks

**Features:**
- Activity types: Call, Meeting, Email, Task
- Due date tracking
- Status: Pending, Completed, Overdue
- Priority levels: Low, Medium, High
- Duration tracking
- Contact/Deal associations
- Automatic overdue detection

**Functions:**
- `fetchActivities()` - Get activities
- `createActivity()` - Create activity
- `updateActivity()` - Update activity
- `deleteActivity()` - Remove activity
- `completeActivity()` - Mark complete
- `checkOverdue()` - Find overdue items

**Mobile:** Card view with type/status badges

**Activity Properties:**
- Type (required)
- Subject (required)
- Description
- Due date
- Duration (minutes)
- Status
- Priority (0-2)
- Contact/Deal links
- Owner

---

### 5. Quotes Management

**Purpose:** Create and manage sales quotes

**Features:**
- Line-item based quotes
- Automatic calculations (subtotal, tax, discount, total)
- Quote status tracking
- Valid until date
- PDF generation
- Templates

**Functions:**
- `fetchQuotes()` - Get quotes
- `createQuote()` - Create quote
- `addLineItem()` - Add product/service
- `calculateTotal()` - Compute final amount
- `generatePDF()` - Export as PDF

**Mobile:** Responsive grid layout (1-4 columns)

---

### 6. Files Management

**Purpose:** Document storage and management

**Features:**
- Drag-and-drop upload
- File preview
- Download functionality
- Contact/Deal associations
- File type validation
- Size limits

**Functions:**
- `uploadFile()` - Upload file
- `downloadFile()` - Download file
- `deleteFile()` - Remove file
- `previewFile()` - Open preview

**Supported Types:** PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, SVG, ZIP

**Mobile:** Grid layout with camera upload support

---

### 7. Workflows & Automation

**Purpose:** Automate business processes

**Features:**
- Visual workflow builder
- Trigger types: Deal created, stage changed, contact created
- Action types: Send email, create activity, update deal
- Conditional logic
- Execution history

**Functions:**
- `createWorkflow()` - Create workflow
- `activateWorkflow()` - Enable workflow
- `deactivateWorkflow()` - Disable workflow
- `executeWorkflow()` - Run manually

**Mobile:** Responsive cards with toggle switches

---

### 8. Communication Features

#### SMS Messaging
- Send/receive SMS via Twilio
- Message templates
- Scheduled messages
- AI auto-response (Claude)
- Contact sync
- Character counter

**Functions:**
- `sendSMS()` - Send message
- `fetchMessages()` - Get history
- `createTemplate()` - Create template
- `scheduleSMS()` - Schedule message

#### Voice Calls
- Click-to-call
- Call logging
- Call recording
- Duration tracking
- Contact/Deal associations

**Functions:**
- `initiateCall()` - Start call
- `endCall()` - End call
- `fetchCallLogs()` - Get history

---

### 9. Analytics & Reporting

**Purpose:** Business intelligence and metrics

**KPI Formulas:**

1. **Total Revenue** = SUM(deal.value WHERE status = 'won')
2. **Deals Won** = COUNT(deals WHERE status = 'won')
3. **Win Rate** = (Deals Won / Total Closed) × 100
4. **Average Deal Size** = Total Revenue / Deals Won
5. **Total Pipeline** = SUM(deal.value WHERE status = 'open')
6. **Active Deals** = COUNT(deals WHERE status = 'open')
7. **Activities Today** = COUNT(activities WHERE due_date = today)

**Functions:**
- `fetchAnalytics()` - Get all metrics
- `calculateRevenue()` - Compute revenue
- `calculateWinRate()` - Compute win %
- `calculateGrowth()` - Period comparison

---

### 10. Settings & Configuration

#### User Profile
- Personal information
- Password management
- Profile picture
- Notification preferences
- Timezone settings

#### Pipeline Settings
- Create/edit pipelines
- Manage stages
- Stage ordering
- Stage colors
- Default pipeline

#### Twilio Settings
- Account configuration (SID, Auth Token)
- Phone number management
- SMS/Call settings
- Webhook configuration
- Contact sync
- Number rotation

#### Team Management (Admin)
- User management
- Role assignment (Admin/Manager/User)
- Permission control
- Team performance tracking

---

## 👥 User Roles & Permissions

### Role Types

**Admin (Superuser)**
- Full system access
- User management
- Settings configuration
- View all data
- Delete any records

**Manager**
- View team data
- Manage own records
- View team analytics
- Cannot manage users

**User (Standard)**
- View own data only
- Create/edit own records
- Limited analytics

### Permission Matrix

| Feature | Admin | Manager | User |
|---------|-------|---------|------|
| Dashboard (All) | ✅ | ✅ | ❌ |
| Dashboard (Own) | ✅ | ✅ | ✅ |
| Create Deals | ✅ | ✅ | ✅ |
| Edit All Deals | ✅ | ❌ | ❌ |
| Delete Deals | ✅ | ✅ | ❌ |
| Manage Workflows | ✅ | ✅ | ❌ |
| User Management | ✅ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ |

---

## 📱 Mobile Responsiveness

### Design Philosophy
- Mobile-first approach
- Touch-friendly interface (44x44px minimum buttons)
- Progressive enhancement
- Consistent cross-device experience

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Mobile Features

**Dashboard:** 1 column KPI cards, value truncation

**Deals:** Vertical accordion, tap-to-expand stages, chevron indicators

**Contacts:** Card view, clickable mailto:/tel: links, touch buttons

**Activities:** Card view, badges, complete button

**Forms:** Single column, stacked fields, proper input types

### Touch Interactions
- Tap: Primary action
- Long press: Context menu
- Swipe: Navigation
- Minimum button size: 44x44px
- Spacing: 8px between elements

---

## 🔌 API Reference

### Authentication

**POST /api/auth/login**
```json
Request:
{
  "username": "user@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "jwt_token",
  "token_type": "bearer",
  "user": { "id": "uuid", "email": "...", "is_superuser": false }
}
```

### Common Headers
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

### Endpoints

**Deals:**
- GET /api/deals/ - List deals
- POST /api/deals/ - Create deal
- PUT /api/deals/{id} - Update deal
- DELETE /api/deals/{id} - Delete deal
- PATCH /api/deals/{id}/stage - Move stage

**Contacts:**
- GET /api/contacts/ - List contacts
- POST /api/contacts/ - Create contact
- PUT /api/contacts/{id} - Update contact
- DELETE /api/contacts/{id} - Delete contact
- POST /api/contacts/import - Bulk import

**Activities:**
- GET /api/activities/ - List activities
- POST /api/activities/ - Create activity
- PATCH /api/activities/{id}/complete - Mark complete

**Analytics:**
- GET /api/analytics/dashboard - Dashboard metrics

**SMS:**
- POST /api/sms/send - Send SMS
- GET /api/sms/messages - Message history
- GET /api/sms/phone-numbers - Available numbers

**Workflows:**
- GET /api/workflows/ - List workflows
- POST /api/workflows/ - Create workflow
- PATCH /api/workflows/{id}/toggle - Activate/deactivate

### Error Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

---

## 🚀 Deployment

### Prerequisites
- Linux server (Ubuntu 20.04+)
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Nginx

### Backend Setup

```bash
cd /var/www/crm-app/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure .env file
DATABASE_URL=postgresql://user:pass@localhost/crm
SECRET_KEY=your-secret-key
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
CLAUDE_API_KEY=your-key

# Run migrations
alembic upgrade head

# Start service
sudo systemctl enable crm-backend
sudo systemctl start crm-backend
```

### Frontend Setup

```bash
cd /var/www/crm-app/frontend
npm install
npm run build

# Configure Nginx
sudo nano /etc/nginx/sites-available/crm
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

### Update Deployment

```bash
cd /var/www/crm-app
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
sudo systemctl restart crm-backend

# Frontend
cd ../frontend
npm install
npm run build
sudo systemctl reload nginx
```

---

## 🔧 Troubleshooting

### Login Issues
- Check database connection
- Verify JWT secret key
- Clear browser cache

### Deals Not Loading
- Check API endpoint /api/deals/
- Verify authentication token
- Check browser console

### SMS Not Sending
- Verify Twilio credentials
- Check phone number format (+1234567890)
- Verify account balance

### Mobile Layout Issues
- Clear browser cache
- Check viewport meta tag
- Test different browsers

### File Upload Failing
- Check file size limits
- Verify file type allowed
- Check disk space

---

## 📚 Additional Resources

**Documentation Files:**
- `DASHBOARD_KPI_FORMULAS.md` - KPI calculations
- `MOBILE_RESPONSIVENESS_TESTING.md` - Testing guide
- `MOBILE_RESPONSIVENESS_STATUS.md` - Implementation status

**Support:**
- GitHub Issues
- Email support
- Documentation wiki

---

**End of Documentation**

For questions or support, please contact the development team.
