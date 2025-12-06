"""
Custom Fields API - Company Admin can create custom fields
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
import uuid

from app.core.security import get_current_active_user
from app.core.database import get_db
from app.models.custom_fields import CustomField, CustomFieldValue, FieldType, EntityType
from app.middleware.permissions import has_permission
from app.models.permissions import Permission
from app.middleware.tenant import get_tenant_context

router = APIRouter(prefix="/custom-fields", tags=["Custom Fields"])


class CustomFieldCreate(BaseModel):
    name: str
    field_key: str
    field_type: str  # text, number, date, boolean, select, multi_select, email, phone, url, textarea
    entity_type: str  # contact, deal, company, activity
    description: Optional[str] = None
    is_required: bool = False
    default_value: Optional[str] = None
    options: Optional[List[str]] = None  # For select/multi-select
    show_in_list: bool = False
    show_in_detail: bool = True


class CustomFieldUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_required: Optional[bool] = None
    is_active: Optional[bool] = None
    default_value: Optional[str] = None
    options: Optional[List[str]] = None
    show_in_list: Optional[bool] = None
    show_in_detail: Optional[bool] = None
    display_order: Optional[int] = None


class CustomFieldResponse(BaseModel):
    id: str
    name: str
    field_key: str
    field_type: str
    entity_type: str
    description: Optional[str]
    is_required: bool
    is_active: bool
    default_value: Optional[str]
    options: Optional[List[str]]
    show_in_list: bool
    show_in_detail: bool
    display_order: int
    company_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class CustomFieldValueSet(BaseModel):
    custom_field_id: str
    value: Any  # Can be string, number, boolean, list, etc.


@router.post("/", response_model=CustomFieldResponse)
async def create_custom_field(
    field: CustomFieldCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a custom field - Company Admin only"""
    try:
        context = get_tenant_context(current_user)
        company_id = current_user.get('company_id')
        user_id = current_user.get('id')
        
        # Only Company Admin and Super Admin can create custom fields
        if not context.is_super_admin() and not has_permission(current_user, Permission.CUSTOMIZE_COMPANY_CRM):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Company Admins can create custom fields"
            )
        
        if not company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User must belong to a company"
            )
        
        # Validate field_type
        try:
            field_type_enum = FieldType(field.field_type.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid field_type. Must be one of: {[ft.value for ft in FieldType]}"
            )
        
        # Validate entity_type
        try:
            entity_type_enum = EntityType(field.entity_type.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid entity_type. Must be one of: {[et.value for et in EntityType]}"
            )
        
        # Check if field_key already exists for this company and entity
        existing = db.query(CustomField).filter(
            and_(
                CustomField.company_id == uuid.UUID(company_id),
                CustomField.entity_type == entity_type_enum,
                CustomField.field_key == field.field_key
            )
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Field key '{field.field_key}' already exists for {field.entity_type}"
            )
        
        # Create custom field
        new_field = CustomField(
            id=uuid.uuid4(),
            name=field.name,
            field_key=field.field_key,
            field_type=field_type_enum,
            entity_type=entity_type_enum,
            description=field.description,
            is_required=field.is_required,
            is_active=True,
            default_value=field.default_value,
            options=field.options,
            show_in_list=field.show_in_list,
            show_in_detail=field.show_in_detail,
            display_order=0,
            company_id=uuid.UUID(company_id),
            created_by_id=uuid.UUID(user_id),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(new_field)
        db.commit()
        db.refresh(new_field)
        
        # Send notifications
        try:
            from app.services.notification_service import NotificationService
            from app.models.users import User
            
            creator = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
            creator_name = f"{creator.first_name} {creator.last_name}" if creator else "Unknown User"
            
            NotificationService.notify_custom_field_added(
                db=db,
                field_name=new_field.name,
                entity_type=new_field.entity_type.value,
                creator_id=uuid.UUID(user_id),
                creator_name=creator_name,
                company_id=uuid.UUID(company_id)
            )
        except Exception as notification_error:
            print(f"Notification error: {notification_error}")
        
        return CustomFieldResponse(
            id=str(new_field.id),
            name=new_field.name,
            field_key=new_field.field_key,
            field_type=new_field.field_type.value,
            entity_type=new_field.entity_type.value,
            description=new_field.description,
            is_required=new_field.is_required,
            is_active=new_field.is_active,
            default_value=new_field.default_value,
            options=new_field.options,
            show_in_list=new_field.show_in_list,
            show_in_detail=new_field.show_in_detail,
            display_order=new_field.display_order,
            company_id=str(new_field.company_id),
            created_at=new_field.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create custom field: {str(e)}"
        )


@router.get("/", response_model=List[CustomFieldResponse])
async def get_custom_fields(
    entity_type: Optional[str] = None,
    active_only: bool = True,
    company_id_filter: Optional[str] = Query(None, description="Filter by company ID (Super Admin only)"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get custom fields for the company"""
    try:
        context = get_tenant_context(current_user)
        
        # Super Admin can view specific company's custom fields
        if company_id_filter and context.is_super_admin():
            company_id = company_id_filter
        else:
            company_id = current_user.get('company_id')
        
        if not company_id and not context.is_super_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User must belong to a company"
            )
        
        # Build query
        query = db.query(CustomField)
        
        # Filter by company_id if provided (for Super Admin managing specific company)
        if company_id:
            query = query.filter(CustomField.company_id == uuid.UUID(company_id))
        
        if entity_type:
            try:
                entity_type_enum = EntityType(entity_type.lower())
                query = query.filter(CustomField.entity_type == entity_type_enum)
            except ValueError:
                pass
        
        if active_only:
            query = query.filter(CustomField.is_active == True)
        
        fields = query.order_by(CustomField.display_order, CustomField.created_at).all()
        
        return [
            CustomFieldResponse(
                id=str(f.id),
                name=f.name,
                field_key=f.field_key,
                field_type=f.field_type.value,
                entity_type=f.entity_type.value,
                description=f.description,
                is_required=f.is_required,
                is_active=f.is_active,
                default_value=f.default_value,
                options=f.options,
                show_in_list=f.show_in_list,
                show_in_detail=f.show_in_detail,
                display_order=f.display_order,
                company_id=str(f.company_id),
                created_at=f.created_at
            )
            for f in fields
        ]
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch custom fields: {str(e)}"
        )


@router.patch("/{field_id}", response_model=CustomFieldResponse)
async def update_custom_field(
    field_id: str,
    field_update: CustomFieldUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a custom field - Company Admin only"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    
    if not context.is_super_admin() and not has_permission(current_user, Permission.CUSTOMIZE_COMPANY_CRM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Company Admins can update custom fields"
        )
    
    field = db.query(CustomField).filter(CustomField.id == uuid.UUID(field_id)).first()
    
    if not field:
        raise HTTPException(status_code=404, detail="Custom field not found")
    
    # Check company ownership
    if not context.is_super_admin() and str(field.company_id) != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update fields
    if field_update.name is not None:
        field.name = field_update.name
    if field_update.description is not None:
        field.description = field_update.description
    if field_update.is_required is not None:
        field.is_required = field_update.is_required
    if field_update.is_active is not None:
        field.is_active = field_update.is_active
    if field_update.default_value is not None:
        field.default_value = field_update.default_value
    if field_update.options is not None:
        field.options = field_update.options
    if field_update.show_in_list is not None:
        field.show_in_list = field_update.show_in_list
    if field_update.show_in_detail is not None:
        field.show_in_detail = field_update.show_in_detail
    if field_update.display_order is not None:
        field.display_order = field_update.display_order
    
    field.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(field)
    
    return CustomFieldResponse(
        id=str(field.id),
        name=field.name,
        field_key=field.field_key,
        field_type=field.field_type.value,
        entity_type=field.entity_type.value,
        description=field.description,
        is_required=field.is_required,
        is_active=field.is_active,
        default_value=field.default_value,
        options=field.options,
        show_in_list=field.show_in_list,
        show_in_detail=field.show_in_detail,
        display_order=field.display_order,
        company_id=str(field.company_id),
        created_at=field.created_at
    )


@router.delete("/{field_id}")
async def delete_custom_field(
    field_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a custom field - Company Admin only"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    
    if not context.is_super_admin() and not has_permission(current_user, Permission.CUSTOMIZE_COMPANY_CRM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Company Admins can delete custom fields"
        )
    
    field = db.query(CustomField).filter(CustomField.id == uuid.UUID(field_id)).first()
    
    if not field:
        raise HTTPException(status_code=404, detail="Custom field not found")
    
    # Check company ownership
    if not context.is_super_admin() and str(field.company_id) != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete all values for this field
    db.query(CustomFieldValue).filter(CustomFieldValue.custom_field_id == field.id).delete()
    
    # Delete the field
    db.delete(field)
    db.commit()
    
    return {"message": "Custom field deleted successfully"}


@router.post("/values/{entity_type}/{entity_id}")
async def set_custom_field_values(
    entity_type: str,
    entity_id: str,
    values: List[CustomFieldValueSet],
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Set custom field values for an entity"""
    company_id = current_user.get('company_id')
    
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must belong to a company"
        )
    
    # Validate entity_type
    try:
        entity_type_enum = EntityType(entity_type.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid entity_type. Must be one of: {[et.value for et in EntityType]}"
        )
    
    # Process each value
    for value_set in values:
        # Get the custom field
        field = db.query(CustomField).filter(
            and_(
                CustomField.id == uuid.UUID(value_set.custom_field_id),
                CustomField.company_id == uuid.UUID(company_id),
                CustomField.entity_type == entity_type_enum
            )
        ).first()
        
        if not field:
            continue  # Skip invalid fields
        
        # Check if value already exists
        existing_value = db.query(CustomFieldValue).filter(
            and_(
                CustomFieldValue.custom_field_id == field.id,
                CustomFieldValue.entity_id == uuid.UUID(entity_id),
                CustomFieldValue.entity_type == entity_type_enum
            )
        ).first()
        
        if existing_value:
            # Update existing value
            _set_value_by_type(existing_value, field.field_type, value_set.value)
            existing_value.updated_at = datetime.utcnow()
        else:
            # Create new value
            new_value = CustomFieldValue(
                id=uuid.uuid4(),
                custom_field_id=field.id,
                entity_id=uuid.UUID(entity_id),
                entity_type=entity_type_enum,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            _set_value_by_type(new_value, field.field_type, value_set.value)
            db.add(new_value)
    
    db.commit()
    
    return {"message": "Custom field values saved successfully"}


@router.get("/values/{entity_type}/{entity_id}")
async def get_custom_field_values(
    entity_type: str,
    entity_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get custom field values for an entity"""
    company_id = current_user.get('company_id')
    
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must belong to a company"
        )
    
    # Validate entity_type
    try:
        entity_type_enum = EntityType(entity_type.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid entity_type"
        )
    
    # Get all values for this entity
    values = db.query(CustomFieldValue, CustomField).join(
        CustomField, CustomFieldValue.custom_field_id == CustomField.id
    ).filter(
        and_(
            CustomFieldValue.entity_id == uuid.UUID(entity_id),
            CustomFieldValue.entity_type == entity_type_enum,
            CustomField.company_id == uuid.UUID(company_id)
        )
    ).all()
    
    result = {}
    for value, field in values:
        result[field.field_key] = {
            "field_id": str(field.id),
            "field_name": field.name,
            "field_type": field.field_type.value,
            "value": _get_value_by_type(value, field.field_type)
        }
    
    return result


def _set_value_by_type(value_obj: CustomFieldValue, field_type: FieldType, value: Any):
    """Set the appropriate value column based on field type"""
    if field_type == FieldType.TEXT or field_type == FieldType.EMAIL or field_type == FieldType.PHONE or field_type == FieldType.URL or field_type == FieldType.TEXTAREA:
        value_obj.value_text = str(value) if value is not None else None
    elif field_type == FieldType.NUMBER:
        value_obj.value_number = int(value) if value is not None else None
    elif field_type == FieldType.BOOLEAN:
        value_obj.value_boolean = bool(value) if value is not None else None
    elif field_type == FieldType.DATE:
        if isinstance(value, str):
            value_obj.value_date = datetime.fromisoformat(value.replace('Z', '+00:00'))
        elif isinstance(value, datetime):
            value_obj.value_date = value
    elif field_type == FieldType.SELECT:
        value_obj.value_text = str(value) if value is not None else None
    elif field_type == FieldType.MULTI_SELECT:
        value_obj.value_json = value if isinstance(value, list) else [value]


def _get_value_by_type(value_obj: CustomFieldValue, field_type: FieldType) -> Any:
    """Get the value from the appropriate column based on field type"""
    if field_type == FieldType.TEXT or field_type == FieldType.EMAIL or field_type == FieldType.PHONE or field_type == FieldType.URL or field_type == FieldType.TEXTAREA or field_type == FieldType.SELECT:
        return value_obj.value_text
    elif field_type == FieldType.NUMBER:
        return value_obj.value_number
    elif field_type == FieldType.BOOLEAN:
        return value_obj.value_boolean
    elif field_type == FieldType.DATE:
        return value_obj.value_date.isoformat() if value_obj.value_date else None
    elif field_type == FieldType.MULTI_SELECT:
        return value_obj.value_json
    return None
