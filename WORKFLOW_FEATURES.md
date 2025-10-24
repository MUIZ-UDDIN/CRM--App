# Workflow Automation Features Guide

## Overview
The Workflow Automation system allows you to automate repetitive tasks in your CRM based on specific triggers.

---

## 🎯 **Triggers**

Triggers are events that start a workflow automatically. When the trigger event occurs, the workflow executes its actions.

### Available Triggers:

1. **Contact Created** (`contact_created`)
   - Fires when a new contact is added to the CRM
   - Example: Send welcome email to new contacts

2. **Deal Created** (`deal_created`)
   - Fires when a new deal is created
   - Example: Assign deal to sales team, notify manager

3. **Deal Stage Changed** (`deal_stage_changed`)
   - Fires when a deal moves to a different stage
   - Example: Send notification when deal reaches "Proposal" stage

4. **Deal Won** (`deal_won`)
   - Fires when a deal is marked as won
   - Example: Create invoice, send thank you email, notify accounting

5. **Deal Lost** (`deal_lost`)
   - Fires when a deal is marked as lost
   - Example: Send follow-up survey, add to nurture campaign

6. **Activity Completed** (`activity_completed`)
   - Fires when a task/activity is marked as complete
   - Example: Create follow-up task, update deal status

7. **Email Opened** (`email_opened`)
   - Fires when a recipient opens an email
   - Example: Notify sales rep, add to hot leads list

8. **Document Signed** (`document_signed`)
   - Fires when a document/contract is signed
   - Example: Move deal to next stage, send confirmation

9. **Scheduled (Time-based)** (`scheduled`)
   - Fires at specific times or intervals
   - Example: Send weekly reports, monthly follow-ups

### How to Add More Triggers:

**Backend** (`backend/app/models/workflows.py`):
```python
class WorkflowTrigger(str, enum.Enum):
    """Workflow trigger enum"""
    DEAL_CREATED = "deal_created"
    # ... existing triggers ...
    
    # Add new trigger here:
    QUOTE_SENT = "quote_sent"  # New trigger
    PAYMENT_RECEIVED = "payment_received"  # New trigger
```

**Frontend** (`frontend/src/pages/Workflows.tsx`):
```tsx
<select>
  <option value="contact_created">Contact Created</option>
  {/* ... existing options ... */}
  
  {/* Add new options here: */}
  <option value="quote_sent">Quote Sent</option>
  <option value="payment_received">Payment Received</option>
</select>
```

---

## ⚡ **Actions**

Actions are the tasks that the workflow performs when triggered. A workflow can have multiple actions that execute in sequence.

### What are Actions?

Actions are stored in the `actions` field (JSONB array) in the database. Each action defines:
- **Type**: What kind of action (send_email, create_task, update_field, etc.)
- **Configuration**: Specific settings for that action
- **Order**: Sequence in which actions execute

### Example Actions:

```json
[
  {
    "type": "send_email",
    "config": {
      "to": "{{contact.email}}",
      "subject": "Welcome to our CRM",
      "template": "welcome_email"
    }
  },
  {
    "type": "create_task",
    "config": {
      "title": "Follow up with {{contact.name}}",
      "due_date": "+3 days",
      "assigned_to": "{{deal.owner}}"
    }
  },
  {
    "type": "update_field",
    "config": {
      "object": "contact",
      "field": "status",
      "value": "active"
    }
  }
]
```

### Common Action Types:

1. **Send Email** - Send automated emails
2. **Create Task** - Create follow-up tasks
3. **Update Field** - Change field values
4. **Send Notification** - Notify team members
5. **Create Deal** - Automatically create deals
6. **Add Tag** - Tag contacts/deals
7. **Webhook** - Call external APIs
8. **Wait/Delay** - Pause before next action

### Actions Count (`actions_count`)

- Displays the number of actions configured in the workflow
- Shows in the workflow list: "Actions: 3"
- Workflows with 0 actions cannot be activated
- Calculated from the length of the `actions` array

---

## 📊 **Executions**

Executions track every time a workflow runs. Each execution is logged in the `workflow_executions` table.

### What are Executions?

When a trigger event occurs and the workflow is active, the system:
1. Creates a new `WorkflowExecution` record
2. Executes all actions in sequence
3. Logs the results (success/failure)
4. Updates execution statistics

### Execution Data Stored:

