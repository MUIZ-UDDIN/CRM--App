# 🏢 Multi-Tenant SaaS Implementation

## ✅ What's Been Implemented

### 1. **Database Models**

#### Companies Model (`app/models/companies.py`)
```python
- id: UUID
- name: Company name
- plan: enum(free, pro, enterprise)
- status: enum(active, suspended, pending)
- domain: Custom domain (e.g., acme.yourcrm.com)
- logo_url: Company logo
- timezone, currency: Company settings
- twilio_account_sid, twilio_auth_token: Company-level Twilio
- sendgrid_api_key: Company-level SendGrid
- created_by: Super Admin who created it
```

#### Updated Users Model (`app/models/users.py`)
```python
- company_id: UUID (NULL for super_admin)
- user_role: enum(super_admin, company_admin, company_user)
- status: enum(active, suspended, pending)
- Helper methods:
  - is_super_admin()
  - is_company_admin()
  - can_manage_company()
```

### 2. **User Roles & Access Levels**

| Role | Scope | Can Access | Can Manage |
|------|-------|------------|------------|
| **Super Admin** | Entire SaaS | All companies | Everything |
| **Company Admin** | Own company | Company data | Users + settings |
| **Company User** | Own company | Assigned records | Limited actions |

### 3. **Tenant Isolation Middleware** (`app/middleware/tenant.py`)

```python
class TenantContext:
    - is_super_admin()
    - is_company_admin()
    - can_manage_company()
    - can_access_company(company_id)
    - enforce_tenant_isolation(query, model)
    - validate_record_access(record)
```

**Helper Functions:**
- `get_tenant_context(user)` - Get tenant context
- `require_company_admin(user)` - Require company admin
- `require_super_admin(user)` - Require super admin
- `validate_company_access(user, company_id)` - Validate access

### 4. **Company Management API** (`app/api/companies.py`)

#### Endpoints:

**Super Admin Only:**
- `POST /api/companies` - Create new company
- `GET /api/companies` - List all companies
- `DELETE /api/companies/{id}` - Delete company

**Super Admin & Company Admin:**
- `GET /api/companies/{id}` - Get company details
- `PUT /api/companies/{id}` - Update company
- `GET /api/companies/{id}/users` - List company users
- `POST /api/companies/{id}/users` - Add user to company

### 5. **Database Migration** (`migrations/add_multi_tenant_support.sql`)

**What it does:**
1. Creates `companies` table
2. Adds `company_id`, `user_role`, `status` to `users` table
3. Adds `company_id` to all tenant-scoped tables:
   - contacts, deals, activities, emails, sms_messages
   - calls, documents, workflows, files, folders
   - quotes, phone_numbers
4. Creates indexes for performance
5. Migrates existing data to default company

---

## 🔧 How to Use

### 1. **Run Database Migration**

```bash
cd backend
psql $DATABASE_URL -f migrations/add_multi_tenant_support.sql
```

### 2. **Create First Super Admin**

```python
# In Python shell or migration script
from app.models import User, UserRole
from app.database import SessionLocal
from app.api.auth import get_password_hash

db = SessionLocal()

super_admin = User(
    email="admin@yourcrm.com",
    first_name="Super",
    last_name="Admin",
    hashed_password=get_password_hash("your_secure_password"),
    user_role=UserRole.SUPER_ADMIN,
    company_id=None,  # NULL for super admin
    status=UserStatus.ACTIVE
)

db.add(super_admin)
db.commit()
```

### 3. **Register Company API Router**

In `app/main.py`:
```python
from app.api import companies

app.include_router(companies.router)
```

### 4. **Use Tenant Context in Endpoints**

```python
from app.middleware.tenant import get_tenant_context

@router.get("/contacts")
def get_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    context = get_tenant_context(current_user)
    
    # Automatically filter by company_id
    query = db.query(Contact)
    query = context.enforce_tenant_isolation(query, Contact)
    
    contacts = query.all()
    return contacts
```

### 5. **Protect Admin Endpoints**

