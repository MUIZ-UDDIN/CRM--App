# 🧪 Complete Multi-Tenancy Testing Guide

## Overview
This guide provides comprehensive testing procedures for verifying multi-tenancy isolation across the entire CRM application.

---

## 📋 **Test Checklist**

- [ ] Database isolation verified
- [ ] Backend API isolation verified
- [ ] Frontend data isolation verified
- [ ] Cross-company access blocked
- [ ] User permissions working
- [ ] Data creation assigns correct company_id
- [ ] No NULL company_id records

---

## 🗄️ **PART 1: Database Testing**

### **Run Automated Database Test**

```bash
cd /var/www/crm-app/backend
sudo -u postgres psql sales_crm -f test_multi_tenancy.sql
```

This will check:
- ✅ Company setup
- ✅ User distribution
- ✅ Data distribution by company
- ✅ NULL company_id records
- ✅ Cross-company data leaks
- ✅ Specific user access

### **Manual Database Verification**

```bash
sudo -u postgres psql sales_crm
```

#### **Test 1: Verify All Users Have Company**
```sql
-- Should return 0
SELECT COUNT(*) as users_without_company 
FROM users 
WHERE company_id IS NULL;
```
**Expected**: `0` (all users have company)

#### **Test 2: Verify Data Isolation**
```sql
-- Check if Company A can see Company B's data
SELECT 
    c1.name as company_a,
    c2.name as company_b,
    COUNT(s.id) as leaked_sms
FROM companies c1
CROSS JOIN companies c2
LEFT JOIN sms_messages s ON s.company_id = c2.id
WHERE c1.id != c2.id
  AND s.user_id IN (SELECT id FROM users WHERE company_id = c1.id)
GROUP BY c1.name, c2.name
HAVING COUNT(s.id) > 0;
```
**Expected**: `0 rows` (no cross-company leaks)

#### **Test 3: Check NULL company_id Records**
```sql
-- Should return 0 for all tables
SELECT 
    'sms_messages' as table_name, 
    COUNT(*) as null_count 
FROM sms_messages 
WHERE company_id IS NULL
UNION ALL
SELECT 'calls', COUNT(*) FROM calls WHERE company_id IS NULL
UNION ALL
SELECT 'contacts', COUNT(*) FROM contacts WHERE company_id IS NULL
UNION ALL
SELECT 'deals', COUNT(*) FROM deals WHERE company_id IS NULL
UNION ALL
SELECT 'emails', COUNT(*) FROM emails WHERE company_id IS NULL;
```
**Expected**: All counts should be `0` or very low (old data with backward compatibility)

---

## 🔧 **PART 2: Backend API Testing**

### **Setup Test Environment**

Create two test users in different companies:

```sql
-- Connect to database
sudo -u postgres psql sales_crm

-- Get or create two companies
SELECT id, name FROM companies LIMIT 2;

-- Note the two company IDs, then create test users
-- (Or use existing users from different companies)
```

### **API Test Script**

Create a test file:

```bash
cd /var/www/crm-app/backend
nano test_api_isolation.sh
```

