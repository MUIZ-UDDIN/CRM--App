"""
Deals API endpoints with mock data
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from ..core.security import get_current_active_user

router = APIRouter()


class DealCreate(BaseModel):
    title: str
    value: float
    company: Optional[str] = None
    contact: Optional[str] = None  
    stage_id: str
    pipeline_id: str
    description: Optional[str] = None
    expected_close_date: Optional[datetime] = None


class Deal(BaseModel):
    id: str
    title: str
    value: float
    stage_id: str
    pipeline_id: str
    company: Optional[str] = None
    contact: Optional[str] = None
    description: Optional[str] = None
    expected_close_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# Mock deals data
MOCK_DEALS = [
    {
        "id": "1",
        "title": "Enterprise Software Deal",
        "value": 15000.0,
        "stage_id": "qualification",
        "pipeline_id": "1",
        "company": "TechCorp Inc",
        "contact": "John Smith",
        "description": "Large enterprise software implementation",
        "expected_close_date": "2024-02-15T00:00:00",
        "created_at": "2024-01-15T10:00:00",
        "updated_at": "2024-01-15T10:00:00"
    },
    {
        "id": "2",
        "title": "Marketing Consulting",
        "value": 5000.0,
        "stage_id": "proposal",
        "pipeline_id": "1",
        "company": "Marketing Solutions",
        "contact": "Sarah Johnson",
        "description": "3-month marketing strategy consulting",
        "expected_close_date": "2024-01-30T00:00:00",
        "created_at": "2024-01-10T14:30:00",
        "updated_at": "2024-01-20T16:45:00"
    },
    {
        "id": "3",
        "title": "Website Redesign",
        "value": 8000.0,
        "stage_id": "negotiation",
        "pipeline_id": "1",
        "company": "Digital Agency",
        "contact": "Mike Wilson",
        "description": "Complete website overhaul with modern design",
        "expected_close_date": "2024-02-20T00:00:00",
        "created_at": "2024-01-05T09:15:00",
        "updated_at": "2024-01-25T11:30:00"
    }
]


@router.get("/", response_model=List[Deal])
def get_deals(
    stage: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Get all deals"""
    deals = MOCK_DEALS.copy()
    
    if stage:
        deals = [d for d in deals if d["stage_id"] == stage]
    
    return deals


@router.post("/")
def create_deal(
    deal: DealCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new deal"""
    # Generate new ID
    new_id = str(max([int(d["id"]) for d in MOCK_DEALS]) + 1)
    
    new_deal = {
        "id": new_id,
        "title": deal.title,
        "value": deal.value,
        "stage_id": deal.stage_id,
        "pipeline_id": deal.pipeline_id,
        "company": deal.company,
        "contact": deal.contact,
        "description": deal.description,
        "expected_close_date": deal.expected_close_date.isoformat() if deal.expected_close_date else None,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    MOCK_DEALS.append(new_deal)
    
    return {
        "id": new_deal["id"],
        "title": new_deal["title"],
        "value": new_deal["value"],
        "stage_id": new_deal["stage_id"],
        "pipeline_id": new_deal["pipeline_id"],
        "company": new_deal["company"],
        "contact": new_deal["contact"],
        "created_at": new_deal["created_at"],
        "message": "Deal created successfully"
    }


@router.get("/{deal_id}")
def get_deal(
    deal_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Get a specific deal"""
    deal = next((d for d in MOCK_DEALS if d["id"] == deal_id), None)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal


@router.patch("/{deal_id}")
def update_deal(
    deal_id: str,
    deal_data: dict,
    current_user: dict = Depends(get_current_active_user)
):
    """Update a specific deal"""
    deal = next((d for d in MOCK_DEALS if d["id"] == deal_id), None)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Update fields
    for field, value in deal_data.items():
        if field in deal and value is not None:
            deal[field] = value
    
    deal["updated_at"] = datetime.now().isoformat()
    
    return deal


@router.delete("/{deal_id}")
def delete_deal(
    deal_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete a specific deal"""
    global MOCK_DEALS
    MOCK_DEALS = [d for d in MOCK_DEALS if d["id"] != deal_id]
    
    return {"message": "Deal deleted successfully"}


@router.patch("/{deal_id}/move")
def move_deal_stage(
    deal_id: str,
    stage_data: dict,
    current_user: dict = Depends(get_current_active_user)
):
    """Move deal to different stage"""
    deal = next((d for d in MOCK_DEALS if d["id"] == deal_id), None)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    deal["stage_id"] = stage_data.get("to_stage_id", deal["stage_id"])
    deal["updated_at"] = datetime.now().isoformat()
    
    return deal
