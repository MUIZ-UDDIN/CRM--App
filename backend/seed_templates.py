#!/usr/bin/env python3
"""
Seed default workflow templates
"""

from app.core.database import sync_engine, get_db, Base
from app.models.workflow_templates import WorkflowTemplate
from app.models.users import User
from app.models.companies import Company
from sqlalchemy.orm import Session
import uuid
from datetime import datetime
import json

# Import all models to ensure they're registered
from app.models import users, companies, workflows

def get_super_admin():
    """Get first super admin user"""
    db = next(get_db())
    try:
        user = db.query(User).filter(User.user_role == 'super_admin').first()
        if user:
            return str(user.id)
        # Fallback to first user
        user = db.query(User).first()
        return str(user.id) if user else None
    finally:
        db.close()

def seed_templates():
    """Create default workflow templates"""
    db = next(get_db())
    
    try:
        # Check if templates already exist
        existing = db.query(WorkflowTemplate).filter(WorkflowTemplate.is_global == True).count()
        if existing > 0:
            print(f"✅ {existing} global templates already exist. Skipping seed.")
            return
        
        creator_id = get_super_admin()
        if not creator_id:
            print("❌ No user found to create templates")
            return
        
        print(f"📝 Creating templates with creator: {creator_id}")
        
        templates = [
            {
                "name": "New Lead Follow-up",
                "description": "Automatically send follow-up emails to new leads after 24 hours",
                "category": "sales",
                "trigger_type": "contact_created",
                "trigger_config": {"entity": "contact", "event": "created"},
                "actions": [
                    {
                        "type": "wait",
                        "duration": "24h"
                    },
                    {
                        "type": "send_email",
                        "template": "lead_followup",
                        "to": "{{contact.email}}"
                    }
                ],
                "tags": ["sales", "lead", "email"]
            },
            {
                "name": "Deal Won Celebration",
                "description": "Send congratulations email when a deal is won",
                "category": "sales",
                "trigger_type": "deal_status_changed",
                "trigger_config": {"status": "won"},
                "actions": [
                    {
                        "type": "send_email",
                        "template": "deal_won",
                        "to": "{{deal.contact.email}}"
                    },
                    {
                        "type": "create_task",
                        "title": "Send thank you gift",
                        "assigned_to": "{{deal.owner}}"
                    }
                ],
                "tags": ["sales", "deal", "celebration"]
            },
            {
                "name": "Welcome Email Series",
                "description": "Send a series of welcome emails to new customers",
                "category": "marketing",
                "trigger_type": "contact_created",
                "trigger_config": {"entity": "contact", "tag": "customer"},
                "actions": [
                    {
                        "type": "send_email",
                        "template": "welcome_day1",
                        "to": "{{contact.email}}"
                    },
                    {
                        "type": "wait",
                        "duration": "3d"
                    },
                    {
                        "type": "send_email",
                        "template": "welcome_day3",
                        "to": "{{contact.email}}"
                    }
                ],
                "tags": ["marketing", "onboarding", "email"]
            },
            {
                "name": "Support Ticket Auto-assign",
                "description": "Automatically assign new support tickets to available team members",
                "category": "support",
                "trigger_type": "ticket_created",
                "trigger_config": {"entity": "ticket", "event": "created"},
                "actions": [
                    {
                        "type": "assign_ticket",
                        "method": "round_robin"
                    },
                    {
                        "type": "send_notification",
                        "to": "{{ticket.assigned_to}}",
                        "message": "New ticket assigned: {{ticket.subject}}"
                    }
                ],
                "tags": ["support", "automation", "assignment"]
            },
            {
                "name": "Onboarding Checklist",
                "description": "Create onboarding tasks for new customers",
                "category": "onboarding",
                "trigger_type": "deal_status_changed",
                "trigger_config": {"status": "won"},
                "actions": [
                    {
                        "type": "create_task",
                        "title": "Schedule kickoff call",
                        "due_days": 2
                    },
                    {
                        "type": "create_task",
                        "title": "Send onboarding materials",
                        "due_days": 1
                    },
                    {
                        "type": "create_task",
                        "title": "Setup account access",
                        "due_days": 3
                    }
                ],
                "tags": ["onboarding", "tasks", "customer-success"]
            },
            {
                "name": "Inactive Lead Re-engagement",
                "description": "Re-engage leads that haven't been contacted in 30 days",
                "category": "follow_up",
                "trigger_type": "scheduled",
                "trigger_config": {"schedule": "daily", "condition": "last_contact > 30d"},
                "actions": [
                    {
                        "type": "send_email",
                        "template": "reengagement",
                        "to": "{{contact.email}}"
                    },
                    {
                        "type": "create_task",
                        "title": "Follow up with {{contact.name}}",
                        "assigned_to": "{{contact.owner}}"
                    }
                ],
                "tags": ["follow-up", "re-engagement", "sales"]
            },
            {
                "name": "Task Reminder",
                "description": "Send reminder 1 day before task due date",
                "category": "general",
                "trigger_type": "scheduled",
                "trigger_config": {"schedule": "daily", "check": "tasks_due_tomorrow"},
                "actions": [
                    {
                        "type": "send_notification",
                        "to": "{{task.assigned_to}}",
                        "message": "Reminder: {{task.title}} is due tomorrow"
                    }
                ],
                "tags": ["tasks", "reminders", "productivity"]
            },
            {
                "name": "Deal Stage Change Notification",
                "description": "Notify team when deal moves to next stage",
                "category": "sales",
                "trigger_type": "deal_stage_changed",
                "trigger_config": {"entity": "deal", "event": "stage_changed"},
                "actions": [
                    {
                        "type": "send_notification",
                        "to": "{{deal.owner}}",
                        "message": "Deal {{deal.name}} moved to {{deal.stage}}"
                    },
                    {
                        "type": "update_field",
                        "field": "last_stage_change",
                        "value": "{{now}}"
                    }
                ],
                "tags": ["sales", "pipeline", "notifications"]
            }
        ]
        
        created_count = 0
        for template_data in templates:
            template = WorkflowTemplate(
                id=uuid.uuid4(),
                name=template_data["name"],
                description=template_data["description"],
                category=template_data["category"],
                trigger_type=template_data["trigger_type"],
                trigger_config=template_data["trigger_config"],
                actions=template_data["actions"],
                is_global=True,
                is_active=True,
                usage_count=0,
                tags=template_data["tags"],
                created_by_id=uuid.UUID(creator_id),
                company_id=None,  # Global templates have no company
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(template)
            created_count += 1
            print(f"  ✅ Created: {template_data['name']}")
        
        db.commit()
        print(f"\n🎉 Successfully created {created_count} workflow templates!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Seeding Workflow Templates")
    print("=" * 60)
    seed_templates()
    print("=" * 60)
