"""
Activities API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

from ..core.security import get_current_active_user
from ..core.database import get_db
from ..models.activities import Activity as ActivityModel, ActivityType, ActivityStatus

router = APIRouter()


class ActivityCreate(BaseModel):
    type: str
    subject: str
    description: Optional[str] = None
    status: Optional[str] = "pending"
    due_date: Optional[str] = None
    duration_minutes: Optional[int] = None
    priority: Optional[int] = None
    contact_id: Optional[str] = None
    deal_id: Optional[str] = None


class Activity(BaseModel):
    id: UUID
    subject: str = ""
    description: str = ""
    type: str = ""
    status: str = "pending"
    contact_id: Optional[str] = None
    deal_id: Optional[str] = None
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    outcome: Optional[str] = None
    priority: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[Activity])
def get_activities(
    activity_type: Optional[str] = None,
    type: Optional[str] = None,  # Alias for activity_type
    completed: Optional[bool] = None,
    status: Optional[str] = None,  # Alternative to completed
    contact_id: Optional[str] = None,
    deal_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get all activities from database"""
    query = db.query(ActivityModel)
    
    # Handle type filter (accept both activity_type and type)
    filter_type = activity_type or type
    if filter_type:
        query = query.filter(ActivityModel.type == filter_type)
    
    # Handle status filter (accept both completed boolean and status string)
    if status:
        query = query.filter(ActivityModel.status == status)
    elif completed is not None:
        if completed:
            query = query.filter(ActivityModel.status == ActivityStatus.COMPLETED)
        else:
            query = query.filter(ActivityModel.status != ActivityStatus.COMPLETED)
    
    if contact_id:
        query = query.filter(ActivityModel.contact_id == contact_id)
    
    if deal_id:
        query = query.filter(ActivityModel.deal_id == deal_id)
    
    activities = query.all()
    return activities


