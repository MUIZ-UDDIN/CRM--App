"""
CRM Customization API endpoints for fields, tags, and pipelines
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, UUID4, validator, Field
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

router = APIRouter(prefix="/api/crm-customization", tags=["crm_customization"])


# Pydantic models
class CustomFieldBase(BaseModel):
    name: str
    field_type: str  # text, number, date, dropdown, checkbox, etc.
    entity_type: str  # contact, deal, company, etc.
    is_required: bool = False
    is_visible: bool = True
    default_value: Optional[Any] = None
    options: Optional[List[str]] = None  # For dropdown fields
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    validation_regex: Optional[str] = None
    order: Optional[int] = None


class CustomFieldCreate(CustomFieldBase):
    scope: str  # company, team


class CustomFieldUpdate(BaseModel):
    name: Optional[str] = None
    is_required: Optional[bool] = None
    is_visible: Optional[bool] = None
    default_value: Optional[Any] = None
    options: Optional[List[str]] = None
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    validation_regex: Optional[str] = None
    order: Optional[int] = None


class CustomFieldResponse(CustomFieldBase):
    id: UUID4
    scope: str
    company_id: UUID4
    team_id: Optional[UUID4] = None
    created_at: datetime
    updated_at: datetime
    created_by: UUID4

    @validator('id', 'company_id', 'team_id', 'created_by', pre=True)
    def convert_uuid(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

    class Config:
        from_attributes = True


class TagBase(BaseModel):
    name: str
    color: str  # Hex color code
    entity_type: str  # contact, deal, company, etc.
    description: Optional[str] = None


class TagCreate(TagBase):
    scope: str  # company, team


class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None


class TagResponse(TagBase):
    id: UUID4
    scope: str
    company_id: UUID4
    team_id: Optional[UUID4] = None
    created_at: datetime
    updated_at: datetime
    created_by: UUID4

    @validator('id', 'company_id', 'team_id', 'created_by', pre=True)
    def convert_uuid(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

    class Config:
        from_attributes = True


class PipelineStageBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    probability: Optional[float] = None
    order: int


class PipelineBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: bool = False


class PipelineCreate(PipelineBase):
    scope: str  # company, team
    stages: List[PipelineStageBase]


class PipelineUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None


class PipelineStageResponse(PipelineStageBase):
    id: UUID4
    pipeline_id: UUID4
    created_at: datetime
    updated_at: datetime

    @validator('id', 'pipeline_id', pre=True)
    def convert_uuid(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

    class Config:
        from_attributes = True


class PipelineResponse(PipelineBase):
    id: UUID4
    scope: str
    company_id: UUID4
    team_id: Optional[UUID4] = None
    created_at: datetime
    updated_at: datetime
    created_by: UUID4
    stages: List[PipelineStageResponse]

    @validator('id', 'company_id', 'team_id', 'created_by', pre=True)
    def convert_uuid(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

    class Config:
        from_attributes = True


# Create models if they don't exist
def create_customization_models(db: Session):
    """Create CRM customization models if they don't exist"""
    from sqlalchemy import Column, String, Boolean, JSON, ForeignKey, DateTime, Integer, Float, Text
    from sqlalchemy.dialects.postgresql import UUID
    from sqlalchemy.orm import relationship
    from app.models.base import Base, BaseModel
    
    # Check if models already exist
    if hasattr(Base.metadata.tables, 'custom_fields'):
        return
    
    # Create CustomField model
    class CustomField(BaseModel):
        __tablename__ = 'custom_fields'
        
        name = Column(String(255), nullable=False)
        field_type = Column(String(50), nullable=False)
        entity_type = Column(String(50), nullable=False)
        scope = Column(String(50), nullable=False)  # company, team
        is_required = Column(Boolean, default=False)
        is_visible = Column(Boolean, default=True)
        default_value = Column(Text)
        options = Column(JSON)
        placeholder = Column(String(255))
        help_text = Column(Text)
        validation_regex = Column(String(255))
        order = Column(Integer)
        
        company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False)
        team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id', ondelete='CASCADE'), nullable=True)
        created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
        
        def __repr__(self):
            return f"<CustomField {self.name} ({self.field_type})>"
    
    # Create Tag model
    class Tag(BaseModel):
        __tablename__ = 'tags'
        
        name = Column(String(255), nullable=False)
        color = Column(String(50), nullable=False)
        entity_type = Column(String(50), nullable=False)
        scope = Column(String(50), nullable=False)  # company, team
        description = Column(Text)
        
        company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False)
        team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id', ondelete='CASCADE'), nullable=True)
        created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
        
        def __repr__(self):
            return f"<Tag {self.name} ({self.entity_type})>"
    
    # Create PipelineStage model if it doesn't exist
    if not hasattr(Base.metadata.tables, 'pipeline_stages'):
        class PipelineStage(BaseModel):
            __tablename__ = 'pipeline_stages'
            
            name = Column(String(255), nullable=False)
            description = Column(Text)
            color = Column(String(50))
            probability = Column(Float)
            order = Column(Integer, nullable=False)
            
            pipeline_id = Column(UUID(as_uuid=True), ForeignKey('pipelines.id', ondelete='CASCADE'), nullable=False)
            
            def __repr__(self):
                return f"<PipelineStage {self.name} (order: {self.order})>"
    
    # Create Pipeline model if it doesn't exist
    if not hasattr(Base.metadata.tables, 'pipelines'):
        class Pipeline(BaseModel):
            __tablename__ = 'pipelines'
            
            name = Column(String(255), nullable=False)
            description = Column(Text)
            is_default = Column(Boolean, default=False)
            scope = Column(String(50), nullable=False)  # company, team
            
            company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False)
            team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id', ondelete='CASCADE'), nullable=True)
            created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
            
            stages = relationship('PipelineStage', cascade='all, delete-orphan')
            
            def __repr__(self):
                return f"<Pipeline {self.name}>"
    
    # Create tables
    Base.metadata.create_all(bind=db.bind)
    
    return CustomField, Tag, Pipeline, PipelineStage


