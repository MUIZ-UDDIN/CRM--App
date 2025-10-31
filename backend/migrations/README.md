# Database Migrations

## Multi-Tenant Migration

### Quick Start (Recommended)

**Option 1: Using the migration script**
```bash
cd /var/www/crm-app/backend/migrations
chmod +x run_multi_tenant_migration.sh
./run_multi_tenant_migration.sh
```

**Option 2: As postgres superuser (Easiest)**
```bash
cd /var/www/crm-app/backend/migrations
sudo -u postgres psql -d sales_crm -f add_multi_tenant_support.sql
```

**Option 3: With your database user**
```bash
cd /var/www/crm-app/backend/migrations
psql -U crm_user -d sales_crm -h localhost -f add_multi_tenant_support.sql
# You'll be prompted for password
```

**Option 4: Using DATABASE_URL from .env**
```bash
cd /var/www/crm-app/backend
source .env  # Load environment variables
cd migrations
psql $DATABASE_URL_SYNC -f add_multi_tenant_support.sql
```

### Common Issues

#### Issue 1: "role 'root' does not exist"
**Problem:** You're running psql as root user, but PostgreSQL doesn't have a root role.

**Solution:** Use the postgres superuser or your database user:
```bash
sudo -u postgres psql -d sales_crm -f add_multi_tenant_support.sql
```

#### Issue 2: "connection to server failed"
**Problem:** PostgreSQL is not running or connection details are wrong.

**Solution:** Check PostgreSQL status:
```bash
sudo systemctl status postgresql
sudo systemctl start postgresql  # if not running
```

#### Issue 3: "database does not exist"
**Problem:** The database name is wrong.

**Solution:** List databases and use correct name:
```bash
sudo -u postgres psql -l  # List all databases
sudo -u postgres psql -d your_actual_db_name -f add_multi_tenant_support.sql
```

#### Issue 4: "permission denied"
**Problem:** User doesn't have permission to create tables/types.

**Solution:** Grant permissions or use superuser:
```bash
# Option A: Use postgres superuser
sudo -u postgres psql -d sales_crm -f add_multi_tenant_support.sql

# Option B: Grant permissions to your user
sudo -u postgres psql -d sales_crm -c "ALTER USER crm_user CREATEDB;"
```

### Verify Migration

After running the migration, verify it worked:

```bash
sudo -u postgres psql -d sales_crm
```

Then run these SQL commands:
```sql
-- Check if companies table exists
\dt companies

-- Check if new columns exist in users table
\d users

-- Check if enum types were created
\dT+ user_role
\dT+ company_status

-- Check if indexes were created
\di idx_users_company_id
\di idx_companies_status

-- Exit
\q
```

### Rollback (if needed)

If something goes wrong, you can rollback:

```sql
-- Drop new columns
ALTER TABLE users DROP COLUMN IF EXISTS company_id;
ALTER TABLE users DROP COLUMN IF EXISTS user_role;
ALTER TABLE users DROP COLUMN IF EXISTS status;

-- Drop company_id from other tables
ALTER TABLE contacts DROP COLUMN IF EXISTS company_id;
ALTER TABLE deals DROP COLUMN IF EXISTS company_id;
-- ... etc

-- Drop companies table
DROP TABLE IF EXISTS companies CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS company_status CASCADE;
DROP TYPE IF EXISTS plan_type CASCADE;
```

### What This Migration Does

1. **Creates enum types:**
   - `plan_type` (free, pro, enterprise)
   - `company_status` (active, suspended, pending)
   - `user_role` (super_admin, company_admin, company_user)
   - `user_status` (active, suspended, pending)

2. **Creates companies table** with:
   - Company info (name, plan, status)
   - Settings (domain, logo, timezone, currency)
   - Billing (stripe_customer_id, subscription_ends_at)
   - Integrations (Twilio, SendGrid)

3. **Updates users table** with:
   - `company_id` (references companies)
   - `user_role` (RBAC role)
   - `status` (account status)

4. **Adds company_id to all tenant-scoped tables:**
   - contacts, deals, activities, emails
   - sms_messages, calls, documents, workflows
   - files, folders, quotes, phone_numbers

5. **Creates indexes** for performance

6. **Migrates existing data** to a default company

### After Migration

1. **Create Super Admin:**
   ```python
   python -c "
   from app.models import User, UserRole, UserStatus
   from app.database import SessionLocal
   from app.api.auth import get_password_hash
   
   db = SessionLocal()
   admin = User(
       email='admin@yourcrm.com',
       first_name='Super',
       last_name='Admin',
       hashed_password=get_password_hash('YourSecurePassword123!'),
       user_role=UserRole.SUPER_ADMIN,
       company_id=None,
       status=UserStatus.ACTIVE
   )
   db.add(admin)
   db.commit()
   print('Super admin created!')
   "
   ```

2. **Register API Router** in `app/main.py`:
   ```python
   from app.api import companies
   app.include_router(companies.router)
   ```

3. **Restart your application:**
   ```bash
   sudo systemctl restart crm-backend
   ```

### Need Help?

If you encounter issues:
1. Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`
2. Check your .env file has correct DATABASE_URL
3. Verify PostgreSQL is running: `sudo systemctl status postgresql`
4. Check database exists: `sudo -u postgres psql -l`
