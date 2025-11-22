# 🔔 Notification System - Deployment Guide

## ✅ What's Been Implemented (Part 1 & 2)

### **Core System**
- ✅ **NotificationService** - Centralized service for all notifications
- ✅ **Permission-based routing** - Notifications go to the right people
- ✅ **Multi-tenant safe** - Company-scoped notifications
- ✅ **Non-blocking** - Won't fail main operations

---

## 📦 Completed Notification Modules

### 1. **Deal Notifications** ✅
**File:** `backend/app/api/deals.py`

**Implemented:**
- Deal Created → Notifies Admins & Managers
- Deal Updated → Notifies Admins & Managers with changes
- Deal Stage Changed → Notifies Admins & Managers with old/new stage

**Recipients:**
- Super Admins (if in same company)
- Company Admins
- Sales Managers
- Excludes: Deal creator

**Example Notification:**
```
Title: "New Deal Created"
Message: "John Doe created a new deal: Enterprise Software ($50,000.00)"
Link: "/deals/abc-123"
```

---

### 2. **Contact Notifications** ✅
**File:** `backend/app/api/contacts.py`

**Implemented:**
- Contact Created → Notifies Company Admins

**Recipients:**
- Super Admins (if in same company)
- Company Admins
- Excludes: Contact creator

**Example Notification:**
```
Title: "New Contact Created"
Message: "Jane Smith created a new contact: Michael Johnson"
Link: "/contacts/def-456"
```

---

### 3. **Activity Notifications** ✅
**File:** `backend/app/api/activities.py`

**Implemented:**
- Email Sent → Notifies Company Admins
- SMS Sent → Notifies Company Admins
- Call Made → Notifies Company Admins (with duration)
- Meeting Created → Notifies Company Admins
- Task Created → Notifies Company Admins

**Smart Routing:**
- Email activities → `notify_email_sent()`
- Call activities → `notify_call_made()`
- Other activities → `notify_activity_created()`

**Recipients:**
- Super Admins (if in same company)
- Company Admins
- Excludes: Activity creator

**Example Notifications:**
```
Title: "Email Sent"
Message: "John Doe sent an email to client@example.com: Follow-up Meeting"

Title: "Call Made"
Message: "Jane Smith made a call to +1234567890 (300s)"

Title: "New Meeting Activity"
Message: "Bob Johnson created a new meeting: Quarterly Review"
```

---

### 4. **User Management Notifications** ✅
**File:** `backend/app/api/admin_users.py`

**Implemented:**
- User Created → Notifies Company Admins
- User Role Changed → Notifies Company Admins + Affected User

**Recipients:**
- Company Admins (for user creation)
- Company Admins + Affected User (for role changes)
- Excludes: Admin who made the change

**Example Notifications:**
```
Title: "New User Created"
Message: "Admin created a new user: Sarah Wilson (sales_rep)"
Link: "/users/ghi-789"

Title: "User Role Changed"
Message: "Admin changed John Doe's role from sales_rep to sales_manager"
Link: "/users/abc-123"

Title: "Your Role Has Been Changed" (to affected user)
Message: "Your role has been changed from sales_rep to sales_manager by Admin"
```

---

## 🚧 Still Pending (Part 3)

### 5. **Pipeline Notifications**
- Pipeline Created
- Pipeline Stage Added/Modified

### 6. **Quote Notifications**
- Quote Created
- Quote Sent
- Quote Accepted/Rejected

### 7. **Workflow Notifications**
- Workflow Created
- Workflow Activated/Deactivated

### 8. **Template Notifications**
- Email Template Created
- SMS Template Created

### 9. **File Upload Notifications**
- File Uploaded to Deal/Contact

### 10. **Support Ticket Notifications**
- Support Ticket Created (priority-based)

### 11. **Custom Field Notifications**
- Custom Field Added

### 12. **Company Notifications**
- Company Created (notify all super admins)

---

## 🎯 Notification Flow

### **When a Deal is Created:**
```
1. Sales Rep creates a deal
2. Deal saved to database
3. NotificationService.notify_deal_created() called
4. Service queries for admins & managers in company
5. Excludes the Sales Rep (creator)
6. Creates notification for each recipient
7. Notifications appear in their notification panel
```

### **When a User Role Changes:**
```
1. Super Admin changes user role
2. Role updated in database
3. NotificationService.notify_user_role_changed() called
4. Service queries for company admins
5. Creates notification for admins
6. Creates special notification for affected user
7. Both see notifications in their panels
```

---

## 🚀 Deployment Instructions

### **Step 1: Pull Latest Code**
```bash
cd /var/www/crm-app
git pull origin main
```

### **Step 2: Restart Backend**
```bash
sudo systemctl restart crm-backend
```

### **Step 3: Verify Service is Running**
```bash
sudo systemctl status crm-backend
```

