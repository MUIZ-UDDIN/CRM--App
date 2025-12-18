"""
Workflow Templates API - Global templates by Super Admin
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
import uuid

from app.core.security import get_current_active_user
from app.core.database import get_db
from app.models.workflow_templates import WorkflowTemplate, TemplateUsage, TemplateCategory
from app.models.workflows import Workflow, WorkflowTrigger, WorkflowStatus
from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

router = APIRouter(prefix="/workflow-templates", tags=["Workflow Templates"])


class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    trigger_type: str
    trigger_config: Optional[Dict[str, Any]] = None
    actions: Optional[List[Dict[str, Any]]] = []
    conditions: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    is_global: bool = True


class TemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    category: str
    trigger_type: str
    trigger_config: Optional[Dict[str, Any]]
    actions: List[Dict[str, Any]]
    conditions: Optional[Dict[str, Any]]
    is_global: bool
    is_active: bool
    usage_count: int
    tags: Optional[List[str]]
    created_by_id: str
    company_id: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.post("/", response_model=TemplateResponse)
async def create_template(
    template: TemplateCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a workflow template - Super Admin for global, Company Admin for company"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    
    # Check permissions
    if template.is_global:
        if not context.is_super_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admins can create global templates"
            )
        template_company_id = None
    else:
        if not has_permission(current_user, Permission.MANAGE_COMPANY_AUTOMATIONS):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to create templates"
            )
        template_company_id = uuid.UUID(company_id) if company_id else None
    
    # Validate category
    try:
        category_enum = TemplateCategory(template.category.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {[c.value for c in TemplateCategory]}"
        )
    
    # Create template
    new_template = WorkflowTemplate(
        id=uuid.uuid4(),
        name=template.name,
        description=template.description,
        category=category_enum,
        trigger_type=template.trigger_type,
        trigger_config=template.trigger_config,
        actions=template.actions,
        conditions=template.conditions,
        is_global=template.is_global,
        is_active=True,
        usage_count=0,
        tags=template.tags,
        created_by_id=uuid.UUID(user_id),
        company_id=template_company_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    
    return TemplateResponse(
        id=str(new_template.id),
        name=new_template.name,
        description=new_template.description,
        category=new_template.category.value,
        trigger_type=new_template.trigger_type,
        trigger_config=new_template.trigger_config,
        actions=new_template.actions,
        conditions=new_template.conditions,
        is_global=new_template.is_global,
        is_active=new_template.is_active,
        usage_count=new_template.usage_count,
        tags=new_template.tags,
        created_by_id=str(new_template.created_by_id),
        company_id=str(new_template.company_id) if new_template.company_id else None,
        created_at=new_template.created_at
    )


@router.get("/", response_model=List[TemplateResponse])
async def get_templates(
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get workflow templates - Global templates + company templates"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    
    # Build query - show global templates + company's own templates
    query = db.query(WorkflowTemplate).filter(WorkflowTemplate.is_active == True)
    
    if context.is_super_admin():
        # Super Admin sees all templates
        pass
    else:
        # Others see global templates + their company templates
        query = query.filter(
            or_(
                WorkflowTemplate.is_global == True,
                WorkflowTemplate.company_id == uuid.UUID(company_id) if company_id else None
            )
        )
    
    # Apply filters
    if category:
        try:
            category_enum = TemplateCategory(category.lower())
            query = query.filter(WorkflowTemplate.category == category_enum)
        except ValueError:
            pass
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                WorkflowTemplate.name.ilike(search_term),
                WorkflowTemplate.description.ilike(search_term)
            )
        )
    
    templates = query.order_by(WorkflowTemplate.usage_count.desc(), WorkflowTemplate.created_at.desc()).all()
    
    return [
        TemplateResponse(
            id=str(t.id),
            name=t.name,
            description=t.description,
            category=t.category.value,
            trigger_type=t.trigger_type,
            trigger_config=t.trigger_config,
            actions=t.actions,
            conditions=t.conditions,
            is_global=t.is_global,
            is_active=t.is_active,
            usage_count=t.usage_count,
            tags=t.tags,
            created_by_id=str(t.created_by_id),
            company_id=str(t.company_id) if t.company_id else None,
            created_at=t.created_at
        )
        for t in templates
    ]


@router.post("/{template_id}/use")
async def use_template(
    template_id: str,
    workflow_name: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a workflow from a template"""
    try:
        company_id = current_user.get('company_id')
        user_id = current_user.get('id')
        
        if not company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User must belong to a company"
            )
        
        # Get template
        template = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == uuid.UUID(template_id)).first()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Check access
        if not template.is_global and str(template.company_id) != company_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Convert trigger_type string to enum
        try:
            trigger_enum = WorkflowTrigger(template.trigger_type)
        except ValueError:
            # Default to contact_created if invalid trigger type
            trigger_enum = WorkflowTrigger.CONTACT_CREATED
        
        # Create workflow from template
        new_workflow = Workflow(
            id=uuid.uuid4(),
            name=workflow_name,
            description=f"Created from template: {template.name}",
            trigger_type=trigger_enum,
            trigger_conditions=template.trigger_config,  # Map trigger_config to trigger_conditions
            actions=template.actions if template.actions else [],
            status=WorkflowStatus.ACTIVE,
            is_active=True,
            is_deleted=False,
            owner_id=uuid.UUID(user_id),
            company_id=uuid.UUID(company_id),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(new_workflow)
        db.flush()  # Flush to get the workflow ID in database before creating usage
        
        # Track usage
        usage = TemplateUsage(
            id=uuid.uuid4(),
            template_id=template.id,
            workflow_id=new_workflow.id,
            company_id=uuid.UUID(company_id),
            created_by_id=uuid.UUID(user_id),
            created_at=datetime.utcnow()
        )
        
        db.add(usage)
        
        # Increment usage count
        template.usage_count += 1
        
        db.commit()
        db.refresh(new_workflow)
        
        return {
            "message": "Workflow created from template successfully",
            "workflow_id": str(new_workflow.id),
            "workflow_name": new_workflow.name
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create workflow from template: {str(e)}"
        )


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    trigger_type: Optional[str] = None
    tags: Optional[List[str]] = None
    is_global: Optional[bool] = None


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    template_update: TemplateUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a template - Super Admin for global, Company Admin for company"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    
    template = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == uuid.UUID(template_id)).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check permissions
    can_update = False
    if context.is_super_admin():
        can_update = True
    elif template.company_id and str(template.company_id) == company_id:
        if has_permission(current_user, Permission.MANAGE_COMPANY_AUTOMATIONS):
            can_update = True
    
    if not can_update:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update fields if provided
    if template_update.name is not None:
        template.name = template_update.name
    if template_update.description is not None:
        template.description = template_update.description
    if template_update.category is not None:
        try:
            template.category = TemplateCategory(template_update.category.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category. Must be one of: {[c.value for c in TemplateCategory]}"
            )
    if template_update.trigger_type is not None:
        template.trigger_type = template_update.trigger_type
    if template_update.tags is not None:
        template.tags = template_update.tags
    if template_update.is_global is not None:
        # Only Super Admin can change global status
        if context.is_super_admin():
            template.is_global = template_update.is_global
    
    template.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(template)
    
    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        description=template.description,
        category=template.category.value,
        trigger_type=template.trigger_type,
        trigger_config=template.trigger_config,
        actions=template.actions,
        conditions=template.conditions,
        is_global=template.is_global,
        is_active=template.is_active,
        usage_count=template.usage_count,
        tags=template.tags,
        created_by_id=str(template.created_by_id),
        company_id=str(template.company_id) if template.company_id else None,
        created_at=template.created_at
    )


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a template - Super Admin for global, Company Admin for company"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    
    template = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == uuid.UUID(template_id)).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check permissions
    can_delete = False
    if context.is_super_admin():
        can_delete = True
    elif template.company_id and str(template.company_id) == company_id:
        if has_permission(current_user, Permission.MANAGE_COMPANY_AUTOMATIONS):
            can_delete = True
    
    if not can_delete:
        raise HTTPException(status_code=403, detail="Access denied")
    
    db.delete(template)
    db.commit()
    
    return {"message": "Template deleted successfully"}


@router.get("/categories")
async def get_categories():
    """Get available template categories"""
    return {
        "categories": [
            {"value": c.value, "label": c.value.replace('_', ' ').title()}
            for c in TemplateCategory
        ]
    }
