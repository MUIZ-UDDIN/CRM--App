# 📊 Dashboard Widgets & Permissions Documentation

**Date:** November 21, 2025  
**Feature:** Recent Activities, Upcoming Activities, and Pipeline Stages

---

## 🎯 **NEW WIDGETS ADDED**

### 1. **Recent Activities Widget** 📅
Shows the last 5 completed activities across the system

**Display:**
- Activity title
- User who performed it
- Date created
- Activity type (call, email, meeting, etc.)

---

### 2. **Upcoming Activities Widget** ⏰
Shows the next 5 scheduled activities with future due dates

**Display:**
- Activity title
- Assigned user
- Due date
- Activity status

---

### 3. **Pipeline Stages Progress Widget** 📈
Shows deal distribution across all pipeline stages with progress bars

**Display:**
- Stage name (Lead, Qualified, Proposal, etc.)
- Number of deals in each stage
- Percentage of total deals
- Visual progress bar

---

## 🔒 **PERMISSIONS BY ROLE**

### **1. SUPER ADMIN (SaaS Owner)**

#### **Recent Activities:**
- ✅ **Can see:** ALL activities from ALL companies
- ✅ **Scope:** Platform-wide
- ✅ **Filter:** No company filter applied
- ✅ **Permission:** `Permission.VIEW_ALL_ANALYTICS`

**Example:**
```
- Sales call with Acme Corp (John Doe - Company A)
- Follow-up email to XYZ Inc (Jane Smith - Company B)
- Product demo for ABC Ltd (Mike Johnson - Company C)
```

#### **Upcoming Activities:**
- ✅ **Can see:** ALL upcoming activities from ALL companies
- ✅ **Scope:** Platform-wide
- ✅ **Filter:** No company filter applied
- ✅ **Permission:** `Permission.VIEW_ALL_ANALYTICS`

**Example:**
```
- Meeting with Acme Corp (Due: Tomorrow - Company A)
- Demo for XYZ Inc (Due: Next Week - Company B)
- Call with ABC Ltd (Due: Friday - Company C)
```

#### **Pipeline Stages:**
- ✅ **Can see:** ALL deals from ALL companies across ALL pipeline stages
- ✅ **Scope:** Platform-wide aggregation
- ✅ **Filter:** No company filter applied
- ✅ **Permission:** `Permission.VIEW_ALL_ANALYTICS`

**Example:**
```
Lead: 120 deals (35% of total) - All companies combined
Qualified: 80 deals (23% of total) - All companies combined
Proposal: 60 deals (17% of total) - All companies combined
```

---

### **2. COMPANY ADMIN**

#### **Recent Activities:**
- ✅ **Can see:** Activities from THEIR COMPANY ONLY
- ✅ **Scope:** Company-wide
- ✅ **Filter:** `activity.company_id == current_user.company_id`
- ✅ **Permission:** `Permission.VIEW_COMPANY_ANALYTICS`

**Example (Company A Admin):**
```
- Sales call with Client X (John Doe - Company A)
- Follow-up email to Client Y (Jane Smith - Company A)
- Product demo for Client Z (Mike Johnson - Company A)
```
❌ **Cannot see:** Activities from Company B or Company C

#### **Upcoming Activities:**
- ✅ **Can see:** Upcoming activities from THEIR COMPANY ONLY
- ✅ **Scope:** Company-wide
- ✅ **Filter:** `activity.company_id == current_user.company_id`
- ✅ **Permission:** `Permission.VIEW_COMPANY_ANALYTICS`

**Example (Company A Admin):**
```
- Meeting with Client X (Due: Tomorrow - Company A)
- Demo for Client Y (Due: Next Week - Company A)
```
❌ **Cannot see:** Upcoming activities from other companies

#### **Pipeline Stages:**
- ✅ **Can see:** Deals from THEIR COMPANY ONLY across all stages
- ✅ **Scope:** Company-wide
- ✅ **Filter:** `pipeline.company_id == current_user.company_id`
- ✅ **Permission:** `Permission.VIEW_COMPANY_ANALYTICS`

**Example (Company A Admin):**
```
Lead: 45 deals (35% of Company A's total)
Qualified: 32 deals (25% of Company A's total)
Proposal: 18 deals (14% of Company A's total)
```
❌ **Cannot see:** Deals from other companies

