"""
Pipeline and Pipeline Stage API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, validator
from ..core.security import get_current_active_user
from ..core.database import get_db
from ..models import Pipeline, PipelineStage, Deal
from datetime import datetime
from ..middleware.tenant import get_tenant_context
from ..middleware.permissions import has_permission
from ..models.permissions import Permission

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
    """Get all pipelines - Super Admin sees ALL companies, others see only their company"""
    from sqlalchemy.orm import joinedload
    
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    
    # Super Admin sees ALL pipelines from ALL companies
    if context.is_super_admin():
        pipelines = db.query(Pipeline).options(
            joinedload(Pipeline.stages)
        ).filter(
            Pipeline.is_deleted == False
        ).all()
    # Other users see only their company's pipelines
    elif company_id:
        pipelines = db.query(Pipeline).options(
            joinedload(Pipeline.stages)
        ).filter(
            Pipeline.is_deleted == False,
            Pipeline.company_id == company_id
        ).all()
    else:
        pipelines = []
    
    # Convert to dict to ensure stages are included
    result = []
    for pipeline in pipelines:
        result.append({
            "id": str(pipeline.id),
            "name": pipeline.name,
            "description": pipeline.description,
            "is_default": pipeline.is_default,
            "order_index": pipeline.order_index,
            "company_id": str(pipeline.company_id) if pipeline.company_id else None,
            "stages": [
                {
                    "id": str(stage.id),
                    "name": stage.name,
                    "description": stage.description,
                    "order_index": stage.order_index,
                    "probability": stage.probability,
                    "is_closed": stage.is_closed,
                    "is_won": stage.is_won
                }
                for stage in sorted(pipeline.stages, key=lambda s: s.order_index)
                if not stage.is_deleted
            ]
        })
    
    return result


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
    
    # Send notifications
    try:
        from app.services.notification_service import NotificationService
        from app.models.users import User
        import uuid
        
        user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
        creator = db.query(User).filter(User.id == user_id).first()
        creator_name = f"{creator.first_name} {creator.last_name}" if creator else "Unknown User"
        
        NotificationService.notify_pipeline_created(
            db=db,
            pipeline_id=new_pipeline.id,
            pipeline_name=new_pipeline.name,
            creator_id=user_id,
            creator_name=creator_name,
            company_id=uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        )
    except Exception as notification_error:
        print(f"Notification error: {notification_error}")
    
    # Broadcast creation to all connected clients
    try:
        from app.services.websocket_manager import broadcast_entity_change
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(broadcast_entity_change(
                company_id=str(company_id),
                entity_type="pipeline",
                action="created",
                entity_id=str(new_pipeline.id),
                data={"id": str(new_pipeline.id), "name": new_pipeline.name}
            ))
    except Exception as ws_error:
        print(f"WebSocket broadcast error: {ws_error}")
    
    return new_pipeline


@router.get("/pipelines/{pipeline_id}")
async def get_pipeline(
    pipeline_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get pipeline by ID with stages - Super Admin sees ALL companies, others see only their company"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    
    # Super Admin can access pipelines from ANY company
    if context.is_super_admin():
        pipeline = db.query(Pipeline).filter(
            Pipeline.id == pipeline_id,
            Pipeline.is_deleted == False
        ).first()
    # Other users can only access their company's pipelines
    else:
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
    from ..models.companies import Company
    
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Super Admin can ONLY edit pipelines from their own company
    if context.is_super_admin():
        super_admin_company_id = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        if pipeline.company_id != super_admin_company_id:
            # Get the company name for the error message
            pipeline_company = db.query(Company).filter(Company.id == pipeline.company_id).first()
            company_name = pipeline_company.name if pipeline_company else "another company"
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You cannot edit this pipeline. It belongs to '{company_name}'. Super Admins can only edit pipelines from their own company."
            )
    
    pipeline.name = pipeline_update.name
    pipeline.description = pipeline_update.description
    pipeline.is_default = pipeline_update.is_default
    pipeline.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(pipeline)
    
    # Broadcast update to all connected clients
    try:
        from app.services.websocket_manager import broadcast_entity_change
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(broadcast_entity_change(
                company_id=str(pipeline.company_id),
                entity_type="pipeline",
                action="updated",
                entity_id=str(pipeline.id),
                data={"id": str(pipeline.id), "name": pipeline.name}
            ))
    except Exception as ws_error:
        print(f"WebSocket broadcast error: {ws_error}")
    
    return pipeline


@router.delete("/pipelines/{pipeline_id}")
async def delete_pipeline(
    pipeline_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Soft delete pipeline - Only Admins (CRM Customization)"""
    from ..models.companies import Company
    
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    
    # Only Super Admin and Company Admin can delete pipelines (CRM customization)
    if not (context.is_super_admin() or has_permission(current_user, Permission.CUSTOMIZE_COMPANY_CRM)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete pipelines. Only administrators can modify CRM customization settings."
        )
    
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    
    if not pipeline:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline not found")
    
    # Super Admin can ONLY delete pipelines from their own company
    if context.is_super_admin():
        super_admin_company_id = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        if pipeline.company_id != super_admin_company_id:
            # Get the company name for the error message
            pipeline_company = db.query(Company).filter(Company.id == pipeline.company_id).first()
            company_name = pipeline_company.name if pipeline_company else "another company"
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You cannot delete this pipeline. It belongs to '{company_name}'. Super Admins can only delete pipelines from their own company."
            )
    
    # Check if there are deals in this pipeline
    deal_count = db.query(Deal).filter(
        Deal.pipeline_id == pipeline_id,
        Deal.is_deleted == False
    ).count()
    
    if deal_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete pipeline with {deal_count} active deals"
        )
    
    # Permanent delete - CASCADE will handle related stages
    db.delete(pipeline)
    db.commit()
    
    # Send deletion notification
    try:
        from app.services.notification_service import NotificationService
        from app.models.users import User
        deleter = db.query(User).filter(User.id == uuid.UUID(current_user['id'])).first()
        deleter_name = f"{deleter.first_name} {deleter.last_name}" if deleter else "Unknown User"
        
        NotificationService.notify_pipeline_deleted(
            db=db,
            pipeline_name=pipeline.name,
            deleter_id=uuid.UUID(current_user['id']),
            deleter_name=deleter_name,
            company_id=pipeline.company_id
        )
    except Exception as e:
        print(f"⚠️ Failed to send pipeline deletion notification: {e}")
    
    # Broadcast deletion to all connected clients
    try:
        from app.services.websocket_manager import broadcast_entity_change
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(broadcast_entity_change(
                company_id=str(pipeline.company_id),
                entity_type="pipeline",
                action="deleted",
                entity_id=str(pipeline_id)
            ))
    except Exception as ws_error:
        print(f"WebSocket broadcast error: {ws_error}")
    
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
        
        # Broadcast WebSocket event for real-time sync
        try:
            from app.services.websocket_manager import broadcast_entity_change
            import asyncio
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(broadcast_entity_change(
                    company_id=str(pipeline.company_id),
                    entity_type="pipeline_stage",
                    action="created",
                    entity_id=str(new_stage.id),
                    data={
                        "id": str(new_stage.id),
                        "pipeline_id": str(pipeline_id),
                        "name": new_stage.name
                    }
                ))
        except Exception as ws_error:
            print(f"WebSocket broadcast error: {ws_error}")
        
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
    
    # Broadcast WebSocket event for real-time sync
    try:
        from app.services.websocket_manager import broadcast_entity_change
        import asyncio
        # Get pipeline to access company_id
        pipeline = db.query(Pipeline).filter(Pipeline.id == stage.pipeline_id).first()
        if pipeline:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(broadcast_entity_change(
                    company_id=str(pipeline.company_id),
                    entity_type="pipeline_stage",
                    action="updated",
                    entity_id=str(stage.id),
                    data={
                        "id": str(stage.id),
                        "pipeline_id": str(stage.pipeline_id),
                        "name": stage.name
                    }
                ))
    except Exception as ws_error:
        print(f"WebSocket broadcast error: {ws_error}")
    
    return stage