# Custom Fields API
@router.post("/fields", response_model=CustomFieldResponse)
async def create_custom_field(
    field: CustomFieldCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new custom field"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Check permissions based on scope
    if field.scope == "company":
        if not has_permission(current_user, Permission.CUSTOMIZE_COMPANY_CRM) and not context.is_super_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to create company-wide custom fields"
            )
    elif field.scope == "team":
        if not has_permission(current_user, Permission.VIEW_TEAM_CRM_SETTINGS) and not context.is_super_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to create team custom fields"
            )
        
        # Check if user has a team
        if not user_team_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must be assigned to a team to create team custom fields"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid scope. Must be one of: company, team"
        )
    
    # Create models if they don't exist
    CustomField, _, _, _ = create_customization_models(db)
    
    # Check for duplicate field name for the same entity type and scope
    existing_field = db.query(CustomField).filter(
        CustomField.name == field.name,
        CustomField.entity_type == field.entity_type,
        CustomField.company_id == company_id,
        CustomField.scope == field.scope
    ).first()
    
    if existing_field:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A custom field with name '{field.name}' already exists for {field.entity_type}"
        )
    
    # Create custom field
    new_field = CustomField(
        name=field.name,
        field_type=field.field_type,
        entity_type=field.entity_type,
        scope=field.scope,
        is_required=field.is_required,
        is_visible=field.is_visible,
        default_value=field.default_value,
        options=field.options,
        placeholder=field.placeholder,
        help_text=field.help_text,
        validation_regex=field.validation_regex,
        order=field.order,
        company_id=uuid.UUID(company_id) if isinstance(company_id, str) else company_id,
        team_id=uuid.UUID(user_team_id) if field.scope == "team" else None,
        created_by=uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    )
    
    db.add(new_field)
    db.commit()
    db.refresh(new_field)
    
    return new_field