```bash
#!/bin/bash

# Multi-Tenancy API Test Script
# Tests that users can only access their company's data

API_URL="http://localhost:8000"

echo "=============================================="
echo "Multi-Tenancy API Isolation Test"
echo "=============================================="
echo ""

# Test User 1 (Company A)
echo "Testing User 1 (Company A)..."
USER1_EMAIL="admin@sunstonecrm.com"
USER1_PASSWORD="your_password"

# Login User 1
echo "1. Logging in User 1..."
USER1_TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER1_EMAIL\",\"password\":\"$USER1_PASSWORD\"}" \
  | jq -r '.access_token')

if [ "$USER1_TOKEN" == "null" ] || [ -z "$USER1_TOKEN" ]; then
    echo "❌ User 1 login failed"
    exit 1
fi
echo "✅ User 1 logged in"

# Get User 1's data
echo "2. Fetching User 1's SMS messages..."
USER1_SMS=$(curl -s -X GET "$API_URL/api/sms/messages" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  | jq '. | length')
echo "   User 1 SMS count: $USER1_SMS"

echo "3. Fetching User 1's calls..."
USER1_CALLS=$(curl -s -X GET "$API_URL/api/calls/" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  | jq '. | length')
echo "   User 1 Calls count: $USER1_CALLS"

echo "4. Fetching User 1's contacts..."
USER1_CONTACTS=$(curl -s -X GET "$API_URL/api/contacts/" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  | jq '. | length')
echo "   User 1 Contacts count: $USER1_CONTACTS"

echo ""
echo "=============================================="
echo "Test User 2 (Company B)..."
echo "=============================================="

# Test User 2 (Company B)
USER2_EMAIL="misbahaly005@gmail.com"
USER2_PASSWORD="your_password"

# Login User 2
echo "1. Logging in User 2..."
USER2_TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER2_EMAIL\",\"password\":\"$USER2_PASSWORD\"}" \
  | jq -r '.access_token')

if [ "$USER2_TOKEN" == "null" ] || [ -z "$USER2_TOKEN" ]; then
    echo "❌ User 2 login failed"
    exit 1
fi
echo "✅ User 2 logged in"

# Get User 2's data
echo "2. Fetching User 2's SMS messages..."
USER2_SMS=$(curl -s -X GET "$API_URL/api/sms/messages" \
  -H "Authorization: Bearer $USER2_TOKEN" \
  | jq '. | length')
echo "   User 2 SMS count: $USER2_SMS"

echo "3. Fetching User 2's calls..."
USER2_CALLS=$(curl -s -X GET "$API_URL/api/calls/" \
  -H "Authorization: Bearer $USER2_TOKEN" \
  | jq '. | length')
echo "   User 2 Calls count: $USER2_CALLS"

echo "4. Fetching User 2's contacts..."
USER2_CONTACTS=$(curl -s -X GET "$API_URL/api/contacts/" \
  -H "Authorization: Bearer $USER2_TOKEN" \
  | jq '. | length')
echo "   User 2 Contacts count: $USER2_CONTACTS"

echo ""
echo "=============================================="
echo "RESULTS"
echo "=============================================="
echo "User 1 (Company A): $USER1_SMS SMS, $USER1_CALLS Calls, $USER1_CONTACTS Contacts"
echo "User 2 (Company B): $USER2_SMS SMS, $USER2_CALLS Calls, $USER2_CONTACTS Contacts"
echo ""
echo "✅ Multi-tenancy is working if:"
echo "   - Both users can access their own data"
echo "   - Data counts are different (unless both companies have same amount)"
echo "   - No errors occurred"
echo "=============================================="
```

Make it executable and run:

```bash
chmod +x test_api_isolation.sh
./test_api_isolation.sh
```

### **Manual API Testing**

#### **Test All Major Endpoints**

```bash
# Get your auth token first
TOKEN="your_jwt_token_here"

# Test SMS API
curl -X GET "http://localhost:8000/api/sms/messages" \
  -H "Authorization: Bearer $TOKEN"

# Test Calls API
curl -X GET "http://localhost:8000/api/calls/" \
  -H "Authorization: Bearer $TOKEN"

# Test Contacts API
curl -X GET "http://localhost:8000/api/contacts/" \
  -H "Authorization: Bearer $TOKEN"

# Test Deals API
curl -X GET "http://localhost:8000/api/deals/" \
  -H "Authorization: Bearer $TOKEN"

# Test Emails API
curl -X GET "http://localhost:8000/api/emails/" \
  -H "Authorization: Bearer $TOKEN"

# Test Files API
curl -X GET "http://localhost:8000/api/files/" \
  -H "Authorization: Bearer $TOKEN"

# Test Workflows API
curl -X GET "http://localhost:8000/api/workflows/" \
  -H "Authorization: Bearer $TOKEN"

# Test Quotes API
curl -X GET "http://localhost:8000/api/quotes/" \
  -H "Authorization: Bearer $TOKEN"

# Test Bulk Email Campaigns API
curl -X GET "http://localhost:8000/api/bulk-email-campaigns/" \
  -H "Authorization: Bearer $TOKEN"

# Test Conversations API
curl -X GET "http://localhost:8000/api/conversations/" \
  -H "Authorization: Bearer $TOKEN"

# Test Inbox API
curl -X GET "http://localhost:8000/api/inbox/" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: All should return 200 OK with only the user's company data

---

## 🎨 **PART 3: Frontend Testing**

### **Manual Frontend Test Procedure**

#### **Setup: Create Test Data**

1. **Login as User A** (Company A)
   - Create 2 contacts
   - Send 1 SMS
   - Make 1 call
   - Create 1 deal
   - Note down the names/numbers

2. **Login as User B** (Company B)
   - Create 2 different contacts
   - Send 1 SMS (different number)
   - Make 1 call (different number)
   - Create 1 deal (different name)
   - Note down the names/numbers

#### **Test: Verify Data Isolation**

1. **Login as User A**
   - ✅ Can see User A's 2 contacts
   - ✅ Can see User A's SMS
   - ✅ Can see User A's call
   - ✅ Can see User A's deal
   - ❌ CANNOT see User B's contacts
   - ❌ CANNOT see User B's SMS
   - ❌ CANNOT see User B's call
   - ❌ CANNOT see User B's deal

2. **Login as User B**
   - ✅ Can see User B's 2 contacts
   - ✅ Can see User B's SMS
   - ✅ Can see User B's call
   - ✅ Can see User B's deal
   - ❌ CANNOT see User A's contacts
   - ❌ CANNOT see User A's SMS
   - ❌ CANNOT see User A's call
   - ❌ CANNOT see User A's deal

#### **Pages to Test**

- [ ] Dashboard (analytics should be company-specific)
- [ ] Contacts page
- [ ] Deals page
- [ ] SMS page
- [ ] Calls page
- [ ] Emails page
- [ ] Files/Documents page
- [ ] Quotes page
- [ ] Workflows page
- [ ] Bulk Email Campaigns page
- [ ] Conversations page
- [ ] Inbox page
- [ ] Analytics page

#### **Browser Developer Tools Check**

1. Open Developer Tools (F12)
2. Go to Network tab
3. Navigate to any page (e.g., Contacts)
4. Check the API response
5. Verify `company_id` in the data matches your user's company

---

## 🔒 **PART 4: Security Testing**

### **Test 1: Direct API Access with Wrong Company**

Try to access another company's data directly:

```bash
# Get a record ID from Company B
COMPANY_B_CONTACT_ID="some-uuid-from-company-b"

