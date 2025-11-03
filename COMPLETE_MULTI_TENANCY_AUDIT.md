# Complete Multi-Tenancy Audit - CRM Application
## Date: November 4, 2025

---

## 📊 Database Models Status

### ✅ Models WITH `company_id` (Already Configured)
1. **Users** - `company_id` ✅
2. **TwilioSettings** - `company_id` (unique) ✅
3. **PhoneNumber** - `company_id` ✅
4. **SMSMessage** - `company_id` ✅
5. **ScheduledSMS** - `company_id` ✅
6. **SMSTemplate** - `company_id` ✅
7. **PaymentHistory** - `company_id` ✅
8. **Pipeline** - `company_id` ✅
9. **Deal** - `company_id` ✅
10. **Contact** - `company_id` ✅
11. **Activity** - `company_id` ✅

### ⚠️ Models MISSING `company_id` (Need Update)

#### **HIGH PRIORITY** (Data Leakage Risk)
1. **Call** (`calls.py`) - Voice calls need company isolation
2. **Email** (`emails.py`) - Emails need company isolation
3. **EmailTemplate** (`emails.py`) - Templates should be per company
4. **EmailCampaign** (`emails.py`) - Campaigns should be per company
5. **Document** (`documents.py`) - Documents need company isolation
6. **DocumentSignature** (`documents.py`) - Signatures linked to documents
7. **Quote** (`quotes.py`) - Quotes need company isolation
8. **Workflow** (`workflows.py`) - Workflows should be per company
9. **WorkflowExecution** (`workflows.py`) - Executions linked to workflows
10. **File** (`files.py`) - Files need company isolation
11. **Folder** (`folders.py`) - Folders need company isolation

#### **MEDIUM PRIORITY** (User-specific, but should have company_id)
12. **Notification** (`notifications.py`) - User notifications (via user.company_id)
13. **CallTranscript** (`call_transcripts.py`) - Linked to calls
14. **UserConversation** (`conversations.py`) - SMS/Call conversations
15. **BulkEmailCampaign** (`email_campaigns.py`) - Bulk email campaigns
16. **BulkEmailAnalytics** (`email_campaigns.py`) - Campaign analytics
17. **PerformanceAlert** (`performance_alerts.py`) - Performance tracking
18. **Inbox** (`inbox.py`) - Unified inbox

#### **LOW PRIORITY** (System-wide or already isolated)
19. **AuditLog** (`security.py`) - System-wide audit (has user_id)
20. **SecurityLog** (`security.py`) - System-wide security
21. **Session** (`security.py`) - User sessions (via user.company_id)

---

## 🗄️ Database Migration Script

### Priority 1: Critical Tables (Immediate)

```sql
-- Add company_id to critical tables
-- Run this FIRST

-- 1. Calls table
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_calls_company_id ON calls(company_id);
UPDATE calls c SET company_id = u.company_id FROM users u WHERE c.user_id = u.id AND c.company_id IS NULL;

-- 2. Emails table
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_emails_company_id ON emails(company_id);
UPDATE emails e SET company_id = u.company_id FROM users u WHERE e.owner_id = u.id AND e.company_id IS NULL;

-- 3. Email Templates table
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_email_templates_company_id ON email_templates(company_id);
-- Note: Email templates might be system-wide or per-company, decide based on requirements

-- 4. Email Campaigns table
ALTER TABLE email_campaigns 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_company_id ON email_campaigns(company_id);

-- 5. Documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
UPDATE documents d SET company_id = u.company_id FROM users u WHERE d.owner_id = u.id AND d.company_id IS NULL;

-- 6. Document Signatures table
ALTER TABLE document_signatures 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_company_id ON document_signatures(company_id);
UPDATE document_signatures ds SET company_id = d.company_id FROM documents d WHERE ds.document_id = d.id AND ds.company_id IS NULL;

-- 7. Quotes table
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON quotes(company_id);
UPDATE quotes q SET company_id = u.company_id FROM users u WHERE q.owner_id = u.id AND q.company_id IS NULL;

-- 8. Workflows table
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_workflows_company_id ON workflows(company_id);
UPDATE workflows w SET company_id = u.company_id FROM users u WHERE w.owner_id = u.id AND w.company_id IS NULL;

-- 9. Workflow Executions table
ALTER TABLE workflow_executions 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_company_id ON workflow_executions(company_id);
UPDATE workflow_executions we SET company_id = w.company_id FROM workflows w WHERE we.workflow_id = w.id AND we.company_id IS NULL;

-- 10. Files table
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_files_company_id ON files(company_id);
UPDATE files f SET company_id = u.company_id FROM users u WHERE f.owner_id = u.id AND f.company_id IS NULL;

-- 11. Folders table
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_folders_company_id ON folders(company_id);
UPDATE folders f SET company_id = u.company_id FROM users u WHERE f.owner_id = u.id AND f.company_id IS NULL;

-- Verify all tables
SELECT 
    'calls' as table_name, 
    COUNT(*) as total, 
    COUNT(company_id) as with_company_id,
    COUNT(*) - COUNT(company_id) as missing_company_id
FROM calls
UNION ALL
SELECT 'emails', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM emails
UNION ALL
SELECT 'documents', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM documents
UNION ALL
SELECT 'quotes', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM quotes
UNION ALL
SELECT 'workflows', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM workflows
UNION ALL
SELECT 'files', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM files
UNION ALL
SELECT 'folders', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM folders;
```

---

## 🔧 API Endpoints Audit

### Files to Update:

