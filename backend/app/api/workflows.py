"""
Workflows API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import List, Optional
from pydantic import BaseModel, UUID4
from datetime import datetime
import uuid

from app.core.security import get_current_active_user
from app.core.database import get_db
from app.models.workflows import Workflow, WorkflowExecution, WorkflowStatus, WorkflowTrigger
from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

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
    status: Optional[str] = None  # For 3-state support: 'active', 'paused', 'inactive'
    is_active: Optional[bool] = None  # For backward compatibility


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    trigger_type: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/", response_model=List[WorkflowResponse])
async def get_workflows(
    status: Optional[str] = None,
    scope: Optional[str] = None,  # company, team, user
    team_id: Optional[UUID4] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get workflows based on role permissions"""
    context = get_tenant_context(current_user)
    company_id = current_user.get("company_id")
    user_id = current_user.get("id")
    user_team_id = current_user.get("team_id")
    
    if not company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No company associated with user")
    
    # Convert to UUID
    company_id_uuid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
    
    # Base query - filter by company and not deleted
    query = db.query(Workflow).filter(
        and_(
            Workflow.company_id == company_id_uuid,
            Workflow.is_deleted == False
        )
    )
    
    # Apply permission-based filters
    # Note: Workflow model doesn't have 'scope' or 'team_id' fields
    # Filtering by company_id and owner_id only
    if context.is_super_admin() or has_permission(current_user, Permission.MANAGE_COMPANY_AUTOMATIONS):
        # Can see all workflows in the company
        pass
    elif has_permission(current_user, Permission.MANAGE_TEAM_AUTOMATIONS):
        # Can see all workflows in company (team managers have broad access)
        pass
    elif has_permission(current_user, Permission.USE_PERSONAL_AUTOMATIONS):
        # Can only see their own workflows
        query = query.filter(Workflow.owner_id == user_id)
    else:
        # No permissions to view workflows
        return []
    
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
    scope: Optional[str] = "user",  # company, team, user
    team_id: Optional[UUID4] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new workflow based on role permissions"""
    context = get_tenant_context(current_user)
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    user_team_id = current_user.get("team_id")
    
    if not company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No company associated with user")
    
    # Check permissions based on scope
    if scope == "company":
        if not has_permission(current_user, Permission.MANAGE_COMPANY_AUTOMATIONS) and not context.is_super_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to create company-wide workflows"
            )
    elif scope == "team":
        if not has_permission(current_user, Permission.MANAGE_TEAM_AUTOMATIONS) and not context.is_super_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to create team workflows"
            )
        
        # Check if team_id is provided
        if not team_id and not user_team_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="team_id is required for team scope workflows"
            )
        
        # Use user's team if team_id not provided
        if not team_id:
            team_id = user_team_id
        
        # Check if user has access to the team
        if not context.is_super_admin() and not has_permission(current_user, Permission.MANAGE_COMPANY_AUTOMATIONS):
            if str(team_id) != str(user_team_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only create workflows for your own team"
                )
    elif scope == "user":
        if not has_permission(current_user, Permission.USE_PERSONAL_AUTOMATIONS) and not context.is_super_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to create personal workflows"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid scope. Must be one of: company, team, user"
        )
    
    # Check for duplicate workflow name based on scope
    # Note: Workflow model uses owner_id (not created_by) and doesn't have scope/team_id fields
    # So we do a simple check for user's own workflows only
    if scope == "user":
        existing_workflow = db.query(Workflow).filter(
            and_(
                Workflow.company_id == company_id,
                Workflow.owner_id == user_id,
                Workflow.name.ilike(workflow_data.name.strip()),
                Workflow.is_deleted == False
            )
        ).first()
        
        if existing_workflow:
            raise HTTPException(status_code=400, detail="You already have a workflow with this name")
    # For team and company scopes, allow duplicate names since we can't filter by scope/team
    # This is acceptable as workflows are primarily identified by ID
    
    # Handle both trigger and trigger_type (frontend sends trigger_type)
    trigger_value = workflow_data.trigger_type or workflow_data.trigger or "manual"
    
    # Validate trigger type
    try:
        trigger_type = WorkflowTrigger(trigger_value)
    except ValueError:
        trigger_type = WorkflowTrigger.SCHEDULED
    
    # Determine status - prioritize status field for 3-state support
    if workflow_data.status:
        try:
            status = WorkflowStatus(workflow_data.status)
        except ValueError:
            status = WorkflowStatus.PAUSED  # Default to paused if invalid
    elif workflow_data.is_active is not None:
        # Fallback to is_active for backward compatibility
        status = WorkflowStatus.PAUSED if workflow_data.is_active else WorkflowStatus.INACTIVE
    else:
        status = WorkflowStatus.PAUSED  # Default status
    
    new_workflow = Workflow(
        name=workflow_data.name,
        description=workflow_data.description,
        trigger_type=trigger_type,
        status=status,
        actions=[],  # Empty actions array
        owner_id=user_id,
        company_id=company_id
        # Note: Workflow model doesn't have scope or team_id fields
        # Scope is determined by owner_id and permissions
    )
    
    db.add(new_workflow)
    db.commit()
    db.refresh(new_workflow)
    
    # Send notifications
    try:
        from app.services.notification_service import NotificationService
        from app.models.users import User
        
        creator = db.query(User).filter(User.id == user_id).first()
        creator_name = f"{creator.first_name} {creator.last_name}" if creator else "Unknown User"
        
        NotificationService.notify_workflow_created(
            db=db,
            workflow_id=new_workflow.id,
            workflow_name=new_workflow.name,
            creator_id=user_id,
            creator_name=creator_name,
            company_id=company_id
        )
    except Exception as notification_error:
        print(f"Notification error: {notification_error}")
    
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
    # Prioritize status field over is_active for 3-state support
    if workflow_data.status:
        try:
            workflow.status = WorkflowStatus(workflow_data.status)
        except ValueError:
            pass
    elif workflow_data.is_active is not None:
        # Fallback to is_active for backward compatibility
        workflow.status = WorkflowStatus.PAUSED if workflow_data.is_active else WorkflowStatus.INACTIVE
    
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
    """Delete a workflow - Based on scope and role"""
    context = get_tenant_context(current_user)
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    if not company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No company associated with user")
    
    workflow = db.query(Workflow).filter(
        and_(
            Workflow.id == uuid.UUID(workflow_id),
            Workflow.company_id == company_id,
            Workflow.is_deleted == False
        )
    ).first()
    
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")
    
    # Permission check based on workflow ownership
    # Note: Workflow model doesn't have scope/team_id/created_by fields, only owner_id
    if context.is_super_admin():
        # Super admin can delete any workflow
        pass
    elif has_permission(current_user, Permission.MANAGE_COMPANY_AUTOMATIONS):
        # Company admin can delete any workflow in their company
        pass
    elif has_permission(current_user, Permission.MANAGE_TEAM_AUTOMATIONS):
        # Sales manager can delete workflows owned by their team members
        from app.models.users import User
        team_user_ids = [str(u.id) for u in db.query(User).filter(
            User.team_id == user_team_id,
            User.is_deleted == False
        ).all()]
        
        if str(workflow.owner_id) not in team_user_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="You can only delete workflows owned by your team members."
            )
    else:
        # Sales reps can only delete their own workflows
        if str(workflow.owner_id) != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="You can only delete your own workflows."
            )
    
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
    """Toggle workflow execution state (running/paused) for active workflows"""
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
    
    # Only allow toggling if workflow is active or paused
    if workflow.status == WorkflowStatus.INACTIVE:
        raise HTTPException(status_code=400, detail="Cannot start/stop an inactive workflow. Please activate it first.")
    
    # Toggle between ACTIVE (running) and PAUSED (stopped)
    if toggle_data.is_active:
        workflow.status = WorkflowStatus.ACTIVE  # Running
    else:
        workflow.status = WorkflowStatus.PAUSED  # Stopped but still enabled
    
    db.commit()
    db.refresh(workflow)
    
    return {"message": f"Workflow {workflow.status.value}", "status": workflow.status.value, "is_running": workflow.status == WorkflowStatus.ACTIVE}


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
