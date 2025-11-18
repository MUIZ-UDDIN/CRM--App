"""
Global Defaults API - Super Admin can set platform-wide defaults
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
import uuid

from ..core.security import get_current_active_user
from ..core.database import get_db
from ..models.crm_defaults import GlobalPipelineDefault, GlobalFieldDefault, GlobalIntegrationTemplate
from ..models.deals import Pipeline, PipelineStage
from ..models.users import User
from ..middleware.tenant import get_tenant_context
from ..middleware.permissions import has_permission
from ..models.permissions import Permission

router = APIRouter(prefix="/global-defaults", tags=["Global Defaults"])


# ============= Pydantic Models =============

class PipelineStageConfig(BaseModel):
    name: str
    probability: int = 0
    color: Optional[str] = None


class GlobalPipelineDefaultCreate(BaseModel):
    name: str
    description: Optional[str] = None
    stages: List[PipelineStageConfig]
    apply_to_new_companies: bool = True


class GlobalPipelineDefaultResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    stages: List[Dict[str, Any]]
    is_active: bool
    apply_to_new_companies: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class GlobalFieldDefaultCreate(BaseModel):
    name: str
    field_type: str
    entity_type: str
    is_required: bool = False
    default_value: Optional[str] = None
    options: Optional[List[str]] = None
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    apply_to_new_companies: bool = True


class GlobalFieldDefaultResponse(BaseModel):
    id: str
    name: str
    field_type: str
    entity_type: str
    is_required: bool
    default_value: Optional[str]
    options: Optional[List[str]]
    placeholder: Optional[str]
    help_text: Optional[str]
    is_active: bool
    apply_to_new_companies: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class GlobalIntegrationTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    provider: str
    integration_type: str
    config_template: Dict[str, Any]
    apply_to_new_companies: bool = False


class GlobalIntegrationTemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    provider: str
    integration_type: str
    config_template: Dict[str, Any]
    is_active: bool
    apply_to_new_companies: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============= Pipeline Defaults =============

@router.post("/pipelines", response_model=GlobalPipelineDefaultResponse)
async def create_global_pipeline_default(
    pipeline: GlobalPipelineDefaultCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create global default pipeline template (Super Admin only)"""
    if not has_permission(current_user, Permission.CUSTOMIZE_GLOBAL_CRM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can create global CRM defaults"
        )
    
    # Convert stages to JSON format
    stages_json = [stage.dict() for stage in pipeline.stages]
    
    new_template = GlobalPipelineDefault(
        id=uuid.uuid4(),
        name=pipeline.name,
        description=pipeline.description,
        stages=stages_json,
        is_active=True,
        apply_to_new_companies=pipeline.apply_to_new_companies,
        created_by_id=uuid.UUID(current_user['id'])
    )
    
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    
    return {
        "id": str(new_template.id),
        "name": new_template.name,
        "description": new_template.description,
        "stages": new_template.stages,
        "is_active": new_template.is_active,
        "apply_to_new_companies": new_template.apply_to_new_companies,
        "created_at": new_template.created_at
    }


