# Twilio Multi-Tenancy Audit & Implementation Plan

## Date: November 4, 2025

## Objective
Ensure all Twilio-related features are properly configured with `company_id` filtering to prevent data conflicts between companies.

---

## ✅ Models Updated with `company_id`

### 1. **PhoneNumber** (`backend/app/models/phone_numbers.py`)
- ✅ Added `company_id` column
- ✅ Foreign key to `companies` table
- ✅ Indexed for performance

### 2. **SMSMessage** (`backend/app/models/sms.py`)
- ✅ Added `company_id` column
- ✅ Foreign key to `companies` table
- ✅ Indexed for performance

### 3. **ScheduledSMS** (`backend/app/models/scheduled_sms.py`)
- ✅ Added `company_id` column
- ✅ Foreign key to `companies` table
- ✅ Indexed for performance

### 4. **SMSTemplate** (`backend/app/models/sms_templates.py`)
- ✅ Added `company_id` column
- ✅ Foreign key to `companies` table
- ✅ Indexed for performance

### 5. **TwilioSettings** (`backend/app/models/twilio_settings.py`)
- ✅ Already has `company_id` column (unique)
- ✅ Properly configured for multi-tenancy

---

## 🔧 API Endpoints to Update

### Priority 1: Critical Endpoints (Data Leakage Risk)

#### **SMS Enhanced API** (`backend/app/api/sms_enhanced.py`)
- ✅ `GET /phone-numbers` - Filter by `company_id` (FIXED)
- ⚠️ `POST /send` - Add `company_id` when creating SMS
- ⚠️ `GET /messages` - Filter by `company_id`
- ⚠️ `GET /conversations` - Filter by `company_id`
- ⚠️ `POST /schedule` - Add `company_id` to scheduled SMS
- ⚠️ `GET /scheduled` - Filter by `company_id`
- ⚠️ `GET /templates` - Filter by `company_id`
- ⚠️ `POST /templates` - Add `company_id` when creating template

#### **SMS API** (`backend/app/api/sms.py`)
- ⚠️ All endpoints need `company_id` filtering

#### **Twilio Settings API** (`backend/app/api/twilio_settings.py`)
- ⚠️ `GET /twilio-settings` - Filter by `company_id`
- ⚠️ `POST /twilio-settings` - Add `company_id` when creating
- ⚠️ `PUT /twilio-settings` - Verify `company_id` match

#### **Twilio Sync API** (`backend/app/api/twilio_sync.py`)
- ⚠️ `POST /phone-numbers` - Add `company_id` when syncing
- ⚠️ All sync operations need `company_id`

---

## 📊 Database Migration Required

### Run this SQL script on VPS:
```bash
sudo -u postgres psql -d sales_crm -f /var/www/crm-app/backend/migrations/add_company_id_to_sms_tables.sql
```

This will:
1. Add `company_id` columns to all SMS tables
2. Create indexes for performance
3. Populate `company_id` from existing user relationships
4. Verify all records have `company_id`

---

## 🎯 Frontend Pages to Verify

### Pages that use Twilio features:
1. **Settings → Integrations** - ✅ Already restricted to admins
2. **SMS Page** - ⚠️ Needs verification
3. **Bulk SMS Page** - ⚠️ Needs verification
4. **Phone Numbers Page** - ⚠️ Needs verification
5. **Conversations Page** - ⚠️ Needs verification
6. **Call Logs Page** - ⚠️ Needs verification

---

## 🚀 Implementation Steps

### Step 1: Database Migration (IMMEDIATE)
```bash
cd /var/www/crm-app
git pull origin main
sudo -u postgres psql -d sales_crm -f backend/migrations/add_company_id_to_sms_tables.sql
```

### Step 2: Update API Endpoints (NEXT)
- Update all SMS-related endpoints to filter by `company_id`
- Add `company_id` when creating new SMS/templates/scheduled messages
- Verify user's `company_id` matches resource `company_id` on updates/deletes

### Step 3: Test Multi-Tenancy (CRITICAL)
- Create test data in multiple companies
- Verify Company A cannot see Company B's:
  - SMS messages
  - Phone numbers
  - SMS templates
  - Scheduled SMS
  - Twilio settings

### Step 4: Frontend Verification
- Test all Twilio-related pages with different company accounts
- Ensure no data leakage between companies

---

## ⚠️ Security Concerns

### Current Risks:
1. **SMS Messages** - May be visible across companies
2. **Phone Numbers** - Fixed, but verify after migration
3. **SMS Templates** - May be shared across companies
4. **Scheduled SMS** - May execute for wrong company
5. **Twilio Settings** - Need to verify isolation

### Mitigation:
- All endpoints MUST filter by `current_user["company_id"]`
- All CREATE operations MUST set `company_id` from current user
- All UPDATE/DELETE operations MUST verify `company_id` match

---

## 📝 Testing Checklist

- [ ] Run database migration
- [ ] Restart backend service
- [ ] Test phone numbers display for each company
- [ ] Test SMS sending (verify company_id is set)
- [ ] Test SMS templates (verify isolation)
- [ ] Test scheduled SMS (verify isolation)
- [ ] Test Twilio settings (verify isolation)
- [ ] Test with multiple company accounts
- [ ] Verify no cross-company data access

---

## 🔄 Next Actions

1. **IMMEDIATE**: Run database migration
2. **HIGH PRIORITY**: Update all SMS API endpoints with `company_id` filtering
3. **MEDIUM PRIORITY**: Update frontend pages to handle multi-tenancy
4. **LOW PRIORITY**: Add audit logging for Twilio operations

---

## 📞 Support

If issues arise:
1. Check backend logs: `sudo journalctl -u crm-backend -n 100 --no-pager`
2. Verify database: `sudo -u postgres psql -d sales_crm`
3. Test API endpoints with curl/Postman
4. Check frontend console for errors
