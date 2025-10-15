"""
Activities API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from ..core.security import get_current_active_user

router = APIRouter()


class ActivityCreate(BaseModel):
    title: str
    description: Optional[str] = None
    activity_type: str  # call, email, meeting, task, note
    contact_id: Optional[int] = None
    deal_id: Optional[int] = None
    due_date: Optional[datetime] = None
    completed: bool = False


class ActivityUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    activity_type: Optional[str] = None
    contact_id: Optional[int] = None
    deal_id: Optional[int] = None
    due_date: Optional[datetime] = None
    completed: Optional[bool] = None


class Activity(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    activity_type: str
    contact_id: Optional[int] = None
    deal_id: Optional[int] = None
    due_date: Optional[datetime] = None
    completed: bool = False
    created_at: datetime
    updated_at: datetime


# Mock data for testing
MOCK_ACTIVITIES = [
    {
        "id": 1,
        "title": "Follow up call with John Smith",
        "description": "Discuss enterprise solution requirements",
        "activity_type": "call",
        "contact_id": 1,
        "deal_id": 1,
        "due_date": "2024-01-25T14:00:00",
        "completed": False,
        "created_at": "2024-01-20T10:00:00",
        "updated_at": "2024-01-20T10:00:00"
    },
    {
        "id": 2,
        "title": "Send proposal to Marketing Pro",
        "description": "Marketing consulting proposal document",
        "activity_type": "email",
        "contact_id": 2,
        "deal_id": 2,
        "due_date": "2024-01-24T09:00:00",
        "completed": True,
        "created_at": "2024-01-18T15:30:00",
        "updated_at": "2024-01-23T11:45:00"
    },
    {
        "id": 3,
        "title": "Project kickoff meeting",
        "description": "Website redesign project planning",
        "activity_type": "meeting",
        "contact_id": 3,
        "deal_id": 3,
        "due_date": "2024-01-30T10:00:00",
        "completed": False,
        "created_at": "2024-01-22T08:15:00",
        "updated_at": "2024-01-22T08:15:00"
    },
    {
        "id": 4,
        "title": "Update CRM notes",
        "description": "Add meeting notes from yesterday's client call",
        "activity_type": "task",
        "contact_id": None,
        "deal_id": None,
        "due_date": "2024-01-24T17:00:00",
        "completed": False,
        "created_at": "2024-01-23T16:30:00",
        "updated_at": "2024-01-23T16:30:00"
    }
]


@router.get("/", response_model=List[Activity])
async def get_activities(
    activity_type: Optional[str] = None,
    completed: Optional[bool] = None,
    contact_id: Optional[int] = None,
    deal_id: Optional[int] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Get all activities with optional filtering"""
    activities = MOCK_ACTIVITIES.copy()
    
    if activity_type:
        activities = [a for a in activities if a["activity_type"] == activity_type]
    
    if completed is not None:
        activities = [a for a in activities if a["completed"] == completed]
    
    if contact_id:
        activities = [a for a in activities if a["contact_id"] == contact_id]
    
    if deal_id:
        activities = [a for a in activities if a["deal_id"] == deal_id]
    
    return activities


@router.post("/", response_model=Activity)
async def create_activity(
    activity: ActivityCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new activity"""
    new_activity = {
        "id": len(MOCK_ACTIVITIES) + 1,
        **activity.dict(),
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    MOCK_ACTIVITIES.append(new_activity)
    return new_activity


@router.get("/{activity_id}", response_model=Activity)
async def get_activity(
    activity_id: int,
    current_user: dict = Depends(get_current_active_user)
):
    """Get a specific activity by ID"""
    activity = next((a for a in MOCK_ACTIVITIES if a["id"] == activity_id), None)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity


@router.put("/{activity_id}", response_model=Activity)
async def update_activity(
    activity_id: int,
    activity_update: ActivityUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update a specific activity"""
    activity = next((a for a in MOCK_ACTIVITIES if a["id"] == activity_id), None)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    update_data = activity_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        activity[field] = value
    activity["updated_at"] = datetime.now()
    
    return activity


@router.delete("/{activity_id}")
async def delete_activity(
    activity_id: int,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete a specific activity"""
    activity_index = next((i for i, a in enumerate(MOCK_ACTIVITIES) if a["id"] == activity_id), None)
    if activity_index is None:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    MOCK_ACTIVITIES.pop(activity_index)
    return {"message": "Activity deleted successfully"}


@router.post("/{activity_id}/complete")
async def complete_activity(
    activity_id: int,
    current_user: dict = Depends(get_current_active_user)
):
    """Mark an activity as completed"""
    activity = next((a for a in MOCK_ACTIVITIES if a["id"] == activity_id), None)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    activity["completed"] = True
    activity["updated_at"] = datetime.now()
    
    return activity


@router.get("/stats/summary")
async def get_activities_stats(current_user: dict = Depends(get_current_active_user)):
    """Get activities statistics"""
    total_activities = len(MOCK_ACTIVITIES)
    completed_activities = len([a for a in MOCK_ACTIVITIES if a["completed"]])
    pending_activities = total_activities - completed_activities
    
    # Group by activity type
    type_stats = {}
    for activity in MOCK_ACTIVITIES:
        activity_type = activity["activity_type"]
        if activity_type not in type_stats:
            type_stats[activity_type] = {"total": 0, "completed": 0}
        type_stats[activity_type]["total"] += 1
        if activity["completed"]:
            type_stats[activity_type]["completed"] += 1
    
    # Overdue activities (past due_date and not completed)
    now = datetime.now()
    overdue_activities = [
        a for a in MOCK_ACTIVITIES 
        if not a["completed"] and a["due_date"] and datetime.fromisoformat(a["due_date"].replace('Z', '+00:00')) < now
    ]
    
    return {
        "total_activities": total_activities,
        "completed_activities": completed_activities,
        "pending_activities": pending_activities,
        "overdue_activities": len(overdue_activities),
        "completion_rate": (completed_activities / total_activities * 100) if total_activities > 0 else 0,
        "type_breakdown": type_stats
    }