@router.get("/pipelines", response_model=List[GlobalPipelineDefaultResponse])
async def get_global_pipeline_defaults(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all global pipeline defaults"""
    if not has_permission(current_user, Permission.CUSTOMIZE_GLOBAL_CRM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can view global CRM defaults"
        )
    
    templates = db.query(GlobalPipelineDefault).filter(
        GlobalPipelineDefault.is_active == True
    ).all()
    
    return [
        {
            "id": str(t.id),
            "name": t.name,
            "description": t.description,
            "stages": t.stages,
            "is_active": t.is_active,
            "apply_to_new_companies": t.apply_to_new_companies,
            "created_at": t.created_at
        }
        for t in templates
    ]


@router.delete("/pipelines/{template_id}")
async def delete_global_pipeline_default(
    template_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete global pipeline default (Super Admin only)"""
    if not has_permission(current_user, Permission.CUSTOMIZE_GLOBAL_CRM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can delete global CRM defaults"
        )
    
    template = db.query(GlobalPipelineDefault).filter(
        GlobalPipelineDefault.id == uuid.UUID(template_id)
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template.is_active = False
    db.commit()
    
    return {"message": "Pipeline default deleted successfully"}


# ============= Custom Field Defaults =============

@router.post("/custom-fields", response_model=GlobalFieldDefaultResponse)
async def create_global_field_default(
    field: GlobalFieldDefaultCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create global default custom field (Super Admin only)"""
    if not has_permission(current_user, Permission.CUSTOMIZE_GLOBAL_CRM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can create global CRM defaults"
        )
    
    new_field = GlobalFieldDefault(
        id=uuid.uuid4(),
        name=field.name,
        field_type=field.field_type,
        entity_type=field.entity_type,
        is_required=field.is_required,
        default_value=field.default_value,
        options=field.options,
        placeholder=field.placeholder,
        help_text=field.help_text,
        is_active=True,
        apply_to_new_companies=field.apply_to_new_companies,
        created_by_id=uuid.UUID(current_user['id'])
    )
    
    db.add(new_field)
    db.commit()
    db.refresh(new_field)
    
    return {
        "id": str(new_field.id),
        "name": new_field.name,
        "field_type": new_field.field_type,
        "entity_type": new_field.entity_type,
        "is_required": new_field.is_required,
        "default_value": new_field.default_value,
        "options": new_field.options,
        "placeholder": new_field.placeholder,
        "help_text": new_field.help_text,
        "is_active": new_field.is_active,
        "apply_to_new_companies": new_field.apply_to_new_companies,
        "created_at": new_field.created_at
    }


@router.get("/custom-fields", response_model=List[GlobalFieldDefaultResponse])
async def get_global_field_defaults(
    entity_type: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all global custom field defaults"""
    if not has_permission(current_user, Permission.CUSTOMIZE_GLOBAL_CRM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can view global CRM defaults"
        )
    
    query = db.query(GlobalFieldDefault).filter(GlobalFieldDefault.is_active == True)
    
    if entity_type:
        query = query.filter(GlobalFieldDefault.entity_type == entity_type)
    
    fields = query.all()
    
    return [
        {
            "id": str(f.id),
            "name": f.name,
            "field_type": f.field_type,
            "entity_type": f.entity_type,
            "is_required": f.is_required,
            "default_value": f.default_value,
            "options": f.options,
            "placeholder": f.placeholder,
            "help_text": f.help_text,
            "is_active": f.is_active,
            "apply_to_new_companies": f.apply_to_new_companies,
            "created_at": f.created_at
        }
        for f in fields
    ]


@router.delete("/custom-fields/{field_id}")
async def delete_global_field_default(
    field_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete global custom field default (Super Admin only)"""
    if not has_permission(current_user, Permission.CUSTOMIZE_GLOBAL_CRM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can delete global CRM defaults"
        )
    
    field = db.query(GlobalFieldDefault).filter(
        GlobalFieldDefault.id == uuid.UUID(field_id)
    ).first()
    
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    
    field.is_active = False
    db.commit()
    
    return {"message": "Field default deleted successfully"}


# ============= Integration Templates =============

@router.post("/integration-templates", response_model=GlobalIntegrationTemplateResponse)
async def create_global_integration_template(
    template: GlobalIntegrationTemplateCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create global integration template (Super Admin only)"""
    if not has_permission(current_user, Permission.MANAGE_GLOBAL_INTEGRATIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can create global integration templates"
        )
    
    new_template = GlobalIntegrationTemplate(
        id=uuid.uuid4(),
        name=template.name,
        description=template.description,
        provider=template.provider,
        integration_type=template.integration_type,
        config_template=template.config_template,
        is_active=True,
        apply_to_new_companies=template.apply_to_new_companies,
        created_by_id=uuid.UUID(current_user['id'])
    )
    
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    
    return {
        "id": str(new_template.id),
        "name": new_template.name,
        "description": new_template.description,
        "provider": new_template.provider,
        "integration_type": new_template.integration_type,
        "config_template": new_template.config_template,
        "is_active": new_template.is_active,
        "apply_to_new_companies": new_template.apply_to_new_companies,
        "created_at": new_template.created_at
    }


@router.get("/integration-templates", response_model=List[GlobalIntegrationTemplateResponse])
async def get_global_integration_templates(
    integration_type: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all global integration templates"""
    if not has_permission(current_user, Permission.MANAGE_GLOBAL_INTEGRATIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can view global integration templates"
        )
    
    query = db.query(GlobalIntegrationTemplate).filter(
        GlobalIntegrationTemplate.is_active == True
    )
    
    if integration_type:
        query = query.filter(GlobalIntegrationTemplate.integration_type == integration_type)
    
    templates = query.all()
    
    return [
        {
            "id": str(t.id),
            "name": t.name,
            "description": t.description,
            "provider": t.provider,
            "integration_type": t.integration_type,
            "config_template": t.config_template,
            "is_active": t.is_active,
            "apply_to_new_companies": t.apply_to_new_companies,
            "created_at": t.created_at
        }
        for t in templates
    ]


@router.delete("/integration-templates/{template_id}")
async def delete_global_integration_template(
    template_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete global integration template (Super Admin only)"""
    if not has_permission(current_user, Permission.MANAGE_GLOBAL_INTEGRATIONS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can delete global integration templates"
        )
    
    template = db.query(GlobalIntegrationTemplate).filter(
        GlobalIntegrationTemplate.id == uuid.UUID(template_id)
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template.is_active = False
    db.commit()
    
    return {"message": "Integration template deleted successfully"}


# ============= Apply Defaults to Company =============

@router.post("/apply/{company_id}")
async def apply_global_defaults_to_company(
    company_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Apply all global defaults to a specific company (Super Admin only)"""
    if not has_permission(current_user, Permission.CUSTOMIZE_GLOBAL_CRM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can apply global defaults"
        )
    
    from ..models.crm_customization import CustomField
    
    company_uuid = uuid.UUID(company_id)
    applied_count = {"pipelines": 0, "fields": 0, "integrations": 0}
    
    # Apply pipeline defaults
    pipeline_defaults = db.query(GlobalPipelineDefault).filter(
        GlobalPipelineDefault.is_active == True
    ).all()
    
    for template in pipeline_defaults:
        new_pipeline = Pipeline(
            id=uuid.uuid4(),
            name=template.name,
            description=template.description,
            is_default=True,
            scope="company",
            company_id=company_uuid
        )
        db.add(new_pipeline)
        db.flush()
        
        # Add stages
        for idx, stage_config in enumerate(template.stages):
            stage = PipelineStage(
                id=uuid.uuid4(),
                pipeline_id=new_pipeline.id,
                name=stage_config['name'],
                order=idx,
                probability=stage_config.get('probability', 0),
                color=stage_config.get('color')
            )
            db.add(stage)
        
        applied_count["pipelines"] += 1
    
    # Apply custom field defaults
    field_defaults = db.query(GlobalFieldDefault).filter(
        GlobalFieldDefault.is_active == True
    ).all()
    
    for field_template in field_defaults:
        new_field = CustomField(
            id=uuid.uuid4(),
            name=field_template.name,
            field_type=field_template.field_type,
            entity_type=field_template.entity_type,
            scope="company",
            is_required=field_template.is_required,
            is_visible=True,
            default_value=field_template.default_value,
            options=field_template.options,
            placeholder=field_template.placeholder,
            help_text=field_template.help_text,
            company_id=company_uuid
        )
        db.add(new_field)
        applied_count["fields"] += 1
    
    db.commit()
    
    return {
        "message": "Global defaults applied successfully",
        "applied": applied_count
    }