@router.post("/")
def create_activity(
    activity: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new activity"""
    # Map frontend values to database enums
    activity_type_map = {
        "call": ActivityType.CALL,
        "meeting": ActivityType.MEETING,
        "email": ActivityType.EMAIL,
        "task": ActivityType.TASK
    }
    
    status_map = {
        "pending": ActivityStatus.PENDING,
        "completed": ActivityStatus.COMPLETED,
        "overdue": ActivityStatus.OVERDUE,
        "cancelled": ActivityStatus.CANCELLED
    }
    
    activity_type_enum = activity_type_map.get(activity.type.lower(), ActivityType.TASK)
    status_enum = status_map.get(activity.status.lower() if activity.status else "pending", ActivityStatus.PENDING)
    
    # Handle due_date
    due_date = None
    if activity.due_date and activity.due_date.strip():
        try:
            # Handle datetime-local format (YYYY-MM-DDTHH:mm) or date-only (YYYY-MM-DD)
            date_str = activity.due_date.replace('Z', '+00:00')
            
            # If date-only format (no 'T'), add default time
            if 'T' not in date_str:
                date_str = date_str + 'T00:00:00'
            elif date_str.count(':') == 1:
                # Add :00 for seconds if not present
                date_str = date_str + ':00'
            
            due_date = datetime.fromisoformat(date_str)
            print(f"Successfully parsed due_date: {activity.due_date} -> {due_date}")
        except Exception as e:
            print(f"Failed to parse due_date: {activity.due_date}, error: {e}")
            due_date = None
    
    db_activity = ActivityModel(
        subject=activity.subject,
        description=activity.description,
        type=activity_type_enum,
        status=status_enum,
        due_date=due_date,
        duration_minutes=activity.duration_minutes,
        priority=activity.priority or 0,
        owner_id=current_user["id"],
        contact_id=activity.contact_id,
        deal_id=activity.deal_id
    )
    
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    
    # Return simple dict to avoid validation issues
    return {
        "id": str(db_activity.id),
        "subject": db_activity.subject or "",
        "description": db_activity.description or "",
        "type": str(db_activity.type),
        "status": str(db_activity.status),
        "due_date": db_activity.due_date.isoformat() if db_activity.due_date else None,
        "duration_minutes": db_activity.duration_minutes,
        "priority": db_activity.priority,
        "created_at": str(db_activity.created_at),
        "message": "Activity created successfully"
    }


@router.delete("/{activity_id}")
def delete_activity(
    activity_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Delete a specific activity"""
    activity = db.query(ActivityModel).filter(ActivityModel.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Check if user owns this activity
    if str(activity.owner_id) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this activity")
    
    db.delete(activity)
    db.commit()
    return {"message": "Activity deleted successfully"}


@router.patch("/{activity_id}")
def update_activity(
    activity_id: str,
    activity_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Update a specific activity"""
    activity = db.query(ActivityModel).filter(ActivityModel.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Check if user owns this activity
    if str(activity.owner_id) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this activity")
    
    # Handle enum fields and field mapping
    if "activity_type" in activity_data:
        activity_type_map = {
            "call": ActivityType.CALL,
            "meeting": ActivityType.MEETING,
            "email": ActivityType.EMAIL, 
            "task": ActivityType.TASK
        }
        activity_data["type"] = activity_type_map.get(activity_data["activity_type"].lower(), ActivityType.TASK)
        activity_data.pop("activity_type")
    
    if "title" in activity_data:
        activity_data["subject"] = activity_data["title"]
        activity_data.pop("title")
    
    if "priority" in activity_data and isinstance(activity_data["priority"], str):
        priority_map = {"low": 0, "medium": 1, "high": 2}
        activity_data["priority"] = priority_map.get(activity_data["priority"].lower(), 0)
    
    if "status" in activity_data and isinstance(activity_data["status"], str):
        status_map = {
            "pending": ActivityStatus.PENDING,
            "completed": ActivityStatus.COMPLETED,
            "overdue": ActivityStatus.OVERDUE,
            "cancelled": ActivityStatus.CANCELLED
        }
        activity_data["status"] = status_map.get(activity_data["status"].lower(), ActivityStatus.PENDING)
    
    # Handle due_date if it's an empty string
    if "due_date" in activity_data and activity_data["due_date"] == "":
        activity_data.pop("due_date")
    
    # Update fields
    for field, value in activity_data.items():
        if hasattr(activity, field):
            setattr(activity, field, value)
    
    db.commit()
    db.refresh(activity)
    
    # Return simple dict to avoid validation issues
    return {
        "id": str(activity.id),
        "subject": activity.subject or "",
        "description": activity.description or "",
        "type": str(activity.type),
        "status": str(activity.status),
        "updated_at": str(activity.updated_at),
        "message": "Activity updated successfully"
    }


@router.get("/{activity_id}")
def get_activity(
    activity_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get a specific activity by ID"""
    activity = db.query(ActivityModel).filter(ActivityModel.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    return {
        "id": str(activity.id),
        "subject": activity.subject or "",
        "description": activity.description or "",
        "type": str(activity.type),
        "status": str(activity.status),
        "due_date": activity.due_date.isoformat() if activity.due_date else None,
        "duration_minutes": activity.duration_minutes,
        "priority": activity.priority,
        "created_at": str(activity.created_at),
        "updated_at": str(activity.updated_at)
    }


@router.patch("/{activity_id}/complete")
def complete_activity(
    activity_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Mark an activity as completed"""
    activity = db.query(ActivityModel).filter(ActivityModel.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Check if user owns this activity
    if str(activity.owner_id) != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to complete this activity")
    
    # Toggle completion status
    if activity.status == ActivityStatus.COMPLETED:
        activity.status = ActivityStatus.PENDING
        activity.completed_at = None
        message = "Activity marked as pending"
        trigger_workflow = False
    else:
        activity.status = ActivityStatus.COMPLETED
        activity.completed_at = datetime.now()
        message = "Activity marked as completed"
        trigger_workflow = True
    
    db.commit()
    db.refresh(activity)
    
    # Trigger workflow for activity_completed
    if trigger_workflow:
        try:
            from app.services.workflow_executor import WorkflowExecutor
            from app.models.workflows import WorkflowTrigger
            from app.core.database import SessionLocal
            import asyncio
            import threading
            
            def run_workflow():
                workflow_db = SessionLocal()
                try:
                    print(f"🔥 Starting workflow trigger for activity_completed")
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    executor = WorkflowExecutor(workflow_db)
                    trigger_data = {
                        "activity_id": str(activity.id),
                        "activity_type": activity.type.value if activity.type else None,
                        "activity_subject": activity.subject,
                        "contact_id": str(activity.contact_id) if activity.contact_id else None,
                        "deal_id": str(activity.deal_id) if activity.deal_id else None,
                        "owner_id": str(activity.owner_id)
                    }
                    print(f"🔥 Trigger data: {trigger_data}")
                    result = loop.run_until_complete(executor.trigger_workflows(
                        WorkflowTrigger.ACTIVITY_COMPLETED,
                        trigger_data,
                        current_user["id"]
                    ))
                    print(f"🔥 Workflow trigger completed, executions: {len(result) if result else 0}")
                    loop.close()
                except Exception as e:
                    print(f"❌ Workflow execution error: {e}")
                    import traceback
                    traceback.print_exc()
                finally:
                    workflow_db.close()
            
            thread = threading.Thread(target=run_workflow, daemon=True)
            thread.start()
            print(f"🔥 Workflow thread started for activity_completed")
        except Exception as workflow_error:
            print(f"❌ Workflow trigger error: {workflow_error}")
    
    return {
        "id": str(activity.id),
        "subject": activity.subject or "",
        "status": str(activity.status),
        "completed_at": activity.completed_at.isoformat() if activity.completed_at else None,
        "message": message
    }