#### **Priority 1: Critical Endpoints**
1. **`backend/app/api/calls.py`** - All call endpoints
2. **`backend/app/api/emails.py`** - All email endpoints
3. **`backend/app/api/documents.py`** - All document endpoints
4. **`backend/app/api/quotes.py`** - All quote endpoints
5. **`backend/app/api/workflows.py`** - All workflow endpoints
6. **`backend/app/api/files.py`** - All file endpoints

#### **Priority 2: SMS/Twilio Endpoints** (Partially Done)
7. **`backend/app/api/sms_enhanced.py`** - ⚠️ Needs company_id filtering
8. **`backend/app/api/sms.py`** - ⚠️ Needs company_id filtering
9. **`backend/app/api/twilio_settings.py`** - ⚠️ Verify company_id filtering
10. **`backend/app/api/twilio_sync.py`** - ⚠️ Needs company_id when syncing

#### **Priority 3: Other Endpoints**
11. **`backend/app/api/notifications.py`** - Filter by user's company
12. **`backend/app/api/analytics.py`** - Filter analytics by company
13. **`backend/app/api/activities.py`** - Already has company_id, verify filtering

---

## 📝 Required Changes Pattern

### For Each Endpoint:

#### **GET (List) Endpoints:**
```python
# BEFORE
query = db.query(Model).filter(Model.user_id == user_id)

# AFTER
company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
if not company_id:
    raise HTTPException(status_code=403, detail="No company associated")
query = db.query(Model).filter(Model.company_id == company_id)
```

#### **POST (Create) Endpoints:**
```python
# BEFORE
new_record = Model(
    user_id=user_id,
    # ... other fields
)

# AFTER
company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
new_record = Model(
    user_id=user_id,
    company_id=company_id,
    # ... other fields
)
```

#### **PUT/DELETE (Update/Delete) Endpoints:**
```python
# BEFORE
record = db.query(Model).filter(Model.id == record_id).first()

# AFTER
company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
record = db.query(Model).filter(
    and_(
        Model.id == record_id,
        Model.company_id == company_id
    )
).first()
```

---

## 🎯 Implementation Plan

### Phase 1: Database (IMMEDIATE - Day 1)
- [ ] Run migration script for all critical tables
- [ ] Verify all records have company_id populated
- [ ] Update all model files with company_id column

### Phase 2: API Endpoints (HIGH PRIORITY - Day 1-2)
- [ ] Update calls.py endpoints
- [ ] Update emails.py endpoints
- [ ] Update documents.py endpoints
- [ ] Update quotes.py endpoints
- [ ] Update workflows.py endpoints
- [ ] Update files.py endpoints
- [ ] Complete sms_enhanced.py endpoints
- [ ] Complete sms.py endpoints

### Phase 3: Testing (Day 2-3)
- [ ] Test with multiple companies
- [ ] Verify no data leakage
- [ ] Test all CRUD operations
- [ ] Test edge cases (super admin, no company, etc.)

### Phase 4: Frontend (Day 3-4)
- [ ] Verify all pages respect multi-tenancy
- [ ] Add company switcher (if needed)
- [ ] Update UI to show company-specific data

---

## ⚠️ Critical Security Checks

### Before Deployment:
1. **Test Data Isolation** - Company A cannot see Company B's data
2. **Test Super Admin** - Can see all companies or specific company
3. **Test Company Admin** - Can see only their company
4. **Test Regular User** - Can see only their company
5. **Test API Endpoints** - All return only company-specific data
6. **Test Frontend Pages** - All show only company-specific data

---

## 📋 Testing Checklist

### For Each Resource Type:
- [ ] Create resource in Company A
- [ ] Login as Company B user
- [ ] Verify Company B cannot see Company A's resource
- [ ] Verify Company B cannot edit Company A's resource
- [ ] Verify Company B cannot delete Company A's resource
- [ ] Test with API calls (Postman/curl)
- [ ] Test with Frontend UI

### Resources to Test:
- [ ] Calls
- [ ] Emails
- [ ] Documents
- [ ] Quotes
- [ ] Workflows
- [ ] Files
- [ ] SMS Messages
- [ ] Phone Numbers
- [ ] Contacts
- [ ] Deals
- [ ] Activities

---

## 🚀 Deployment Steps

1. **Backup Database** - CRITICAL!
2. **Run Migration Script** - Add company_id columns
3. **Deploy Backend** - Updated models and endpoints
4. **Test Thoroughly** - Multi-tenancy isolation
5. **Deploy Frontend** - If needed
6. **Monitor Logs** - Check for errors
7. **Verify Production** - Test with real data

---

## 📞 Rollback Plan

If issues arise:
1. **Database Rollback** - Restore from backup
2. **Code Rollback** - Revert to previous commit
3. **Verify System** - Ensure everything works
4. **Investigate Issue** - Fix and redeploy

---

## 📊 Progress Tracking

- ✅ **Models Updated**: 11/30 (37%)
- ⚠️ **Models Pending**: 19/30 (63%)
- ✅ **Migration Scripts**: SMS tables done
- ⚠️ **Migration Scripts Pending**: 11 critical tables
- ⚠️ **API Endpoints**: Partial (phone numbers done)
- ⚠️ **Frontend Pages**: Not verified
- ⚠️ **Testing**: Not started

---

## 🎯 Next Immediate Actions

1. **NOW**: Update all model files with company_id
2. **NOW**: Create comprehensive migration script
3. **TODAY**: Run migration on database
4. **TODAY**: Update critical API endpoints (calls, emails, documents)
5. **TOMORROW**: Complete remaining endpoints
6. **TOMORROW**: Test multi-tenancy thoroughly
