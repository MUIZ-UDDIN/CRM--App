"""
Deals API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
import uuid

from ..core.security import get_current_active_user
from ..core.database import get_db
from ..models.deals import Deal as DealModel, DealStatus

router = APIRouter()


class DealCreate(BaseModel):
    title: str
    value: float
    company: Optional[str] = None
    contact: Optional[str] = None  
    stage_id: str
    pipeline_id: Optional[str] = None  # Optional - will use default pipeline if not provided
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


@router.get("/", response_model=List[Deal])
def get_deals(
    stage: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all deals"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    query = db.query(DealModel).filter(
        and_(
            DealModel.owner_id == user_id,
            DealModel.is_deleted == False
        )
    )
    
    if stage:
        query = query.filter(DealModel.stage_id == uuid.UUID(stage))
    
    deals = query.all()
    
    return [
        {
            "id": str(deal.id),
            "title": deal.title,
            "value": deal.value,
            "stage_id": str(deal.stage_id),
            "pipeline_id": str(deal.pipeline_id),
            "company": deal.company,
            "contact": deal.contact_person,
            "description": deal.description,
            "expected_close_date": deal.expected_close_date.isoformat() if deal.expected_close_date else None,
            "created_at": deal.created_at,
            "updated_at": deal.updated_at
        }
        for deal in deals
    ]


@router.post("/")
def create_deal(
    deal: DealCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new deal"""
    from ..models.deals import Pipeline, PipelineStage
    import traceback
    
    try:
        user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    except Exception as e:
        print(f"Error parsing user_id: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid user ID: {str(e)}")
    
    # Get default pipeline if pipeline_id not provided or invalid
    try:
        pipeline_id = uuid.UUID(deal.pipeline_id) if deal.pipeline_id else None
    except (ValueError, AttributeError):
        pipeline_id = None
    
    if not pipeline_id:
        # Get default pipeline
        default_pipeline = db.query(Pipeline).filter(Pipeline.is_deleted == False).first()
        if not default_pipeline:
            raise HTTPException(status_code=400, detail="No pipeline found. Please create a pipeline first.")
        pipeline_id = default_pipeline.id
    
    # Handle stage_id - accept either UUID or stage name
    try:
        stage_id = uuid.UUID(deal.stage_id)
    except (ValueError, AttributeError):
        # Try to find stage by name (case-insensitive)
        stage_name_map = {
            'qualification': 'Qualification',
            'proposal': 'Proposal',
            'negotiation': 'Negotiation',
            'closed-won': 'Closed Won',
            'closed-lost': 'Closed Lost'
        }
        stage_name = stage_name_map.get(deal.stage_id.lower(), deal.stage_id)
        stage = db.query(PipelineStage).filter(
            and_(
                PipelineStage.pipeline_id == pipeline_id,
                PipelineStage.name == stage_name,
                PipelineStage.is_deleted == False
            )
        ).first()
        
        if not stage:
            raise HTTPException(status_code=400, detail=f"Stage '{deal.stage_id}' not found")
        stage_id = stage.id
    
    try:
        # Parse contact_id if provided
        contact_id = None
        if deal.contact:
            try:
                contact_id = uuid.UUID(deal.contact) if deal.contact else None
            except (ValueError, AttributeError):
                pass  # If it's not a UUID, ignore it
        
        new_deal = DealModel(
            title=deal.title,
            value=deal.value,
            stage_id=stage_id,
            pipeline_id=pipeline_id,
            contact_id=contact_id,
            description=deal.description,
            expected_close_date=deal.expected_close_date,
            owner_id=user_id,
            status=DealStatus.OPEN,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(new_deal)
        db.commit()
        db.refresh(new_deal)
        
        return {
            "id": str(new_deal.id),
            "title": new_deal.title,
            "value": new_deal.value,
            "stage_id": str(new_deal.stage_id),
            "pipeline_id": str(new_deal.pipeline_id),
            "contact_id": str(new_deal.contact_id) if new_deal.contact_id else None,
            "created_at": new_deal.created_at,
            "message": "Deal created successfully"
        }
    except Exception as e:
        db.rollback()
        print(f"Error creating deal: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Failed to create deal: {str(e)}")


@router.get("/{deal_id}")
def get_deal(
    deal_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific deal"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    deal = db.query(DealModel).filter(
        and_(
            DealModel.id == uuid.UUID(deal_id),
            DealModel.owner_id == user_id,
            DealModel.is_deleted == False
        )
    ).first()
    
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    return {
        "id": str(deal.id),
        "title": deal.title,
        "value": deal.value,
        "stage_id": str(deal.stage_id),
        "pipeline_id": str(deal.pipeline_id),
        "company": deal.company,
        "contact": deal.contact_person,
        "description": deal.description,
        "expected_close_date": deal.expected_close_date.isoformat() if deal.expected_close_date else None,
        "created_at": deal.created_at,
        "updated_at": deal.updated_at
    }


@router.patch("/{deal_id}")
def update_deal(
    deal_id: str,
    deal_data: dict,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a specific deal"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    deal = db.query(DealModel).filter(
        and_(
            DealModel.id == uuid.UUID(deal_id),
            DealModel.owner_id == user_id,
            DealModel.is_deleted == False
        )
    ).first()
    
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Update fields
    for field, value in deal_data.items():
        if hasattr(deal, field) and value is not None:
            if field in ['stage_id', 'pipeline_id']:
                setattr(deal, field, uuid.UUID(value))
            else:
                setattr(deal, field, value)
    
    deal.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(deal)
    
    return {
        "id": str(deal.id),
        "title": deal.title,
        "value": deal.value,
        "stage_id": str(deal.stage_id),
        "pipeline_id": str(deal.pipeline_id),
        "company": deal.company,
        "contact": deal.contact_person,
        "description": deal.description,
        "updated_at": deal.updated_at
    }


@router.delete("/{deal_id}")
def delete_deal(
    deal_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a specific deal"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    deal = db.query(DealModel).filter(
        and_(
            DealModel.id == uuid.UUID(deal_id),
            DealModel.owner_id == user_id,
            DealModel.is_deleted == False
        )
    ).first()
    
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Soft delete
    deal.is_deleted = True
    deal.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Deal deleted successfully"}


@router.patch("/{deal_id}/move")
def move_deal_stage(
    deal_id: str,
    stage_data: dict,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Move deal to different stage"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    deal = db.query(DealModel).filter(
        and_(
            DealModel.id == uuid.UUID(deal_id),
            DealModel.owner_id == user_id,
            DealModel.is_deleted == False
        )
    ).first()
    
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    deal.stage_id = uuid.UUID(stage_data.get("to_stage_id", str(deal.stage_id)))
    deal.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(deal)
    
    return {
        "id": str(deal.id),
        "title": deal.title,
        "value": deal.value,
        "stage_id": str(deal.stage_id),
        "pipeline_id": str(deal.pipeline_id),
        "company": deal.company,
        "contact": deal.contact_person,
        "updated_at": deal.updated_at
    }