@router.delete("/pipeline-stages/{stage_id}")
async def delete_stage(
    stage_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Delete pipeline stage - Only Admins (CRM Customization)"""
    context = get_tenant_context(current_user)
    
    # Only Super Admin and Company Admin can delete stages (CRM customization)
    if not (context.is_super_admin() or has_permission(current_user, Permission.CUSTOMIZE_COMPANY_CRM)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete pipeline stages. Only administrators can modify CRM customization settings."
        )
    
    stage = db.query(PipelineStage).filter(PipelineStage.id == stage_id).first()
    
    if not stage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stage not found")
    
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
    
    # Get pipeline before deleting to access company_id
    pipeline = db.query(Pipeline).filter(Pipeline.id == stage.pipeline_id).first()
    
    # Permanent delete
    db.delete(stage)
    db.commit()
    
    # Broadcast WebSocket event for real-time sync
    try:
        from app.services.websocket_manager import broadcast_entity_change
        import asyncio
        if pipeline:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(broadcast_entity_change(
                    company_id=str(pipeline.company_id),
                    entity_type="pipeline_stage",
                    action="deleted",
                    entity_id=str(stage_id),
                    data=None
                ))
    except Exception as ws_error:
        print(f"WebSocket broadcast error: {ws_error}")
    
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