### **Step 4: Check Logs**
```bash
sudo journalctl -u crm-backend -f
```

---

## 🧪 Testing Checklist

### **Deal Notifications:**
- [ ] Login as Sales Rep
- [ ] Create a new deal
- [ ] Login as Company Admin
- [ ] Check notifications - should see "New Deal Created"
- [ ] Sales Rep should NOT see their own notification

### **Contact Notifications:**
- [ ] Login as Sales Rep
- [ ] Create a new contact
- [ ] Login as Company Admin
- [ ] Check notifications - should see "New Contact Created"

### **Activity Notifications:**
- [ ] Login as Sales Rep
- [ ] Create an email activity
- [ ] Login as Company Admin
- [ ] Check notifications - should see "Email Sent"
- [ ] Repeat for call, meeting, task

### **User Management:**
- [ ] Login as Super Admin
- [ ] Create a new user
- [ ] Login as Company Admin
- [ ] Check notifications - should see "New User Created"
- [ ] Change a user's role
- [ ] Check Company Admin sees "User Role Changed"
- [ ] Check affected user sees "Your Role Has Been Changed"

---

## 📊 Current Implementation Status

**Progress:** 60% Complete (6/12 modules)

**Completed Modules:**
1. ✅ NotificationService (Core)
2. ✅ Deal Notifications
3. ✅ Contact Notifications
4. ✅ Activity Notifications
5. ✅ User Management Notifications
6. ✅ Documentation

**Pending Modules:**
7. 🚧 Pipeline Notifications
8. 🚧 Quote Notifications
9. 🚧 Workflow Notifications
10. 🚧 Template Notifications
11. 🚧 File Upload Notifications
12. 🚧 Support Ticket Notifications

---

## 🔧 Technical Details

### **Service Location:**
`backend/app/services/notification_service.py`

### **Key Methods:**
- `notify_deal_created()`
- `notify_deal_updated()`
- `notify_deal_stage_changed()`
- `notify_contact_created()`
- `notify_activity_created()`
- `notify_email_sent()`
- `notify_sms_sent()`
- `notify_call_made()`
- `notify_user_created()`
- `notify_user_role_changed()`

### **Helper Methods:**
- `_get_admins_and_managers()` - Get admins & managers
- `_get_company_admins()` - Get company admins only
- `_get_super_admins()` - Get all super admins
- `_create_notification()` - Create single notification

### **Database Model:**
`backend/app/models/notifications.py`

**Fields:**
- `title` - Notification title
- `message` - Notification message
- `type` - info, success, warning, error
- `read` - Read status
- `link` - Optional link to entity
- `extra_data` - JSON for additional info
- `user_id` - Recipient
- `company_id` - Company scope

---

## 🎨 Frontend Integration

**No frontend changes needed!** The existing notification system automatically displays these notifications.

**Notification Panel:**
- Bell icon in header
- Shows unread count
- Displays all notifications
- Click to mark as read
- Click notification to navigate to entity

---

## 📝 API Endpoints (Already Exist)

- `GET /api/notifications/` - Get user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `POST /api/notifications/{id}/mark-read` - Mark as read
- `POST /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/{id}` - Delete notification

---

## ⚠️ Important Notes

1. **Non-Blocking:** Notifications never fail the main operation
2. **Self-Exclusion:** Users don't see notifications for their own actions
3. **Company-Scoped:** Notifications respect multi-tenancy
4. **Permission-Based:** Only authorized users receive notifications
5. **Error Handling:** Notification failures are logged but don't break functionality

---

## 🐛 Troubleshooting

### **Notifications Not Appearing:**
1. Check backend logs: `sudo journalctl -u crm-backend -f`
2. Verify user has correct company_id
3. Check notification table in database
4. Ensure user is in correct role (admin/manager)

### **Too Many Notifications:**
- This is expected for admins (they see all company activity)
- Users can mark all as read or delete notifications

### **Missing Notifications:**
- Verify the action was completed successfully
- Check if user is excluded (creator of action)
- Verify user role has permission to receive notifications

---

## 📈 Next Steps (Part 3)

1. Add pipeline notifications
2. Add quote notifications
3. Add workflow notifications
4. Add template notifications
5. Add file upload notifications
6. Add support ticket notifications
7. Add custom field notifications
8. Add company creation notifications
9. Full system testing
10. Final deployment

---

## 🎉 Benefits

### **For Company Admins:**
- Stay informed about all company activities
- Monitor team performance
- Track important changes
- Quick access to entities via notification links

### **For Sales Managers:**
- Monitor team activities
- Track deal progress
- Stay updated on team performance

### **For Users:**
- Get notified about role changes
- Stay informed about assignments
- Track important updates

---

**Last Updated:** November 22, 2025  
**Status:** Part 1 & 2 Deployed ✅  
**Next:** Part 3 - Remaining Modules 🚧
