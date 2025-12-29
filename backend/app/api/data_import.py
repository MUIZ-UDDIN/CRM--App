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
from app.models.notifications import Notification as NotificationModel, NotificationType
from app.models import User, Company

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
    company_id: Optional[str] = Form(None),  # For Super Admin to specify target company
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new data import job"""
    context = get_tenant_context(current_user)
    
    # Determine target company_id
    target_company_id = company_id if company_id and context.is_super_admin() else current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    if not target_company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company ID is required"
        )
    
    # Check permissions based on entity type
    if entity_type == "contacts" or entity_type == "deals" or entity_type == "activities":
        if context.is_super_admin():
            # Super admin can import any data for any company
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
    
    # Process import synchronously to return results immediately
    result = await process_import_job(
        job_id=job_id,
        entity_type=entity_type,
        file_content=contents,
        file_extension=file_extension,
        user_id=user_id,
        company_id=target_company_id,
        team_id=user_team_id,
        is_super_admin=context.is_super_admin(),
        db=db
    )
    
    # Send notification to company admins if Super Admin imported data for another company
    if context.is_super_admin() and company_id and result.get("processed_rows", 0) > 0:
        await send_import_notification_to_company(
            db=db,
            company_id=target_company_id,
            entity_type=entity_type,
            processed_rows=result.get("processed_rows", 0),
            importer_name=f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip() or "Super Admin"
        )
    
    # Return job details with results
    return ImportJobResponse(
        job_id=job_id,
        entity_type=entity_type,
        file_name=file.filename,
        status="completed" if result["error_rows"] == 0 else "completed_with_errors",
        created_at=datetime.utcnow(),
        total_rows=result.get("total_rows", 0),
        processed_rows=result.get("processed_rows", 0),
        error_rows=result.get("error_rows", 0),
        errors=result.get("errors", [])
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
    from app.models.contacts import Contact as ContactModel, ContactStatus
    from app.models.deals import Deal as DealModel
    from app.models.activities import Activity as ActivityModel
    from sqlalchemy import and_
    
    successful_imports = 0
    failed_imports = 0
    errors = []
    
    try:
        # Parse file based on extension
        if file_extension == "csv":
            content_str = file_content.decode('utf-8')
            delimiter = '\t' if '\t' in content_str and content_str.count('\t') > content_str.count(',') else ','
            df = pd.read_csv(io.StringIO(content_str), delimiter=delimiter)
        else:  # xlsx or xls
            df = pd.read_excel(io.BytesIO(file_content))
        
        total_rows = len(df)
        
        # Process based on entity type
        if entity_type == "contacts":
            for index, row in df.iterrows():
                try:
                    # Clean and validate email
                    email = str(row.get('email', '')).strip().lower()
                    if not email or '@' not in email:
                        errors.append(f"Row {index + 1}: Invalid or missing email")
                        failed_imports += 1
                        continue
                    
                    # Check for existing contact
                    existing_contact = db.query(ContactModel).filter(
                        and_(
                            ContactModel.email.ilike(email),
                            ContactModel.company_id == (uuid.UUID(company_id) if isinstance(company_id, str) else company_id),
                            ContactModel.is_deleted == False
                        )
                    ).first()
                    
                    if existing_contact:
                        errors.append(f"Row {index + 1}: Contact with email {email} already exists")
                        failed_imports += 1
                        continue
                    
                    # Create contact
                    contact_data = {
                        'first_name': str(row.get('first_name', '')).strip(),
                        'last_name': str(row.get('last_name', '')).strip(),
                        'email': email,
                        'phone': str(row.get('phone', '')).strip() if pd.notna(row.get('phone')) else '',
                        'company': str(row.get('company', '')).strip() if pd.notna(row.get('company')) else '',
                        'title': str(row.get('title', '')).strip() if pd.notna(row.get('title')) else '',
                        'type': str(row.get('type', 'Lead')).strip() if pd.notna(row.get('type')) else 'Lead',
                        'status': ContactStatus.NEW,
                        'owner_id': uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
                        'company_id': uuid.UUID(company_id) if isinstance(company_id, str) else company_id,
                        'created_at': datetime.utcnow(),
                        'updated_at': datetime.utcnow()
                    }
                    
                    db_contact = ContactModel(**contact_data)
                    db.add(db_contact)
                    db.commit()
                    successful_imports += 1
                    
                except Exception as e:
                    db.rollback()
                    errors.append(f"Row {index + 1}: {str(e)}")
                    failed_imports += 1
        
        elif entity_type == "deals":
            from app.models.deals import Pipeline, PipelineStage, DealStatus
            
            # Get default pipeline and first stage for the company
            target_company_uuid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
            
            # Try to get default pipeline (is_default might be boolean or string)
            default_pipeline = db.query(Pipeline).filter(
                Pipeline.company_id == target_company_uuid
            ).order_by(Pipeline.order_index).first()
            
            if not default_pipeline:
                # Get any pipeline for this company
                default_pipeline = db.query(Pipeline).filter(
                    Pipeline.company_id == target_company_uuid
                ).first()
            
            if not default_pipeline:
                errors.append("No pipeline found for this company. Please create a pipeline first.")
                return {
                    "total_rows": len(df),
                    "processed_rows": 0,
                    "error_rows": len(df),
                    "errors": errors
                }
            
            # Get all stages of the pipeline for lookup
            all_stages = db.query(PipelineStage).filter(
                PipelineStage.pipeline_id == default_pipeline.id
            ).order_by(PipelineStage.order_index).all()
            
            if not all_stages:
                errors.append("No stages found in pipeline. Please create pipeline stages first.")
                return {
                    "total_rows": len(df),
                    "processed_rows": 0,
                    "error_rows": len(df),
                    "errors": errors
                }
            
            # Create stage name to ID mapping (case-insensitive)
            stage_map = {stage.name.lower(): stage for stage in all_stages}
            default_stage = all_stages[0]  # First stage as default
            
            for index, row in df.iterrows():
                try:
                    # Validate required fields
                    title = str(row.get('title', '')).strip()
                    if not title:
                        errors.append(f"Row {index + 1}: Title is required")
                        failed_imports += 1
                        continue
                    
                    value = float(row.get('value', 0))
                    if value <= 0:
                        errors.append(f"Row {index + 1}: Value must be positive")
                        failed_imports += 1
                        continue
                    
                    # Parse status
                    status_str = str(row.get('status', 'open')).strip().lower() if pd.notna(row.get('status')) else 'open'
                    try:
                        deal_status = DealStatus(status_str)
                    except ValueError:
                        deal_status = DealStatus.OPEN
                    
                    # Find stage by name from CSV, or use default
                    stage_to_use = default_stage
                    if 'stage' in row and pd.notna(row.get('stage')):
                        stage_name = str(row.get('stage', '')).strip().lower()
                        if stage_name in stage_map:
                            stage_to_use = stage_map[stage_name]
                        # If stage not found, silently use default (no error added)
                    
                    # Create deal
                    deal_data = {
                        'title': title,
                        'value': value,
                        'company': str(row.get('company', '')).strip() if pd.notna(row.get('company')) else '',
                        'expected_close_date': pd.to_datetime(row.get('expected_close_date')) if pd.notna(row.get('expected_close_date')) else None,
                        'status': deal_status,
                        'pipeline_id': default_pipeline.id,
                        'stage_id': stage_to_use.id,
                        'owner_id': uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
                        'company_id': target_company_uuid,
                        'created_at': datetime.utcnow(),
                        'updated_at': datetime.utcnow()
                    }
                    
                    # Handle contact if provided (email)
                    contact_email = str(row.get('contact', '')).strip() if pd.notna(row.get('contact')) else ''
                    if contact_email:
                        # Try to find contact by email
                        contact = db.query(ContactModel).filter(
                            ContactModel.email.ilike(contact_email),
                            ContactModel.company_id == target_company_uuid,
                            ContactModel.is_deleted == False
                        ).first()
                        if contact:
                            deal_data['contact_id'] = contact.id
                    
                    db_deal = DealModel(**deal_data)
                    db.add(db_deal)
                    db.commit()
                    successful_imports += 1
                    
                except Exception as e:
                    db.rollback()
                    errors.append(f"Row {index + 1}: {str(e)}")
                    failed_imports += 1
        
        elif entity_type == "activities":
            for index, row in df.iterrows():
                try:
                    # Validate required fields
                    activity_type = str(row.get('type', '')).strip()
                    subject = str(row.get('subject', '')).strip()
                    
                    if not activity_type or not subject:
                        errors.append(f"Row {index + 1}: Type and subject are required")
                        failed_imports += 1
                        continue
                    
                    # Create activity
                    activity_data = {
                        'type': activity_type,
                        'subject': subject,
                        'description': str(row.get('description', '')).strip() if pd.notna(row.get('description')) else '',
                        'status': str(row.get('status', 'pending')).strip() if pd.notna(row.get('status')) else 'pending',
                        'due_date': pd.to_datetime(row.get('due_date')) if pd.notna(row.get('due_date')) else None,
                        'duration_minutes': int(row.get('duration_minutes', 30)) if pd.notna(row.get('duration_minutes')) else 30,
                        'priority': int(row.get('priority', 1)) if pd.notna(row.get('priority')) else 1,
                        'owner_id': uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
                        'company_id': uuid.UUID(company_id) if isinstance(company_id, str) else company_id,
                        'created_at': datetime.utcnow(),
                        'updated_at': datetime.utcnow()
                    }
                    
                    db_activity = ActivityModel(**activity_data)
                    db.add(db_activity)
                    db.commit()
                    successful_imports += 1
                    
                except Exception as e:
                    db.rollback()
                    errors.append(f"Row {index + 1}: {str(e)}")
                    failed_imports += 1
        
        return {
            "total_rows": total_rows,
            "processed_rows": successful_imports,
            "error_rows": failed_imports,
            "errors": errors[:10]  # Limit to first 10 errors
        }
        
    except Exception as e:
        return {
            "total_rows": 0,
            "processed_rows": 0,
            "error_rows": 0,
            "errors": [f"Failed to process file: {str(e)}"]
        }


async def send_import_notification_to_company(
    db: Session,
    company_id: str,
    entity_type: str,
    processed_rows: int,
    importer_name: str
):
    """Send notification to company admins when Super Admin imports data for their company"""
    try:
        target_company_uuid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
        
        # Get company name
        company = db.query(Company).filter(Company.id == target_company_uuid).first()
        company_name = company.name if company else "your company"
        
        # Get all company admins for this company
        company_admins = db.query(User).filter(
            User.company_id == target_company_uuid,
            User.role.in_(['company_admin', 'admin', 'Admin']),
            User.is_deleted == False,
            User.is_active == True
        ).all()
        
        if not company_admins:
            return
        
        # Format entity type for display
        entity_display = {
            "contacts": "contacts",
            "deals": "deals", 
            "activities": "activities"
        }.get(entity_type, entity_type)
        
        # Create notification for each company admin
        for admin in company_admins:
            notification = NotificationModel(
                title=f"Data Import Completed",
                message=f"{importer_name} has imported {processed_rows} {entity_display} to {company_name}.",
                type=NotificationType.SUCCESS,
                link=f"/{entity_type}",
                user_id=admin.id,
                company_id=target_company_uuid,
                extra_data={
                    "entity_type": entity_type,
                    "processed_rows": processed_rows,
                    "importer": importer_name
                }
            )
            db.add(notification)
        
        db.commit()
        
        # Broadcast WebSocket event for real-time sync
        try:
            from app.services.websocket_manager import broadcast_entity_change
            import asyncio
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(broadcast_entity_change(
                    company_id=str(target_company_uuid),
                    entity_type="notification",
                    action="created",
                    entity_id="import_notification",
                    data={
                        "title": "Data Import Completed",
                        "type": "success"
                    }
                ))
        except Exception as ws_error:
            print(f"WebSocket broadcast error: {ws_error}")
            
    except Exception as e:
        print(f"Failed to send import notification: {str(e)}")
