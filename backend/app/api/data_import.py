"""
Data import API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import io
import csv
import json
import pandas as pd
from datetime import datetime
from pydantic import BaseModel, UUID4

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

router = APIRouter(prefix="/api/import", tags=["data_import"])


class ImportJobResponse(BaseModel):
    job_id: str
    entity_type: str
    file_name: str
    status: str
    created_at: datetime
    total_rows: Optional[int] = None
    processed_rows: Optional[int] = None
    error_rows: Optional[int] = None
    errors: Optional[List[str]] = None


@router.post("/", response_model=ImportJobResponse)
async def create_import_job(
    entity_type: str = Form(...),
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new data import job"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Check permissions based on entity type
    if entity_type == "contacts" or entity_type == "deals" or entity_type == "activities":
        if context.is_super_admin():
            # Super admin can import any data
            pass
        elif has_permission(current_user, Permission.IMPORT_COMPANY_DATA):
            # Company admin can import company data
            pass
        elif has_permission(current_user, Permission.IMPORT_TEAM_DATA) and user_team_id:
            # Team manager can import team data
            pass
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to import this data"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported entity type: {entity_type}"
        )
    
    # Validate file type
    file_extension = file.filename.split(".")[-1].lower()
    if file_extension not in ["csv", "xlsx", "xls"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a CSV or Excel file."
        )
    
    # Read file content
    contents = await file.read()
    
    # Create import job
    job_id = str(uuid.uuid4())
    
    # Process import in background
    background_tasks.add_task(
        process_import_job,
        job_id=job_id,
        entity_type=entity_type,
        file_content=contents,
        file_extension=file_extension,
        user_id=user_id,
        company_id=company_id,
        team_id=user_team_id,
        is_super_admin=context.is_super_admin(),
        db=db
    )
    
    # Return job details
    return ImportJobResponse(
        job_id=job_id,
        entity_type=entity_type,
        file_name=file.filename,
        status="processing",
        created_at=datetime.utcnow()
    )


@router.get("/{job_id}/status", response_model=ImportJobResponse)
async def get_import_job_status(
    job_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get import job status"""
    # In a real implementation, this would check a database or cache for job status
    # For now, we'll simulate a completed job
    return ImportJobResponse(
        job_id=job_id,
        entity_type="contacts",
        file_name="contacts.csv",
        status="completed",
        created_at=datetime.utcnow(),
        total_rows=100,
        processed_rows=98,
        error_rows=2,
        errors=["Row 5: Invalid email format", "Row 87: Missing required field 'name'"]
    )


@router.get("/templates")
async def get_import_templates(
    entity_type: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Get import templates"""
    templates = {
        "contacts": {
            "csv": "/static/templates/contacts_import_template.csv",
            "xlsx": "/static/templates/contacts_import_template.xlsx"
        },
        "deals": {
            "csv": "/static/templates/deals_import_template.csv",
            "xlsx": "/static/templates/deals_import_template.xlsx"
        },
        "activities": {
            "csv": "/static/templates/activities_import_template.csv",
            "xlsx": "/static/templates/activities_import_template.xlsx"
        }
    }
    
    if entity_type:
        return {"templates": templates.get(entity_type, {})}
    
    return {"templates": templates}


@router.get("/entities")
async def get_importable_entities(
    current_user: dict = Depends(get_current_active_user)
):
    """Get importable entity types"""
    context = get_tenant_context(current_user)
    
    entities = []
    
    # Add entities based on permissions
    if context.is_super_admin():
        entities = [
            {"id": "contacts", "name": "Contacts", "description": "Import contacts and leads"},
            {"id": "deals", "name": "Deals", "description": "Import deals and opportunities"},
            {"id": "activities", "name": "Activities", "description": "Import tasks, calls, and meetings"}
        ]
    elif has_permission(current_user, Permission.IMPORT_COMPANY_DATA):
        entities = [
            {"id": "contacts", "name": "Contacts", "description": "Import contacts and leads"},
            {"id": "deals", "name": "Deals", "description": "Import deals and opportunities"},
            {"id": "activities", "name": "Activities", "description": "Import tasks, calls, and meetings"}
        ]
    elif has_permission(current_user, Permission.IMPORT_TEAM_DATA):
        entities = [
            {"id": "contacts", "name": "Contacts", "description": "Import contacts and leads"},
            {"id": "deals", "name": "Deals", "description": "Import deals and opportunities"},
            {"id": "activities", "name": "Activities", "description": "Import tasks, calls, and meetings"}
        ]
    
    return {"entities": entities}


@router.post("/{job_id}/cancel")
async def cancel_import_job(
    job_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel an import job"""
    # In a real implementation, this would cancel the job in the database
    # For now, we'll just return a success message
    return {"message": f"Import job {job_id} cancelled successfully"}


# Helper function to process import job
async def process_import_job(
    job_id: str,
    entity_type: str,
    file_content: bytes,
    file_extension: str,
    user_id: str,
    company_id: str,
    team_id: str,
    is_super_admin: bool,
    db: Session
):
    """Process import job in background"""
    # In a real implementation, this would:
    # 1. Parse the file based on file_extension
    # 2. Validate the data
    # 3. Import the data into the database
    # 4. Update the job status in the database
    
    # For now, we'll just simulate a delay
    import asyncio
    await asyncio.sleep(5)
    
    # In a real implementation, you would update the job status in the database
    pass
