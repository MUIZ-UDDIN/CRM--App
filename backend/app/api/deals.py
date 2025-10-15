"""
Deals API endpoints
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
    stage: str
    contact_id: Optional[int] = None
    description: Optional[str] = None
    expected_close_date: Optional[datetime] = None


class DealUpdate(BaseModel):
    title: Optional[str] = None
    value: Optional[float] = None
    stage: Optional[str] = None
    contact_id: Optional[int] = None
    description: Optional[str] = None
    expected_close_date: Optional[datetime] = None


class Deal(BaseModel):
    id: int
    title: str
    value: float
    stage: str
    contact_id: Optional[int] = None
    description: Optional[str] = None
    expected_close_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# Mock data for testing
MOCK_DEALS = [
    {
        "id": 1,
        "title": "Enterprise Software License",
        "value": 50000.0,
        "stage": "proposal",
        "contact_id": 1,
        "description": "Annual software license for enterprise solution",
        "expected_close_date": "2024-02-15T00:00:00",
        "created_at": "2024-01-01T10:00:00",
        "updated_at": "2024-01-15T14:30:00"
    },
    {
        "id": 2,
        "title": "Marketing Consulting",
        "value": 25000.0,
        "stage": "negotiation",
        "contact_id": 2,
        "description": "3-month marketing strategy consulting",
        "expected_close_date": "2024-01-30T00:00:00",
        "created_at": "2024-01-05T09:15:00",
        "updated_at": "2024-01-20T11:45:00"
    },
    {
        "id": 3,
        "title": "Website Redesign",
        "value": 15000.0,
        "stage": "qualified",
        "contact_id": 3,
        "description": "Complete website redesign and development",
        "expected_close_date": "2024-02-28T00:00:00",
        "created_at": "2024-01-10T08:30:00",
        "updated_at": "2024-01-22T16:20:00"
    }
]


@router.get("/", response_model=List[Deal])
async def get_deals(
    stage: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Get all deals, optionally filtered by stage"""
    deals = MOCK_DEALS.copy()
    if stage:
        deals = [deal for deal in deals if deal["stage"] == stage]
    return deals


@router.post("/", response_model=Deal)
async def create_deal(
    deal: DealCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new deal"""
    new_deal = {
        "id": len(MOCK_DEALS) + 1,
        **deal.dict(),
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    MOCK_DEALS.append(new_deal)
    return new_deal


@router.get("/{deal_id}", response_model=Deal)
async def get_deal(
    deal_id: int,
    current_user: dict = Depends(get_current_active_user)
):
    """Get a specific deal by ID"""
    deal = next((d for d in MOCK_DEALS if d["id"] == deal_id), None)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal


@router.put("/{deal_id}", response_model=Deal)
async def update_deal(
    deal_id: int,
    deal_update: DealUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update a specific deal"""
    deal = next((d for d in MOCK_DEALS if d["id"] == deal_id), None)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    update_data = deal_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        deal[field] = value
    deal["updated_at"] = datetime.now()
    
    return deal


@router.delete("/{deal_id}")
async def delete_deal(
    deal_id: int,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete a specific deal"""
    deal_index = next((i for i, d in enumerate(MOCK_DEALS) if d["id"] == deal_id), None)
    if deal_index is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    MOCK_DEALS.pop(deal_index)
    return {"message": "Deal deleted successfully"}


@router.get("/stats/pipeline")
async def get_pipeline_stats(current_user: dict = Depends(get_current_active_user)):
    """Get pipeline statistics"""
    total_deals = len(MOCK_DEALS)
    total_value = sum(deal["value"] for deal in MOCK_DEALS)
    
    stage_stats = {}
    for deal in MOCK_DEALS:
        stage = deal["stage"]
        if stage not in stage_stats:
            stage_stats[stage] = {"count": 0, "value": 0}
        stage_stats[stage]["count"] += 1
        stage_stats[stage]["value"] += deal["value"]
    
    return {
        "total_deals": total_deals,
        "total_value": total_value,
        "average_deal_value": total_value / total_deals if total_deals > 0 else 0,
        "stages": stage_stats
    }