---

### **3. SALES MANAGER**

#### **Recent Activities:**
- ✅ **Can see:** Activities from THEIR TEAM ONLY
- ✅ **Scope:** Team-only
- ✅ **Filter:** `activity.owner_id IN (team_member_ids)`
- ✅ **Permission:** `Permission.VIEW_TEAM_ANALYTICS`

**Example (Team Alpha Manager):**
```
- Sales call with Client X (John Doe - Team Alpha)
- Follow-up email to Client Y (Jane Smith - Team Alpha)
```
❌ **Cannot see:** Activities from other teams or company-wide

#### **Upcoming Activities:**
- ✅ **Can see:** Upcoming activities from THEIR TEAM ONLY
- ✅ **Scope:** Team-only
- ✅ **Filter:** `activity.owner_id IN (team_member_ids)`
- ✅ **Permission:** `Permission.VIEW_TEAM_ANALYTICS`

**Example (Team Alpha Manager):**
```
- Meeting with Client X (Due: Tomorrow - John Doe, Team Alpha)
- Demo for Client Y (Due: Friday - Jane Smith, Team Alpha)
```
❌ **Cannot see:** Upcoming activities from other teams

#### **Pipeline Stages:**
- ✅ **Can see:** Deals owned by THEIR TEAM MEMBERS ONLY
- ✅ **Scope:** Team-only
- ✅ **Filter:** `deal.owner_id IN (team_member_ids)`
- ✅ **Permission:** `Permission.VIEW_TEAM_ANALYTICS`

**Example (Team Alpha Manager):**
```
Lead: 15 deals (35% of Team Alpha's total)
Qualified: 10 deals (23% of Team Alpha's total)
Proposal: 8 deals (19% of Team Alpha's total)
```
❌ **Cannot see:** Deals owned by other teams

---

### **4. SALES REP (Regular User / Company Employee)**

#### **Recent Activities:**
- ✅ **Can see:** THEIR OWN activities ONLY
- ✅ **Scope:** Personal
- ✅ **Filter:** `activity.owner_id == current_user.id`
- ✅ **Permission:** `Permission.VIEW_OWN_ANALYTICS`

**Example (John Doe - Sales Rep):**
```
- Sales call with Client X (John Doe)
- Follow-up email to Client Y (John Doe)
- Product demo for Client Z (John Doe)
```
❌ **Cannot see:** Activities from other users, even in same team

#### **Upcoming Activities:**
- ✅ **Can see:** THEIR OWN upcoming activities ONLY
- ✅ **Scope:** Personal
- ✅ **Filter:** `activity.owner_id == current_user.id`
- ✅ **Permission:** `Permission.VIEW_OWN_ANALYTICS`

**Example (John Doe - Sales Rep):**
```
- Meeting with Client X (Due: Tomorrow - John Doe)
- Demo for Client Y (Due: Friday - John Doe)
```
❌ **Cannot see:** Upcoming activities of other users

#### **Pipeline Stages:**
- ✅ **Can see:** THEIR OWN deals ONLY across stages
- ✅ **Scope:** Personal
- ✅ **Filter:** `deal.owner_id == current_user.id`
- ✅ **Permission:** `Permission.VIEW_OWN_ANALYTICS`

**Example (John Doe - Sales Rep):**
```
Lead: 5 deals (33% of John's total)
Qualified: 4 deals (27% of John's total)
Proposal: 3 deals (20% of John's total)
```
❌ **Cannot see:** Deals owned by other users

---

## 📋 **BACKEND IMPLEMENTATION**

### **Endpoint:** `GET /api/admin-analytics/dashboard`

**File:** `backend/app/api/admin_analytics.py`

### **Permission Logic:**

```python
# Super Admin - sees ALL data
if user_role == 'super_admin':
    activities_query = db.query(Activity).order_by(Activity.created_at.desc()).limit(5)
    # No company filter

# Company Admin - sees company data
elif has_permission(current_user, Permission.VIEW_COMPANY_ANALYTICS):
    activities_query = activities_query.filter(Activity.company_id == company_id)

# Sales Manager - sees team data
elif has_permission(current_user, Permission.VIEW_TEAM_ANALYTICS):
    team_user_ids = get_team_member_ids(user_team_id)
    activities_query = activities_query.filter(Activity.owner_id.in_(team_user_ids))

# Sales Rep - sees own data
else:
    activities_query = activities_query.filter(Activity.owner_id == user_id)
```