@router.get("/fields", response_model=List[CustomFieldResponse])
async def list_custom_fields(
    entity_type: Optional[str] = None,
    scope: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """List custom fields based on role permissions"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Create models if they don't exist
    CustomField, _, _, _ = create_customization_models(db)
    
    # Base query - filter by company
    query = db.query(CustomField).filter(CustomField.company_id == company_id)
    
    # Apply filters
    if entity_type:
        query = query.filter(CustomField.entity_type == entity_type)
    if scope:
        query = query.filter(CustomField.scope == scope)
    
    # Apply permission-based filters
    if context.is_super_admin() or has_permission(current_user, Permission.CUSTOMIZE_COMPANY_CRM):
        # Can see all custom fields in the company
        pass
    elif has_permission(current_user, Permission.VIEW_TEAM_CRM_SETTINGS):
        # Can see team and company custom fields
        if user_team_id:
            query = query.filter(
                (CustomField.scope == "company") |
                ((CustomField.scope == "team") & (CustomField.team_id == user_team_id))
            )
        else:
            query = query.filter(CustomField.scope == "company")
    else:
        # Can only see company custom fields
        query = query.filter(CustomField.scope == "company")
    
    fields = query.all()
    return fields


@router.get("/fields/{field_id}", response_model=CustomFieldResponse)
async def get_custom_field(
    field_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get custom field details"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_team_id = current_user.get('team_id')
    
    # Create models if they don't exist
    CustomField, _, _, _ = create_customization_models(db)
    
    # Get custom field
    field = db.query(CustomField).filter(
        CustomField.id == field_id,
        CustomField.company_id == company_id
    ).first()
    
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom field not found"
        )
    
    # Check permissions
    if context.is_super_admin() or has_permission(current_user, Permission.CUSTOMIZE_COMPANY_CRM):
        return field
    elif has_permission(current_user, Permission.VIEW_TEAM_CRM_SETTINGS):
        if field.scope == "company" or (field.scope == "team" and str(field.team_id) == str(user_team_id)):
            return field
    elif field.scope == "company":
        return field
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have permission to view this custom field"
    )


@router.put("/fields/{field_id}", response_model=CustomFieldResponse)
async def update_custom_field(
    field_id: UUID4,
    field_update: CustomFieldUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Update custom field"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_team_id = current_user.get('team_id')
    
    # Create models if they don't exist
    CustomField, _, _, _ = create_customization_models(db)
    
    # Get custom field
    field = db.query(CustomField).filter(
        CustomField.id == field_id,
        CustomField.company_id == company_id
    ).first()
    
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom field not found"
        )
    
    # Check permissions
    can_update = False
    
    if context.is_super_admin():
        can_update = True
    elif field.scope == "company" and has_permission(current_user, Permission.CUSTOMIZE_COMPANY_CRM):
        can_update = True
    elif field.scope == "team" and str(field.team_id) == str(user_team_id) and has_permission(current_user, Permission.VIEW_TEAM_CRM_SETTINGS):
        can_update = True
    
    if not can_update:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this custom field"
        )
    
    # Update fields
    update_data = field_update.dict(exclude_unset=True)
    for field_name, value in update_data.items():
        setattr(field, field_name, value)
    
    field.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(field)
    
    return field


@router.delete("/fields/{field_id}")
async def delete_custom_field(
    field_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Delete custom field"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_team_id = current_user.get('team_id')
    
    # Create models if they don't exist
    CustomField, _, _, _ = create_customization_models(db)
    
    # Get custom field
    field = db.query(CustomField).filter(
        CustomField.id == field_id,
        CustomField.company_id == company_id
    ).first()
    
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom field not found"
        )
    
    # Check permissions
    can_delete = False
    
    if context.is_super_admin():
        can_delete = True
    elif field.scope == "company" and has_permission(current_user, Permission.CUSTOMIZE_COMPANY_CRM):
        can_delete = True
    elif field.scope == "team" and str(field.team_id) == str(user_team_id) and has_permission(current_user, Permission.VIEW_TEAM_CRM_SETTINGS):
        can_delete = True
    
    if not can_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this custom field"
        )
    
    # Delete custom field
    db.delete(field)
    db.commit()
    
    return {"message": "Custom field deleted successfully"}


# Tags API
@router.post("/tags", response_model=TagResponse)
async def create_tag(
    tag: TagCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new tag"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Check permissions based on scope
    if tag.scope == "company":
        if not has_permission(current_user, Permission.CUSTOMIZE_COMPANY_CRM) and not context.is_super_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to create company-wide tags"
            )
    elif tag.scope == "team":
        if not has_permission(current_user, Permission.VIEW_TEAM_CRM_SETTINGS) and not context.is_super_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to create team tags"
            )
        
        # Check if user has a team
        if not user_team_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must be assigned to a team to create team tags"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid scope. Must be one of: company, team"
        )
    
    # Create models if they don't exist
    _, Tag, _, _ = create_customization_models(db)
    
    # Check for duplicate tag name for the same entity type and scope
    existing_tag = db.query(Tag).filter(
        Tag.name == tag.name,
        Tag.entity_type == tag.entity_type,
        Tag.company_id == company_id,
        Tag.scope == tag.scope
    ).first()
    
    if existing_tag:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A tag with name '{tag.name}' already exists for {tag.entity_type}"
        )
    
    # Create tag
    new_tag = Tag(
        name=tag.name,
        color=tag.color,
        entity_type=tag.entity_type,
        scope=tag.scope,
        description=tag.description,
        company_id=uuid.UUID(company_id) if isinstance(company_id, str) else company_id,
        team_id=uuid.UUID(user_team_id) if tag.scope == "team" else None,
        created_by=uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    )
    
    db.add(new_tag)
    db.commit()
    db.refresh(new_tag)
    
    return new_tag


@router.get("/tags", response_model=List[TagResponse])
async def list_tags(
    entity_type: Optional[str] = None,
    scope: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """List tags based on role permissions"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_team_id = current_user.get('team_id')
    
    # Create models if they don't exist
    _, Tag, _, _ = create_customization_models(db)
    
    # Base query - filter by company
    query = db.query(Tag).filter(Tag.company_id == company_id)
    
    # Apply filters
    if entity_type:
        query = query.filter(Tag.entity_type == entity_type)
    if scope:
        query = query.filter(Tag.scope == scope)
    
    # Apply permission-based filters
    if context.is_super_admin() or has_permission(current_user, Permission.CUSTOMIZE_COMPANY_CRM):
        # Can see all tags in the company
        pass
    elif has_permission(current_user, Permission.VIEW_TEAM_CRM_SETTINGS):
        # Can see team and company tags
        if user_team_id:
            query = query.filter(
                (Tag.scope == "company") |
                ((Tag.scope == "team") & (Tag.team_id == user_team_id))
            )
        else:
            query = query.filter(Tag.scope == "company")
    else:
        # Can only see company tags
        query = query.filter(Tag.scope == "company")
    
    tags = query.all()
    return tags


# Pipelines API
@router.post("/pipelines", response_model=PipelineResponse)
async def create_pipeline(
    pipeline: PipelineCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new pipeline with stages"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Check permissions based on scope
    if pipeline.scope == "company":
        if not has_permission(current_user, Permission.CUSTOMIZE_COMPANY_CRM) and not context.is_super_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to create company-wide pipelines"
            )
    elif pipeline.scope == "team":
        if not has_permission(current_user, Permission.VIEW_TEAM_CRM_SETTINGS) and not context.is_super_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to create team pipelines"
            )
        
        # Check if user has a team
        if not user_team_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must be assigned to a team to create team pipelines"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid scope. Must be one of: company, team"
        )
    
    # Create models if they don't exist
    _, _, Pipeline, PipelineStage = create_customization_models(db)
    
    # Check for duplicate pipeline name for the same scope
    existing_pipeline = db.query(Pipeline).filter(
        Pipeline.name == pipeline.name,
        Pipeline.company_id == company_id,
        Pipeline.scope == pipeline.scope
    ).first()
    
    if existing_pipeline:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A pipeline with name '{pipeline.name}' already exists"
        )
    
    # Create pipeline
    new_pipeline = Pipeline(
        name=pipeline.name,
        description=pipeline.description,
        is_default=pipeline.is_default,
        scope=pipeline.scope,
        company_id=uuid.UUID(company_id) if isinstance(company_id, str) else company_id,
        team_id=uuid.UUID(user_team_id) if pipeline.scope == "team" else None,
        created_by=uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    )
    
    db.add(new_pipeline)
    db.flush()  # Get ID without committing
    
    # Create stages
    stages = []
    for stage_data in pipeline.stages:
        stage = PipelineStage(
            name=stage_data.name,
            description=stage_data.description,
            color=stage_data.color,
            probability=stage_data.probability,
            order=stage_data.order,
            pipeline_id=new_pipeline.id
        )
        db.add(stage)
        stages.append(stage)
    
    # If this is the default pipeline, unset default flag on other pipelines
    if pipeline.is_default:
        db.query(Pipeline).filter(
            Pipeline.company_id == company_id,
            Pipeline.scope == pipeline.scope,
            Pipeline.id != new_pipeline.id,
            Pipeline.is_default == True
        ).update({"is_default": False})
    
    db.commit()
    db.refresh(new_pipeline)
    
    # Load stages for response
    new_pipeline.stages = stages
    
    return new_pipeline


@router.get("/pipelines", response_model=List[PipelineResponse])
async def list_pipelines(
    scope: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """List pipelines based on role permissions"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_team_id = current_user.get('team_id')
    
    # Create models if they don't exist
    _, _, Pipeline, _ = create_customization_models(db)
    
    # Base query - filter by company
    query = db.query(Pipeline).filter(Pipeline.company_id == company_id)
    
    # Apply filters
    if scope:
        query = query.filter(Pipeline.scope == scope)
    
    # Apply permission-based filters
    if context.is_super_admin() or has_permission(current_user, Permission.CUSTOMIZE_COMPANY_CRM):
        # Can see all pipelines in the company
        pass
    elif has_permission(current_user, Permission.VIEW_TEAM_CRM_SETTINGS):
        # Can see team and company pipelines
        if user_team_id:
            query = query.filter(
                (Pipeline.scope == "company") |
                ((Pipeline.scope == "team") & (Pipeline.team_id == user_team_id))
            )
        else:
            query = query.filter(Pipeline.scope == "company")
    else:
        # Can only see company pipelines
        query = query.filter(Pipeline.scope == "company")
    
    pipelines = query.all()
    return pipelines
