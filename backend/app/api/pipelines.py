"""
Pipeline and Pipeline Stage API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, validator
from ..core.security import get_current_active_user
from ..core.database import get_db
from ..models import Pipeline, PipelineStage, Deal
from datetime import datetime

router = APIRouter()


# Pydantic models
class StageCreate(BaseModel):
    name: str
    description: Optional[str] = None
    probability: float = 0.0
    order_index: int
    is_closed: bool = False
    is_won: bool = False
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Stage name is required')
        if len(v) > 100:
            raise ValueError('Stage name cannot exceed 100 characters')
        return v.strip()


class StageUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    probability: Optional[float] = None
    is_closed: Optional[bool] = None
    is_won: Optional[bool] = None


class StageReorder(BaseModel):
    id: str
    order_index: int


class StageReorderRequest(BaseModel):
    stages: List[StageReorder]


class PipelineCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: bool = False


# Pipeline endpoints
@router.get("/pipelines")
async def get_pipelines(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get all pipelines for current user's company"""
    company_id = current_user.get('company_id')
    
    # All users (including super admin) see only their company's pipelines
    if company_id:
        pipelines = db.query(Pipeline).filter(
            Pipeline.is_deleted == False,
            Pipeline.company_id == company_id
        ).all()
    else:
        pipelines = []
    
    return pipelines


@router.post("/pipelines")
async def create_pipeline(
    pipeline: PipelineCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new pipeline for current user's company"""
    company_id = current_user.get('company_id')
    if not company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
    
    new_pipeline = Pipeline(
        name=pipeline.name,
        description=pipeline.description,
        is_default=pipeline.is_default,
        company_id=company_id
    )
    db.add(new_pipeline)
    db.commit()
    db.refresh(new_pipeline)
    return new_pipeline


@router.get("/pipelines/{pipeline_id}")
async def get_pipeline(
    pipeline_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get pipeline by ID with stages (company-scoped)"""
    company_id = current_user.get('company_id')
    pipeline = db.query(Pipeline).filter(
        Pipeline.id == pipeline_id,
        Pipeline.is_deleted == False,
        Pipeline.company_id == company_id
    ).first()
    
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    return pipeline


@router.patch("/pipelines/{pipeline_id}")
async def update_pipeline(
    pipeline_id: str,
    pipeline_update: PipelineCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Update pipeline"""
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    pipeline.name = pipeline_update.name
    pipeline.description = pipeline_update.description
    pipeline.is_default = pipeline_update.is_default
    pipeline.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(pipeline)
    return pipeline


@router.delete("/pipelines/{pipeline_id}")
async def delete_pipeline(
    pipeline_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Soft delete pipeline"""
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Check if there are deals in this pipeline
    deal_count = db.query(Deal).filter(
        Deal.pipeline_id == pipeline_id,
        Deal.is_deleted == False
    ).count()
    
    if deal_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete pipeline with {deal_count} active deals"
        )
    
    pipeline.is_deleted = True
    pipeline.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Pipeline deleted successfully"}


# Pipeline Stage endpoints
@router.get("/pipelines/{pipeline_id}/stages")
async def get_pipeline_stages(
    pipeline_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get all stages for a pipeline"""
    stages = db.query(PipelineStage).filter(
        PipelineStage.pipeline_id == pipeline_id,
        PipelineStage.is_deleted == False
    ).order_by(PipelineStage.order_index).all()
    
    return stages


@router.post("/pipelines/{pipeline_id}/stages")
async def create_stage(
    pipeline_id: str,
    stage: StageCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new stage in pipeline"""
    # Verify pipeline exists
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Additional validation
    if len(stage.name) > 100:
        raise HTTPException(status_code=400, detail="Stage name cannot exceed 100 characters")
    
    try:
        new_stage = PipelineStage(
            pipeline_id=pipeline_id,
            name=stage.name,
            description=stage.description,
            probability=stage.probability,
            order_index=stage.order_index,
            is_closed=stage.is_closed,
            is_won=stage.is_won
        )
        
        db.add(new_stage)
        db.commit()
        db.refresh(new_stage)
        
        return new_stage
    except Exception as e:
        db.rollback()
        print(f"Error creating stage: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/pipeline-stages/{stage_id}")
async def update_stage(
    stage_id: str,
    stage_update: StageUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Update pipeline stage"""
    stage = db.query(PipelineStage).filter(PipelineStage.id == stage_id).first()
    
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    if stage_update.name is not None:
        stage.name = stage_update.name
    if stage_update.description is not None:
        stage.description = stage_update.description
    if stage_update.probability is not None:
        stage.probability = stage_update.probability
    if stage_update.is_closed is not None:
        stage.is_closed = stage_update.is_closed
    if stage_update.is_won is not None:
        stage.is_won = stage_update.is_won
    
    stage.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(stage)
    
    return stage


@router.delete("/pipeline-stages/{stage_id}")
async def delete_stage(
    stage_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Delete pipeline stage"""
    stage = db.query(PipelineStage).filter(PipelineStage.id == stage_id).first()
    
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    # Check if there are deals in this stage
    deal_count = db.query(Deal).filter(
        Deal.stage_id == stage_id,
        Deal.is_deleted == False
    ).count()
    
    if deal_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete stage with {deal_count} active deals. Please move them first."
        )
    
    stage.is_deleted = True
    stage.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Stage deleted successfully"}


@router.patch("/pipelines/{pipeline_id}/reorder-stages")
async def reorder_stages(
    pipeline_id: str,
    request: StageReorderRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Reorder pipeline stages (drag-and-drop)"""
    # Verify pipeline exists
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Update order_index for each stage
    for stage_data in request.stages:
        stage = db.query(PipelineStage).filter(
            PipelineStage.id == stage_data.id
        ).first()
        
        if stage:
            stage.order_index = stage_data.order_index
            stage.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Stages reordered successfully"}
