# Workflow Automation - Implementation Guide

## ✅ **What's Been Built**

The workflow automation system is now **FULLY FUNCTIONAL** with the following components:

### 1. **Workflow Execution Engine** (`workflow_executor.py`)
- Finds and executes workflows based on triggers
- Handles workflow execution lifecycle
- Creates execution logs
- Tracks success/failure rates
- Updates workflow statistics

### 2. **Action Handlers** (`workflow_actions.py`)
- ✅ **Create Task** - Fully implemented
- ✅ **Update Field** - Fully implemented  
- ⚠️ **Send Email** - Framework ready (needs email service integration)
- ⚠️ **Send Notification** - Framework ready (needs notification system)
- ✅ **Create Deal** - Fully implemented
- ⚠️ **Add Tag** - Framework ready (needs tagging system)
- ⚠️ **Webhook** - Framework ready (needs httpx library)
- ⚠️ **Wait/Delay** - Framework ready (needs task queue)

### 3. **Trigger System**
- ✅ **Deal Created** - Implemented in `/api/deals.py`
- ⏳ Other triggers need to be added to their respective endpoints

### 4. **API Endpoints**
- ✅ `POST /workflows/{id}/execute` - Manual workflow execution
- ✅ `GET /workflows/{id}/executions` - View execution history

---

## 🚀 **How to Use**

### **Step 1: Create a Workflow with Actions**

Currently, workflows are created without actions. You need to add actions via API or database:

```python
# Example: Add actions to a workflow
workflow.actions = [
    {
        "type": "create_task",
        "config": {
            "title": "Follow up with {{deal_title}}",
            "description": "Contact the client about the new deal",
            "due_date": "+3 days",
            "activity_type": "task"
        }
    },
    {
        "type": "update_field",
        "config": {
            "object": "deal",
            "field": "description",
            "value": "Workflow created follow-up task"
        }
    }
]
```

### **Step 2: Activate the Workflow**

Set the workflow status to "Active" via the UI or API.

### **Step 3: Trigger the Workflow**

**Option A: Automatic Trigger**
- Create a deal → `deal_created` trigger fires
- Workflow executes automatically

**Option B: Manual Execution (Testing)**
```bash
POST /api/workflows/{workflow_id}/execute
```

### **Step 4: View Execution History**

```bash
GET /api/workflows/{workflow_id}/executions
```

---

## 📋 **Working Actions**

### 1. **Create Task**
```json
{
  "type": "create_task",
  "config": {
    "title": "Follow up with client",
    "description": "Discuss next steps",
    "due_date": "+3 days",
    "activity_type": "task"
  }
}
```

**What it does:**
- Creates a new activity/task in the system
- Sets due date based on offset (e.g., "+3 days", "+1 week")
- Links to contact/deal from trigger data
- Assigns to workflow owner

### 2. **Update Field**
```json
{
  "type": "update_field",
  "config": {
    "object": "deal",
    "field": "description",
    "value": "Updated by workflow"
  }
}
```

**What it does:**
- Updates any field on a contact or deal
- Uses object ID from trigger data
- Commits changes to database

### 3. **Create Deal**
```json
{
  "type": "create_deal",
  "config": {
    "title": "New opportunity from {{contact.name}}",
    "value": 5000,
    "stage": "qualification"
  }
}
```

**What it does:**
- Creates a new deal
- Links to contact from trigger data
- Sets initial stage and value

---

## ⚠️ **Actions Needing Integration**

### 1. **Send Email**
**Status:** Framework ready, needs email service

**To implement:**
```python
# Install SendGrid
pip install sendgrid

# Add to workflow_actions.py
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

message = Mail(
    from_email='noreply@yourcrm.com',
    to_emails=to_email,
    subject=subject,
    html_content=body
)
sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
response = sg.send(message)
```

**Alternative:** Use AWS SES, SMTP, or Mailgun

### 2. **Send Notification**
**Status:** Framework ready, needs notification system

**Options:**
- In-app notifications (database table)
- Push notifications (Firebase, OneSignal)
- Slack/Teams webhooks
- SMS (Twilio)

### 3. **Webhook**
**Status:** Framework ready, needs httpx

**To implement:**
```bash
pip install httpx
```

Then uncomment the webhook code in `workflow_actions.py`.

### 4. **Wait/Delay**
**Status:** Framework ready, needs task queue

**To implement:**
```bash
pip install celery redis
```

Use Celery to schedule delayed tasks.

---

## 🔧 **Adding More Triggers**

### Example: Contact Created

**File:** `backend/app/api/contacts.py`

```python
@router.post("/")
async def create_contact(contact_data: ContactCreate, ...):
    # Create contact
    new_contact = Contact(...)
    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)
    
    # Trigger workflows
    try:
        from ..services.workflow_executor import WorkflowExecutor
        from ..models.workflows import WorkflowTrigger
        
        executor = WorkflowExecutor(db)
        trigger_data = {
            "contact_id": str(new_contact.id),
            "contact_name": f"{new_contact.first_name} {new_contact.last_name}",
            "contact_email": new_contact.email,
            "owner_id": str(new_contact.owner_id)
        }
        
        import asyncio
        asyncio.create_task(executor.trigger_workflows(
            WorkflowTrigger.CONTACT_CREATED,
            trigger_data,
            user_id
        ))
    except Exception as e:
        print(f"Workflow trigger error: {e}")
    
    return new_contact
```