# Try to access it with Company A's token
curl -X GET "http://localhost:8000/api/contacts/$COMPANY_B_CONTACT_ID" \
  -H "Authorization: Bearer $COMPANY_A_TOKEN"
```

**Expected**: 404 Not Found or 403 Forbidden

### **Test 2: Create Data Without Company**

Try to create data without company_id (should auto-assign):

```bash
# Create contact
curl -X POST "http://localhost:8000/api/contacts/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com"
  }'
```

**Expected**: Contact created with automatic company_id assignment

### **Test 3: Modify Company ID**

Try to change a record's company_id via API:

```bash
# Try to update contact with different company_id
curl -X PUT "http://localhost:8000/api/contacts/$CONTACT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "different-company-uuid",
    "first_name": "Test"
  }'
```

**Expected**: Should ignore company_id change or return error

---

## 📊 **Test Results Template**

```
============================================
MULTI-TENANCY TEST RESULTS
============================================
Date: [DATE]
Tester: [NAME]

DATABASE TESTS:
[ ] All users have company_id
[ ] No NULL company_id in critical tables
[ ] No cross-company data leaks
[ ] Data properly distributed by company

BACKEND API TESTS:
[ ] SMS API - Company isolated
[ ] Calls API - Company isolated
[ ] Contacts API - Company isolated
[ ] Deals API - Company isolated
[ ] Emails API - Company isolated
[ ] Files API - Company isolated
[ ] Workflows API - Company isolated
[ ] Quotes API - Company isolated
[ ] Campaigns API - Company isolated
[ ] Conversations API - Company isolated
[ ] Inbox API - Company isolated

FRONTEND TESTS:
[ ] User A cannot see User B's data
[ ] User B cannot see User A's data
[ ] All pages show correct company data
[ ] Analytics are company-specific
[ ] Search is company-scoped

SECURITY TESTS:
[ ] Cannot access other company's data via API
[ ] Cannot modify company_id via API
[ ] New data auto-assigns company_id
[ ] JWT token contains correct company_id

OVERALL STATUS: [PASS/FAIL]

ISSUES FOUND:
1. [Issue description]
2. [Issue description]

============================================
```

---

## 🚨 **Common Issues & Fixes**

### **Issue: Users without company_id**
```sql
-- Fix: Assign users to default company
UPDATE users 
SET company_id = (SELECT id FROM companies LIMIT 1)
WHERE company_id IS NULL;
```

### **Issue: Data without company_id**
```sql
-- Fix: Assign data to user's company
UPDATE sms_messages 
SET company_id = (SELECT company_id FROM users WHERE users.id = sms_messages.user_id)
WHERE company_id IS NULL;
```

### **Issue: Cross-company data visible**
- Check API filters include `company_id`
- Verify JWT token has correct `company_id`
- Check frontend isn't caching old data

---

## ✅ **Success Criteria**

Multi-tenancy is working correctly if:

1. ✅ All users have a `company_id`
2. ✅ All data has a `company_id`
3. ✅ Users can only see their company's data
4. ✅ Users cannot access other companies' data
5. ✅ New data automatically gets `company_id`
6. ✅ No NULL `company_id` in new records
7. ✅ Analytics are company-specific
8. ✅ Search is company-scoped
9. ✅ All 15+ APIs enforce company filtering
10. ✅ Frontend displays only company data

---

## 📞 **Support**

If any tests fail:
1. Check the logs: `sudo journalctl -u crm-backend -f`
2. Verify database state with SQL queries
3. Check API responses in browser DevTools
4. Review the Multi-Tenancy Audit document

---

**Last Updated**: November 4, 2025  
**Version**: 2.0 (Multi-Tenant Complete)
