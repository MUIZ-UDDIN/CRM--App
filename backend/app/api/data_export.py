"""
Data export API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import io
import csv
import json
from datetime import datetime
import pandas as pd
from pydantic import BaseModel, UUID4

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission
from app.models.users import User
from app.models.contacts import Contact
from app.models.deals import Deal
from app.models.activities import Activity
from app.models.companies import Company

router = APIRouter(prefix="/api/export", tags=["data_export"])


class ExportRequest(BaseModel):
    entity_type: str  # contacts, deals, activities, users
    format: str = "csv"  # csv, xlsx, json
    filters: Optional[dict] = None


class ExportJobResponse(BaseModel):
    job_id: str
    entity_type: str
    format: str
    status: str
    created_at: datetime
    download_url: Optional[str] = None


@router.post("/", response_model=ExportJobResponse)
async def create_export_job(
    export_request: ExportRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new data export job"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Check permissions based on entity type
    if export_request.entity_type == "contacts" or export_request.entity_type == "deals" or export_request.entity_type == "activities":
        if context.is_super_admin():
            # Super admin can export any data
            pass
        elif has_permission(current_user, Permission.EXPORT_COMPANY_DATA):
            # Company admin can export company data
            pass
        elif has_permission(current_user, Permission.EXPORT_TEAM_DATA) and user_team_id:
            # Team manager can export team data
            pass
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to export this data"
            )
    elif export_request.entity_type == "users":
        if not context.is_super_admin() and not has_permission(current_user, Permission.EXPORT_COMPANY_DATA):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to export user data"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported entity type: {export_request.entity_type}"
        )
    
    # Create export job
    job_id = str(uuid.uuid4())
    
    # Process export in background
    background_tasks.add_task(
        process_export_job,
        job_id=job_id,
        entity_type=export_request.entity_type,
        format=export_request.format,
        filters=export_request.filters,
        user_id=user_id,
        company_id=company_id,
        team_id=user_team_id,
        is_super_admin=context.is_super_admin(),
        db=db
    )
    
    # Return job details
    return ExportJobResponse(
        job_id=job_id,
        entity_type=export_request.entity_type,
        format=export_request.format,
        status="processing",
        created_at=datetime.utcnow(),
        download_url=f"/api/export/{job_id}/download"
    )


@router.get("/{job_id}/status", response_model=ExportJobResponse)
async def get_export_job_status(
    job_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get export job status"""
    # In a real implementation, this would check a database or cache for job status
    # For now, we'll simulate a completed job
    return ExportJobResponse(
        job_id=job_id,
        entity_type="contacts",
        format="csv",
        status="completed",
        created_at=datetime.utcnow(),
        download_url=f"/api/export/{job_id}/download"
    )


@router.get("/{job_id}/download")
async def download_export(
    job_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Download export file"""
    # In a real implementation, this would retrieve the file from storage
    # For now, we'll generate a sample CSV file
    
    # Create a sample CSV file
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "name", "email", "phone", "created_at"])
    writer.writerow(["1", "John Doe", "john@example.com", "123-456-7890", "2023-01-01"])
    writer.writerow(["2", "Jane Smith", "jane@example.com", "123-456-7891", "2023-01-02"])
    
    # Reset the pointer to the beginning of the file
    output.seek(0)
    
    # Return the file as a streaming response
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=export_{job_id}.csv"}
    )


@router.get("/formats")
async def get_export_formats(
    current_user: dict = Depends(get_current_active_user)
):
    """Get available export formats"""
    return {
        "formats": [
            {"id": "csv", "name": "CSV", "description": "Comma-separated values"},
            {"id": "xlsx", "name": "Excel", "description": "Microsoft Excel spreadsheet"},
            {"id": "json", "name": "JSON", "description": "JavaScript Object Notation"}
        ]
    }


@router.get("/entities")
async def get_exportable_entities(
    current_user: dict = Depends(get_current_active_user)
):
    """Get exportable entity types"""
    context = get_tenant_context(current_user)
    
    entities = []
    
    # Add entities based on permissions
    if context.is_super_admin() or has_permission(current_user, Permission.EXPORT_ANY_DATA):
        entities = [
            {"id": "contacts", "name": "Contacts", "description": "All contacts and leads"},
            {"id": "deals", "name": "Deals", "description": "All deals and opportunities"},
            {"id": "activities", "name": "Activities", "description": "All tasks, calls, and meetings"},
            {"id": "users", "name": "Users", "description": "All user accounts"}
        ]
    elif has_permission(current_user, Permission.EXPORT_COMPANY_DATA):
        entities = [
            {"id": "contacts", "name": "Contacts", "description": "Company contacts and leads"},
            {"id": "deals", "name": "Deals", "description": "Company deals and opportunities"},
            {"id": "activities", "name": "Activities", "description": "Company tasks, calls, and meetings"},
            {"id": "users", "name": "Users", "description": "Company user accounts"}
        ]
    elif has_permission(current_user, Permission.EXPORT_TEAM_DATA):
        entities = [
            {"id": "contacts", "name": "Contacts", "description": "Team contacts and leads"},
            {"id": "deals", "name": "Deals", "description": "Team deals and opportunities"},
            {"id": "activities", "name": "Activities", "description": "Team tasks, calls, and meetings"}
        ]
    
    return {"entities": entities}


# Helper function to process export job
async def process_export_job(
    job_id: str,
    entity_type: str,
    format: str,
    filters: dict,
    user_id: str,
    company_id: str,
    team_id: str,
    is_super_admin: bool,
    db: Session
):
    """Process export job in background"""
    # In a real implementation, this would:
    # 1. Query the database based on entity_type, filters, and user permissions
    # 2. Format the data in the requested format
    # 3. Save the file to storage
    # 4. Update the job status in the database
    
    # For now, we'll just simulate a delay
    import asyncio
    await asyncio.sleep(5)
    
    # In a real implementation, you would update the job status in the database
    pass