### Example: Deal Stage Changed

**File:** `backend/app/api/deals.py`

```python
@router.put("/{deal_id}")
async def update_deal(deal_id: str, deal_data: DealUpdate, ...):
    # Get old stage
    old_stage = deal.stage_id
    
    # Update deal
    deal.stage_id = new_stage_id
    db.commit()
    
    # Trigger workflow if stage changed
    if old_stage != new_stage_id:
        try:
            from ..services.workflow_executor import WorkflowExecutor
            from ..models.workflows import WorkflowTrigger
            
            executor = WorkflowExecutor(db)
            trigger_data = {
                "deal_id": str(deal.id),
                "old_stage": str(old_stage),
                "new_stage": str(new_stage_id),
                "deal_title": deal.title
            }
            
            import asyncio
            asyncio.create_task(executor.trigger_workflows(
                WorkflowTrigger.DEAL_STAGE_CHANGED,
                trigger_data,
                user_id
            ))
        except Exception as e:
            print(f"Workflow trigger error: {e}")
```

---

## 🧪 **Testing Workflows**

### 1. **Create a Test Workflow**

```sql
-- Add actions to an existing workflow
UPDATE workflows 
SET actions = '[
    {
        "type": "create_task",
        "config": {
            "title": "Test task from workflow",
            "description": "This task was created automatically",
            "due_date": "+1 day"
        }
    }
]'
WHERE id = 'your-workflow-id';
```

### 2. **Activate the Workflow**

Set status to "active" via UI or:
```sql
UPDATE workflows SET status = 'active' WHERE id = 'your-workflow-id';
```

### 3. **Test Manual Execution**

```bash
curl -X POST http://localhost:8000/api/workflows/{workflow_id}/execute \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. **Test Automatic Trigger**

Create a deal via the UI or API. The workflow should execute automatically.

### 5. **Check Execution History**

```bash
curl http://localhost:8000/api/workflows/{workflow_id}/executions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 **Monitoring Workflows**

### Execution Logs

All executions are logged in the `workflow_executions` table:

```sql
SELECT 
    w.name as workflow_name,
    we.status,
    we.success_count,
    we.failure_count,
    we.duration_seconds,
    we.started_at,
    we.error_message
FROM workflow_executions we
JOIN workflows w ON we.workflow_id = w.id
ORDER BY we.started_at DESC
LIMIT 50;
```

### Workflow Statistics

```sql
SELECT 
    name,
    status,
    execution_count,
    last_executed_at,
    trigger_type
FROM workflows
WHERE is_deleted = false
ORDER BY execution_count DESC;
```

---

## 🎯 **Next Steps**

### Immediate (Core Functionality)
1. ✅ **Add actions to workflows** - Via API or database
2. ✅ **Test with deal creation** - Already implemented
3. ⏳ **Add more triggers** - Contact created, deal stage changed, etc.

### Short Term (Enhanced Features)
4. **Build Action Builder UI** - Visual interface to add/edit actions
5. **Add Email Integration** - SendGrid/SES/SMTP
6. **Add Notification System** - In-app or push notifications
7. **Implement Webhooks** - Install httpx

### Long Term (Advanced Features)
8. **Conditional Logic** - If/then rules for actions
9. **Action Templates** - Pre-built action configurations
10. **Workflow Analytics** - Success rates, performance metrics
11. **Error Notifications** - Alert when workflows fail
12. **Workflow Cloning** - Duplicate existing workflows
13. **Version History** - Track workflow changes

---

## 🐛 **Troubleshooting**

### Workflow Not Executing

**Check:**
1. Is workflow status "active"?
2. Does workflow have actions defined?
3. Is the trigger firing? (Check logs)
4. Are there any errors in execution history?

```python
# Check workflow
SELECT * FROM workflows WHERE id = 'workflow-id';

# Check executions
SELECT * FROM workflow_executions 
WHERE workflow_id = 'workflow-id' 
ORDER BY started_at DESC 
LIMIT 10;
```

### Actions Failing

**Check execution logs:**
```python
SELECT 
    actions_executed,
    error_message
FROM workflow_executions
WHERE workflow_id = 'workflow-id'
AND status = 'failed'
ORDER BY started_at DESC;
```

### Trigger Not Firing

**Check:**
1. Is the trigger code added to the endpoint?
2. Are there any exceptions being caught?
3. Check server logs for "Workflow trigger error"

---

## 📝 **Summary**

✅ **Working Now:**
- Workflow execution engine
- Create task action
- Update field action
- Create deal action
- Deal created trigger
- Manual execution
- Execution history

⚠️ **Needs Integration:**
- Email sending (SendGrid/SES)
- Notifications (in-app/push)
- Webhooks (httpx)
- Wait/delay (Celery)

⏳ **Needs Implementation:**
- More triggers (contact created, stage changed, etc.)
- Action builder UI
- Conditional logic
- Analytics dashboard

**The core system is LIVE and FUNCTIONAL. You can start using workflows with the implemented actions right now!**