```python
class WorkflowExecution(BaseModel):
    workflow_id = UUID  # Which workflow ran
    status = String  # "success", "failed", "partial"
    trigger_data = JSONB  # Data that triggered the workflow
    actions_executed = JSONB  # Which actions ran
    success_count = Integer  # How many actions succeeded
    failure_count = Integer  # How many actions failed
    error_message = Text  # Error details if failed
    started_at = DateTime  # When execution started
    completed_at = DateTime  # When execution finished
    duration_seconds = Integer  # How long it took
```

### Executions Count (`executions_count`)

- Displays total number of times the workflow has run
- Shows in the workflow list: "Executions: 47"
- Increments each time the workflow is triggered
- Helps track workflow usage and effectiveness

### Execution Statuses:

1. **Success** - All actions completed successfully
2. **Failed** - Workflow failed to execute
3. **Partial** - Some actions succeeded, some failed

### Last Run (`last_run`)

- Shows the timestamp of the most recent execution
- Displays as: "Oct 24, 2025, 11:30 PM"
- Shows "Never" if workflow hasn't run yet

---

## 🔧 **How It All Works Together**

### Example Workflow Flow:

```
1. TRIGGER: Deal Stage Changed to "Proposal"
   ↓
2. WORKFLOW: "Proposal Follow-up" (Active)
   ↓
3. ACTIONS:
   - Send email to contact with proposal details
   - Create task for sales rep: "Follow up in 2 days"
   - Update deal field: last_contact_date = today
   - Send Slack notification to sales channel
   ↓
4. EXECUTION: Log the run
   - Status: success
   - Actions executed: 4
   - Duration: 2.3 seconds
   - Timestamp: Oct 24, 2025, 11:30 PM
   ↓
5. UPDATE COUNTS:
   - actions_count: 4
   - executions_count: 48 (incremented)
   - last_run: Oct 24, 2025, 11:30 PM
```

---

## 📈 **Workflow Statistics**

### In the Workflow List:

```
┌─────────────────────────────────────────────────────┐
│ Sales Follow-up Workflow              [Active]      │
│ Automatically follow up with leads                  │
│                                                      │
│ Trigger: deal_created                               │
│ Actions: 3          Executions: 127                 │
│ Last Run: Oct 24, 2025, 11:30 PM                   │
└─────────────────────────────────────────────────────┘
```

### What Each Metric Means:

- **Actions: 3** - This workflow has 3 automated actions
- **Executions: 127** - This workflow has run 127 times
- **Last Run: Oct 24...** - Most recent execution timestamp

---

## 🎮 **Workflow Controls**

### Status Options:

1. **Active** (Green)
   - Workflow is running
   - Will execute when triggered
   - Shows pause button (⏸️)

2. **Inactive** (Gray)
   - Workflow is disabled
   - Will NOT execute when triggered
   - Shows play button (▶️) if has actions
   - Default status for new workflows

### Buttons:

- **▶️ Play** - Activate the workflow (only if has actions)
- **⏸️ Pause** - Deactivate the workflow
- **👁️ View** - See workflow details
- **✏️ Edit** - Modify workflow settings
- **🗑️ Delete** - Remove workflow (with confirmation)

---

## 💡 **Best Practices**

1. **Start with Inactive**
   - Create workflows as inactive
   - Test thoroughly before activating
   - Prevents accidental executions

2. **Add Actions First**
   - Configure all actions before activating
   - System prevents activating workflows without actions
   - Ensures workflow does something useful

3. **Monitor Executions**
   - Check execution count regularly
   - High count = workflow is useful
   - Zero count = trigger may not be firing

4. **Use Descriptive Names**
   - "Welcome Email for New Contacts"
   - "Deal Won - Invoice Creation"
   - Makes workflows easy to identify

5. **Test Triggers**
   - Create test data to trigger workflows
   - Verify actions execute correctly
   - Check execution logs for errors

---

## 🔮 **Future Enhancements**

Potential features to add:

1. **Action Builder UI** - Visual interface to add/edit actions
2. **Execution History** - View detailed logs of past runs
3. **Conditional Logic** - If/then rules for actions
4. **Action Templates** - Pre-built action configurations
5. **Workflow Analytics** - Success rates, performance metrics
6. **Error Notifications** - Alert when workflows fail
7. **Workflow Cloning** - Duplicate existing workflows
8. **Version History** - Track workflow changes over time

---

## 📝 **Summary**

- **Triggers** = What starts the workflow (events)
- **Actions** = What the workflow does (tasks)
- **Executions** = How many times it has run (logs)
- **Status** = Whether it's running or not (active/inactive)

The workflow system automates repetitive tasks, saving time and ensuring consistency in your sales processes.
