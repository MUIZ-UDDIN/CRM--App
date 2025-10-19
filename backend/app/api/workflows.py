"""
Workflows API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.core.security import get_current_active_user
from app.core.database import get_db
from app.models.workflows import Workflow, WorkflowExecution, WorkflowStatus, WorkflowTrigger

router = APIRouter()


# Pydantic Models
class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    trigger: str
    actions_count: int
    executions_count: int
    last_run: Optional[str]
    created_at: str
    
    class Config:
        from_attributes = True


class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str]
    trigger: str
    status: str = "draft"


class WorkflowUpdate(BaseModel):
    name: Optional[str]
    description: Optional[str]
    status: Optional[str]


@router.get("/", response_model=List[WorkflowResponse])
async def get_workflows(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all workflows for the current user"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    query = db.query(Workflow).filter(
        and_(
            Workflow.owner_id == user_id,
            Workflow.is_deleted == False
        )
    )
    
    if status:
        query = query.filter(Workflow.status == status)
    
    workflows = query.order_by(desc(Workflow.created_at)).all()
    
    return [
        WorkflowResponse(
            id=str(workflow.id),
            name=workflow.name,
            description=workflow.description,
            status=workflow.status.value if workflow.status else "draft",
            trigger=workflow.trigger_type.value if workflow.trigger_type else "manual",
            actions_count=len(workflow.actions) if workflow.actions else 0,
            executions_count=workflow.execution_count or 0,
            last_run=workflow.last_executed_at.isoformat() if workflow.last_executed_at else None,
            created_at=workflow.created_at.isoformat() if workflow.created_at else None
        )
        for workflow in workflows
    ]


@router.post("/", response_model=WorkflowResponse)
async def create_workflow(
    workflow_data: WorkflowCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new workflow"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Validate trigger type
    try:
        trigger_type = WorkflowTrigger(workflow_data.trigger)
    except ValueError:
        trigger_type = WorkflowTrigger.SCHEDULED
    
    # Validate status
    try:
        status = WorkflowStatus(workflow_data.status)
    except ValueError:
        status = WorkflowStatus.INACTIVE
    
    new_workflow = Workflow(
        name=workflow_data.name,
        description=workflow_data.description,
        trigger_type=trigger_type,
        status=status,
        actions=[],  # Empty actions array
        owner_id=user_id
    )
    
    db.add(new_workflow)
    db.commit()
    db.refresh(new_workflow)
    
    return WorkflowResponse(
        id=str(new_workflow.id),
        name=new_workflow.name,
        description=new_workflow.description,
        status=new_workflow.status.value,
        trigger=new_workflow.trigger_type.value,
        actions_count=0,
        executions_count=0,
        last_run=None,
        created_at=new_workflow.created_at.isoformat() if new_workflow.created_at else None
    )


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific workflow"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    workflow = db.query(Workflow).filter(
        and_(
            Workflow.id == uuid.UUID(workflow_id),
            Workflow.owner_id == user_id,
            Workflow.is_deleted == False
        )
    ).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    return WorkflowResponse(
        id=str(workflow.id),
        name=workflow.name,
        description=workflow.description,
        status=workflow.status.value,
        trigger=workflow.trigger_type.value,
        actions_count=len(workflow.actions) if workflow.actions else 0,
        executions_count=workflow.execution_count or 0,
        last_run=workflow.last_executed_at.isoformat() if workflow.last_executed_at else None,
        created_at=workflow.created_at.isoformat() if workflow.created_at else None
    )


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: str,
    workflow_data: WorkflowUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a workflow"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    workflow = db.query(Workflow).filter(
        and_(
            Workflow.id == uuid.UUID(workflow_id),
            Workflow.owner_id == user_id,
            Workflow.is_deleted == False
        )
    ).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    if workflow_data.name:
        workflow.name = workflow_data.name
    if workflow_data.description is not None:
        workflow.description = workflow_data.description
    if workflow_data.status:
        try:
            workflow.status = WorkflowStatus(workflow_data.status)
        except ValueError:
            pass
    
    db.commit()
    db.refresh(workflow)
    
    return WorkflowResponse(
        id=str(workflow.id),
        name=workflow.name,
        description=workflow.description,
        status=workflow.status.value,
        trigger=workflow.trigger_type.value,
        actions_count=len(workflow.actions) if workflow.actions else 0,
        executions_count=workflow.execution_count or 0,
        last_run=workflow.last_executed_at.isoformat() if workflow.last_executed_at else None,
        created_at=workflow.created_at.isoformat() if workflow.created_at else None
    )


@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a workflow"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    workflow = db.query(Workflow).filter(
        and_(
            Workflow.id == uuid.UUID(workflow_id),
            Workflow.owner_id == user_id,
            Workflow.is_deleted == False
        )
    ).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow.is_deleted = True
    db.commit()
    
    return {"message": "Workflow deleted successfully"}


@router.post("/{workflow_id}/toggle")
async def toggle_workflow(
    workflow_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Toggle workflow status between active and paused"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    workflow = db.query(Workflow).filter(
        and_(
            Workflow.id == uuid.UUID(workflow_id),
            Workflow.owner_id == user_id,
            Workflow.is_deleted == False
        )
    ).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    if workflow.status == WorkflowStatus.ACTIVE:
        workflow.status = WorkflowStatus.PAUSED
    else:
        workflow.status = WorkflowStatus.ACTIVE
    
    db.commit()
    
    return {"message": f"Workflow {workflow.status.value}"}