```python
from app.middleware.tenant import require_company_admin, require_super_admin

@router.post("/settings")
def update_settings(
    current_user: User = Depends(require_company_admin)
):
    # Only company admin or super admin can access
    pass

@router.get("/all-companies")
def list_all_companies(
    current_user: User = Depends(require_super_admin)
):
    # Only super admin can access
    pass
```

---

## 📋 Next Steps

### Phase 1: Core Multi-Tenancy ✅ DONE
- [x] Create Company model
- [x] Update User model with roles
- [x] Create tenant isolation middleware
- [x] Create company management API
- [x] Database migration script

### Phase 2: Update Existing APIs (TODO)
- [ ] Update all existing API endpoints to use tenant context
- [ ] Add company_id filtering to all queries
- [ ] Update authentication to include company context
- [ ] Add company selection on login (if user has multiple)

### Phase 3: Frontend Updates (TODO)
- [ ] Create Super Admin dashboard
- [ ] Create Company Admin dashboard
- [ ] Add company switcher (if needed)
- [ ] Update user management UI
- [ ] Add company settings page

### Phase 4: Advanced Features (TODO)
- [ ] Custom domains (acme.yourcrm.com)
- [ ] Company-level Twilio integration
- [ ] Company-level SendGrid integration
- [ ] Billing & subscription management
- [ ] Usage analytics per company
- [ ] Audit logs
- [ ] Custom roles per company

---

## 🔐 Security Best Practices

### 1. **Always Filter by company_id**
```python
# ❌ BAD - No tenant isolation
contacts = db.query(Contact).all()

# ✅ GOOD - Tenant isolated
context = get_tenant_context(current_user)
query = db.query(Contact)
query = context.enforce_tenant_isolation(query, Contact)
contacts = query.all()
```

### 2. **Validate Record Access**
```python
# Before updating/deleting a record
context = get_tenant_context(current_user)
if not context.validate_record_access(contact):
    raise HTTPException(status_code=403, detail="Access denied")
```

### 3. **Use Role-Based Access Control**
```python
# Check user role before sensitive operations
if not current_user.can_manage_company():
    raise HTTPException(status_code=403, detail="Admin access required")
```

---

## 🧪 Testing

### Test Scenarios:

1. **Super Admin Access**
   - Can create/view/edit/delete all companies
   - Can access all data across companies
   - Can manage users in any company

2. **Company Admin Access**
   - Can only access own company data
   - Can manage users in own company
   - Cannot access other companies

3. **Company User Access**
   - Can only access own company data
   - Can only manage assigned records
   - Cannot manage company settings

4. **Tenant Isolation**
   - User from Company A cannot see Company B data
   - Queries automatically filtered by company_id
   - Record access validated before operations

---

## 📊 Database Schema

```sql
companies
├── id (UUID, PK)
├── name
├── plan (enum)
├── status (enum)
├── domain (unique)
├── created_by (FK -> users.id)
└── ... (settings, integrations)

users
├── id (UUID, PK)
├── company_id (FK -> companies.id, NULL for super_admin)
├── user_role (enum: super_admin, company_admin, company_user)
├── status (enum: active, suspended, pending)
├── email (unique)
└── ... (profile fields)

contacts, deals, activities, etc.
├── id (UUID, PK)
├── company_id (FK -> companies.id) ← NEW
└── ... (existing fields)
```

---

## 🚀 Deployment Checklist

- [ ] Run database migration
- [ ] Create first super admin user
- [ ] Update all API endpoints with tenant context
- [ ] Test tenant isolation
- [ ] Update frontend for multi-tenancy
- [ ] Configure company-level integrations
- [ ] Set up billing (if applicable)
- [ ] Create admin documentation
- [ ] Train support team on multi-tenancy

---

## 📞 Support

For questions or issues with multi-tenant implementation:
1. Check this documentation
2. Review middleware/tenant.py for access control
3. Check API endpoints in api/companies.py
4. Review database migration script

---

**Status:** ✅ Core implementation complete, ready for integration testing