---

## 🎨 **FRONTEND DISPLAY**

### **Location:** Super Admin Dashboard
**File:** `frontend/src/pages/SuperAdminDashboard.tsx`

### **Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Stats Cards (Companies, Users, Deals, etc.)               │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┬──────────────────┬──────────────────────┐
│ Recent           │ Upcoming         │ Pipeline Stages      │
│ Activities       │ Activities       │                      │
│                  │                  │ Lead: ████░░ 35%     │
│ • Call with X    │ • Meeting (Tom)  │ Qualified: ███░░ 23% │
│ • Email to Y     │ • Demo (Jane)    │ Proposal: ██░░░ 17%  │
│ • Demo for Z     │ • Call (Mike)    │ Negotiation: █░░░ 8% │
│                  │                  │ Closed Won: █░░░ 10% │
└──────────────────┴──────────────────┴──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Companies Table                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 **DATA FILTERING EXAMPLES**

### **Scenario 1: Super Admin Views Dashboard**
```
Recent Activities: Shows ALL activities from ALL companies
Upcoming Activities: Shows ALL upcoming activities from ALL companies
Pipeline Stages: Shows ALL deals from ALL companies

Total: 500 deals across 10 companies
- Lead: 175 deals (35%)
- Qualified: 115 deals (23%)
- Proposal: 85 deals (17%)
```

### **Scenario 2: Company Admin (Company A) Views Dashboard**
```
Recent Activities: Shows ONLY Company A activities
Upcoming Activities: Shows ONLY Company A upcoming activities
Pipeline Stages: Shows ONLY Company A deals

Total: 50 deals in Company A
- Lead: 18 deals (36%)
- Qualified: 12 deals (24%)
- Proposal: 8 deals (16%)
```

### **Scenario 3: Sales Manager (Team Alpha) Views Dashboard**
```
Recent Activities: Shows ONLY Team Alpha activities
Upcoming Activities: Shows ONLY Team Alpha upcoming activities
Pipeline Stages: Shows ONLY Team Alpha deals

Total: 15 deals owned by Team Alpha members
- Lead: 5 deals (33%)
- Qualified: 4 deals (27%)
- Proposal: 3 deals (20%)
```

### **Scenario 4: Sales Rep (John Doe) Views Dashboard**
```
Recent Activities: Shows ONLY John's activities
Upcoming Activities: Shows ONLY John's upcoming activities
Pipeline Stages: Shows ONLY John's deals

Total: 8 deals owned by John
- Lead: 3 deals (38%)
- Qualified: 2 deals (25%)
- Proposal: 2 deals (25%)
```

---

## ✅ **SUMMARY**

| Widget | Super Admin | Company Admin | Sales Manager | Sales Rep |
|--------|-------------|---------------|---------------|-----------|
| **Recent Activities** | All companies | Own company | Own team | Own only |
| **Upcoming Activities** | All companies | Own company | Own team | Own only |
| **Pipeline Stages** | All companies | Own company | Own team | Own only |

**Permissions Used:**
- Super Admin: `VIEW_ALL_ANALYTICS`
- Company Admin: `VIEW_COMPANY_ANALYTICS`
- Sales Manager: `VIEW_TEAM_ANALYTICS`
- Sales Rep: `VIEW_OWN_ANALYTICS`

---

## 🎯 **KEY FEATURES**

1. ✅ **Role-Based Filtering:** Automatic data filtering based on user role
2. ✅ **Multi-Tenancy:** Complete data isolation between companies
3. ✅ **Team-Based Access:** Sales Managers see only their team's data
4. ✅ **Personal Privacy:** Sales Reps see only their own data
5. ✅ **Real-Time Data:** Live counts and percentages
6. ✅ **Visual Progress:** Progress bars for pipeline stages
7. ✅ **Responsive Design:** Works on all screen sizes

---

## 🚀 **PRODUCTION READY**

All widgets are:
- ✅ Permission-enforced
- ✅ Database-optimized
- ✅ Multi-tenant safe
- ✅ Role-aware
- ✅ Fully tested

**Status: READY FOR PRODUCTION** 🎉
