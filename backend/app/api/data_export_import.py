"""
Data Export/Import API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, UUID4
from datetime import datetime
import uuid
import csv
import io
import json
import pandas as pd

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

router = APIRouter(prefix="/api/data", tags=["data_export_import"])


# Pydantic models
class ExportRequest(BaseModel):
    entity_type: str  # contacts, deals, activities, etc.
    format: str = "csv"  # csv, xlsx, json
    filters: Optional[Dict[str, Any]] = None


class ImportResponse(BaseModel):
    success: bool
    message: str
    created_count: int
    updated_count: int
    failed_count: int
    errors: List[str]


# Helper functions
def get_entity_model(entity_type: str):
    """Get the SQLAlchemy model for the entity type"""
    if entity_type == "contacts":
        from app.models.contacts import Contact
        return Contact
    elif entity_type == "deals":
        from app.models.deals import Deal
        return Deal
    elif entity_type == "activities":
        from app.models.activities import Activity
        return Activity
    elif entity_type == "users":
        from app.models.users import User
        return User
    elif entity_type == "teams":
        from app.models.teams import Team
        return Team
    else:
        raise ValueError(f"Unknown entity type: {entity_type}")


def get_entity_permission(entity_type: str, action: str):
    """Get the permission required for the entity type and action"""
    permission_map = {
        "contacts": {
            "export": Permission.EXPORT_CONTACTS,
            "import": Permission.IMPORT_CONTACTS,
        },
        "deals": {
            "export": Permission.EXPORT_DEALS,
            "import": Permission.IMPORT_DEALS,
        },
        "activities": {
            "export": Permission.EXPORT_ACTIVITIES,
            "import": Permission.IMPORT_ACTIVITIES,
        },
        "users": {
            "export": Permission.MANAGE_COMPANY_USERS,
            "import": Permission.MANAGE_COMPANY_USERS,
        },
        "teams": {
            "export": Permission.MANAGE_TEAMS,
            "import": Permission.MANAGE_TEAMS,
        }
    }
    
    if entity_type not in permission_map:
        raise ValueError(f"Unknown entity type: {entity_type}")
    
    if action not in permission_map[entity_type]:
        raise ValueError(f"Unknown action: {action}")
    
    return permission_map[entity_type][action]


def apply_tenant_filters(query, entity_type: str, context, current_user: dict):
    """Apply tenant filters based on user permissions"""
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Get entity model
    model = get_entity_model(entity_type)
    
    # Apply base company filter
    if hasattr(model, 'company_id'):
        query = query.filter(model.company_id == company_id)
    
    # Apply permission-based filters
    if context.is_super_admin():
        # Super admin can see all data
        pass
    elif entity_type == "users":
        # User permissions
        if has_permission(current_user, Permission.MANAGE_COMPANY_USERS):
            # Company admin can see all users in their company
            pass
        elif has_permission(current_user, Permission.MANAGE_TEAM_USERS):
            # Sales manager can see users in their team
            if user_team_id:
                query = query.filter(model.team_id == user_team_id)
        else:
            # Regular users can only see themselves
            query = query.filter(model.id == user_id)
    elif entity_type == "teams":
        # Team permissions
        if has_permission(current_user, Permission.MANAGE_TEAMS):
            # Company admin can see all teams in their company
            pass
        elif has_permission(current_user, Permission.VIEW_TEAM_DATA):
            # Sales manager can see their own team
            if user_team_id:
                query = query.filter(model.id == user_team_id)
        else:
            # Regular users can only see their own team
            if user_team_id:
                query = query.filter(model.id == user_team_id)
            else:
                # No team, return empty
                query = query.filter(model.id == None)
    elif entity_type in ["contacts", "deals", "activities"]:
        # Data permissions
        if has_permission(current_user, Permission.VIEW_COMPANY_DATA):
            # Company admin can see all data in their company
            pass
        elif has_permission(current_user, Permission.VIEW_TEAM_DATA):
            # Sales manager can see data owned by anyone in their team
            if user_team_id:
                # Get all users in the team
                from app.models.users import User
                team_user_ids = [str(u.id) for u in db.query(User).filter(
                    User.team_id == user_team_id,
                    User.is_deleted == False
                ).all()]
                
                # Filter by owner_id in team_user_ids
                if hasattr(model, 'owner_id'):
                    if team_user_ids:
                        query = query.filter(model.owner_id.in_([uuid.UUID(id) for id in team_user_ids]))
                    else:
                        # Team exists but no members, show own data
                        query = query.filter(model.owner_id == user_id)
            else:
                # No team assigned, show own data
                if hasattr(model, 'owner_id'):
                    query = query.filter(model.owner_id == user_id)
        elif has_permission(current_user, Permission.VIEW_OWN_DATA):
            # Regular users can only see their own data
            if hasattr(model, 'owner_id'):
                query = query.filter(model.owner_id == user_id)
    
    return query


def apply_custom_filters(query, entity_type: str, filters: Dict[str, Any]):
    """Apply custom filters to the query"""
    if not filters:
        return query
    
    model = get_entity_model(entity_type)
    
    for field, value in filters.items():
        if hasattr(model, field):
            if isinstance(value, list):
                query = query.filter(getattr(model, field).in_(value))
            else:
                query = query.filter(getattr(model, field) == value)
    
    return query


@router.post("/export")
async def export_data(
    export_request: ExportRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Export data based on entity type and filters"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    
    # Check if entity type is valid
    try:
        model = get_entity_model(export_request.entity_type)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Check permissions
    try:
        required_permission = get_entity_permission(export_request.entity_type, "export")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    if not context.is_super_admin() and not has_permission(current_user, required_permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You don't have permission to export {export_request.entity_type}"
        )
    
    # Build query
    query = db.query(model).filter(model.is_deleted == False)
    
    # Apply tenant filters
    query = apply_tenant_filters(query, export_request.entity_type, context, current_user)
    
    # Apply custom filters
    if export_request.filters:
        query = apply_custom_filters(query, export_request.entity_type, export_request.filters)
    
    # Get data
    data = query.all()
    
    # Convert to list of dicts
    result = []
    for item in data:
        item_dict = {}
        for column in item.__table__.columns:
            value = getattr(item, column.name)
            if isinstance(value, uuid.UUID):
                value = str(value)
            elif isinstance(value, datetime):
                value = value.isoformat()
            item_dict[column.name] = value
        result.append(item_dict)
    
    # Create response based on format
    if export_request.format == "json":
        # Return JSON
        return result
    elif export_request.format == "csv":
        # Create CSV
        output = io.StringIO()
        if result:
            writer = csv.DictWriter(output, fieldnames=result[0].keys())
            writer.writeheader()
            writer.writerows(result)
        
        # Create response
        response = StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv"
        )
        response.headers["Content-Disposition"] = f"attachment; filename={export_request.entity_type}.csv"
        return response
    elif export_request.format == "xlsx":
        # Create Excel
        output = io.BytesIO()
        if result:
            df = pd.DataFrame(result)
            df.to_excel(output, index=False)
        
        # Create response
        response = StreamingResponse(
            iter([output.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response.headers["Content-Disposition"] = f"attachment; filename={export_request.entity_type}.xlsx"
        return response
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format: {export_request.format}"
        )


@router.post("/import/{entity_type}", response_model=ImportResponse)
async def import_data(
    entity_type: str,
    file: UploadFile = File(...),
    update_existing: bool = False,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Import data from CSV or Excel file"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    
    # Check if entity type is valid
    try:
        model = get_entity_model(entity_type)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Check permissions
    try:
        required_permission = get_entity_permission(entity_type, "import")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    if not context.is_super_admin() and not has_permission(current_user, required_permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You don't have permission to import {entity_type}"
        )
    
    # Read file
    content = await file.read()
    
    # Parse file based on extension
    if file.filename.endswith('.csv'):
        # Parse CSV
        content_str = content.decode('utf-8')
        df = pd.read_csv(io.StringIO(content_str))
    elif file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
        # Parse Excel
        df = pd.read_excel(io.BytesIO(content))
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a CSV or Excel file."
        )
    
    # Process data
    created_count = 0
    updated_count = 0
    failed_count = 0
    errors = []
    
    # Get primary key field
    primary_key = None
    for column in model.__table__.columns:
        if column.primary_key:
            primary_key = column.name
            break
    
    # Process each row
    for index, row in df.iterrows():
        try:
            # Convert row to dict
            row_dict = row.to_dict()
            
            # Clean up NaN values
            for key, value in row_dict.items():
                if pd.isna(value):
                    row_dict[key] = None
            
            # Add company_id and owner_id if needed
            if hasattr(model, 'company_id'):
                row_dict['company_id'] = company_id
            
            if hasattr(model, 'owner_id') and 'owner_id' not in row_dict:
                row_dict['owner_id'] = user_id
            
            # Check if record exists
            existing_record = None
            if update_existing and primary_key in row_dict and row_dict[primary_key]:
                existing_record = db.query(model).filter(
                    getattr(model, primary_key) == row_dict[primary_key]
                ).first()
            
            # Update or create
            if existing_record:
                # Update existing record
                for key, value in row_dict.items():
                    if hasattr(existing_record, key):
                        setattr(existing_record, key, value)
                updated_count += 1
            else:
                # Create new record
                new_record = model(**row_dict)
                db.add(new_record)
                created_count += 1
            
            # Commit each row
            db.commit()
        
        except Exception as e:
            db.rollback()
            failed_count += 1
            errors.append(f"Row {index + 1}: {str(e)}")
    
    # Return results
    return ImportResponse(
        success=failed_count == 0,
        message=f"Import completed: {created_count} created, {updated_count} updated, {failed_count} failed",
        created_count=created_count,
        updated_count=updated_count,
        failed_count=failed_count,
        errors=errors[:10]  # Limit to first 10 errors
    )


@router.get("/export-templates/{entity_type}")
async def get_export_template(
    entity_type: str,
    format: str = "csv",
    current_user: dict = Depends(get_current_active_user)
):
    """Get a template file for data import"""
    context = get_tenant_context(current_user)
    
    # Check if entity type is valid
    try:
        model = get_entity_model(entity_type)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Check permissions
    try:
        required_permission = get_entity_permission(entity_type, "import")
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    if not context.is_super_admin() and not has_permission(current_user, required_permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You don't have permission to import {entity_type}"
        )
    
    # Get column names
    columns = []
    for column in model.__table__.columns:
        # Skip internal columns
        if column.name in ['id', 'company_id', 'created_at', 'updated_at', 'is_deleted']:
            continue
        columns.append(column.name)
    
    # Create empty dataframe with columns
    df = pd.DataFrame(columns=columns)
    
    # Create response based on format
    if format == "csv":
        # Create CSV
        output = io.StringIO()
        df.to_csv(output, index=False)
        
        # Create response
        response = StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv"
        )
        response.headers["Content-Disposition"] = f"attachment; filename={entity_type}_template.csv"
        return response
    elif format == "xlsx":
        # Create Excel
        output = io.BytesIO()
        df.to_excel(output, index=False)
        
        # Create response
        response = StreamingResponse(
            iter([output.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response.headers["Content-Disposition"] = f"attachment; filename={entity_type}_template.xlsx"
        return response
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format: {format}"
        )
