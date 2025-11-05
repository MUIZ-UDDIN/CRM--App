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
    description: Optional[str] = None
    trigger: Optional[str] = None  # For backward compatibility
    trigger_type: Optional[str] = None  # New field from frontend
    is_active: bool = False


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    trigger_type: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/", response_model=List[WorkflowResponse])
async def get_workflows(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all workflows for the company"""
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    query = db.query(Workflow).filter(
        and_(
            Workflow.company_id == company_id,
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
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    # Check for duplicate workflow name
    existing_workflow = db.query(Workflow).filter(
        and_(
            Workflow.company_id == company_id,
            Workflow.name.ilike(workflow_data.name.strip()),
            Workflow.is_deleted == False
        )
    ).first()
    
    if existing_workflow:
        raise HTTPException(status_code=400, detail="A workflow with this name already exists")
    
    # Handle both trigger and trigger_type (frontend sends trigger_type)
    trigger_value = workflow_data.trigger_type or workflow_data.trigger or "manual"
    
    # Validate trigger type
    try:
        trigger_type = WorkflowTrigger(trigger_value)
    except ValueError:
        trigger_type = WorkflowTrigger.SCHEDULED
    
    # Determine status from is_active
    status = WorkflowStatus.ACTIVE if workflow_data.is_active else WorkflowStatus.INACTIVE
    
    new_workflow = Workflow(
        name=workflow_data.name,
        description=workflow_data.description,
        trigger_type=trigger_type,
        status=status,
        actions=[],  # Empty actions array
        owner_id=user_id,
        company_id=company_id
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
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    workflow = db.query(Workflow).filter(
        and_(
            Workflow.id == uuid.UUID(workflow_id),
            Workflow.company_id == company_id,
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
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    workflow = db.query(Workflow).filter(
        and_(
            Workflow.id == uuid.UUID(workflow_id),
            Workflow.company_id == company_id,
            Workflow.is_deleted == False
        )
    ).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Check for duplicate workflow name (excluding current workflow)
    if workflow_data.name:
        existing_workflow = db.query(Workflow).filter(
            and_(
                Workflow.company_id == company_id,
                Workflow.id != uuid.UUID(workflow_id),
                Workflow.name.ilike(workflow_data.name.strip()),
                Workflow.is_deleted == False
            )
        ).first()
        
        if existing_workflow:
            raise HTTPException(status_code=400, detail="A workflow with this name already exists")
    
    if workflow_data.name:
        workflow.name = workflow_data.name
    if workflow_data.description is not None:
        workflow.description = workflow_data.description
    if workflow_data.trigger_type:
        try:
            workflow.trigger_type = WorkflowTrigger(workflow_data.trigger_type)
        except ValueError:
            pass
    if workflow_data.is_active is not None:
        workflow.status = WorkflowStatus.ACTIVE if workflow_data.is_active else WorkflowStatus.INACTIVE
    elif workflow_data.status:
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
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    workflow = db.query(Workflow).filter(
        and_(
            Workflow.id == uuid.UUID(workflow_id),
            Workflow.company_id == company_id,
            Workflow.is_deleted == False
        )
    ).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow.is_deleted = True
    db.commit()
    
    return {"message": "Workflow deleted successfully"}


class WorkflowToggleRequest(BaseModel):
    is_active: bool


@router.post("/{workflow_id}/toggle")
async def toggle_workflow(
    workflow_id: str,
    toggle_data: WorkflowToggleRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Toggle workflow status between active and inactive"""
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    workflow = db.query(Workflow).filter(
        and_(
            Workflow.id == uuid.UUID(workflow_id),
            Workflow.company_id == company_id,
            Workflow.is_deleted == False
        )
    ).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Set status based on the request
    if toggle_data.is_active:
        workflow.status = WorkflowStatus.ACTIVE
    else:
        workflow.status = WorkflowStatus.INACTIVE
    
    db.commit()
    db.refresh(workflow)
    
    return {"message": f"Workflow {workflow.status.value}", "status": workflow.status.value}


@router.post("/{workflow_id}/execute")
async def execute_workflow_manually(
    workflow_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Manually execute a workflow for testing"""
    from app.services.workflow_executor import WorkflowExecutor
    
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    # Verify workflow belongs to company
    workflow = db.query(Workflow).filter(
        and_(
            Workflow.id == uuid.UUID(workflow_id),
            Workflow.company_id == company_id,
            Workflow.is_deleted == False
        )
    ).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    try:
        executor = WorkflowExecutor(db)
        execution = await executor.execute_workflow_manually(
            workflow_id=uuid.UUID(workflow_id),
            trigger_data={"manual_execution": True, "user_id": str(user_id)}
        )
        
        return {
            "message": "Workflow executed",
            "execution_id": str(execution.id),
            "status": execution.status,
            "success_count": execution.success_count,
            "failure_count": execution.failure_count,
            "duration_seconds": execution.duration_seconds
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")


@router.get("/{workflow_id}/executions")
async def get_workflow_executions(
    workflow_id: str,
    limit: int = 50,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get execution history for a workflow"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Verify workflow belongs to user
    workflow = db.query(Workflow).filter(
        and_(
            Workflow.id == uuid.UUID(workflow_id),
            Workflow.owner_id == user_id,
            Workflow.is_deleted == False
        )
    ).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    executions = db.query(WorkflowExecution).filter(
        WorkflowExecution.workflow_id == uuid.UUID(workflow_id)
    ).order_by(desc(WorkflowExecution.started_at)).limit(limit).all()
    
    return [
        {
            "id": str(execution.id),
            "status": execution.status,
            "started_at": execution.started_at.isoformat() if execution.started_at else None,
            "completed_at": execution.completed_at.isoformat() if execution.completed_at else None,
            "duration_seconds": execution.duration_seconds,
            "success_count": execution.success_count,
            "failure_count": execution.failure_count,
            "error_message": execution.error_message,
            "trigger_data": execution.trigger_data
        }
        for execution in executions
    ]
