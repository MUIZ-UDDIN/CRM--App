"""
Email API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
import uuid

from app.core.security import get_current_active_user
from app.core.database import get_db
from app.models.emails import Email as EmailModel, EmailStatus

router = APIRouter(tags=["Emails"])


# Pydantic Models
class EmailBase(BaseModel):
    to_email: EmailStr
    subject: str
    body: str
    cc: Optional[str] = None
    bcc: Optional[str] = None
    contact_id: Optional[uuid.UUID] = None


class EmailCreate(EmailBase):
    pass


class EmailUpdate(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = None


class EmailResponse(BaseModel):
    id: uuid.UUID
    from_email: str
    to_email: str
    subject: str
    body: str
    cc: Optional[str]
    bcc: Optional[str]
    status: str
    sent_at: Optional[datetime]
    read_at: Optional[datetime]
    contact_id: Optional[uuid.UUID]
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[EmailResponse])
async def get_emails(
    type: str = Query("inbox", description="inbox, sent, draft, trash"),
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get emails by type (inbox, sent, draft, trash)"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    query = db.query(EmailModel).filter(EmailModel.owner_id == user_id)
    
    # Filter by type
    if type == "inbox":
        query = query.filter(EmailModel.from_email != current_user["email"])
    elif type == "sent":
        query = query.filter(
            and_(
                EmailModel.from_email == current_user["email"],
                EmailModel.status == EmailStatus.SENT
            )
        )
    elif type == "draft":
        query = query.filter(EmailModel.status == EmailStatus.DRAFT)
    elif type == "trash":
        query = query.filter(EmailModel.is_deleted == True)
    
    # Exclude deleted unless specifically requesting trash
    if type != "trash":
        query = query.filter(EmailModel.is_deleted == False)
    
    emails = query.order_by(desc(EmailModel.created_at)).offset(skip).limit(limit).all()
    return emails


@router.get("/{email_id}", response_model=EmailResponse)
async def get_email(
    email_id: uuid.UUID,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a single email by ID"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    email = db.query(EmailModel).filter(
        and_(
            EmailModel.id == email_id,
            EmailModel.user_id == user_id
        )
    ).first()
    
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    return email


@router.post("/", response_model=EmailResponse, status_code=201)
async def create_email(
    email_data: EmailCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create and send a new email"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Create email record
    email = EmailModel(
        from_email=current_user["email"],
        to_email=email_data.to_email,
        subject=email_data.subject,
        body=email_data.body,
        cc=email_data.cc,
        bcc=email_data.bcc,
        contact_id=email_data.contact_id,
        user_id=user_id,
        status=EmailStatus.SENT,
        sent_at=datetime.utcnow()
    )
    
    db.add(email)
    db.commit()
    db.refresh(email)
    
    # TODO: Actually send the email using email service (SendGrid, etc.)
    
    return email


@router.post("/draft", response_model=EmailResponse, status_code=201)
async def create_draft(
    email_data: EmailCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Save email as draft"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    email = EmailModel(
        from_email=current_user["email"],
        to_email=email_data.to_email,
        subject=email_data.subject,
        body=email_data.body,
        cc=email_data.cc,
        bcc=email_data.bcc,
        contact_id=email_data.contact_id,
        user_id=user_id,
        status=EmailStatus.DRAFT
    )
    
    db.add(email)
    db.commit()
    db.refresh(email)
    
    return email


@router.put("/{email_id}", response_model=EmailResponse)
async def update_email(
    email_id: uuid.UUID,
    email_data: EmailUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update an email (mainly for drafts)"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    email = db.query(EmailModel).filter(
        and_(
            EmailModel.id == email_id,
            EmailModel.user_id == user_id
        )
    ).first()
    
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    # Update fields
    update_data = email_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(email, key, value)
    
    email.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(email)
    
    return email


@router.post("/{email_id}/mark-read")
async def mark_as_read(
    email_id: uuid.UUID,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark email as read"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    email = db.query(EmailModel).filter(
        and_(
            EmailModel.id == email_id,
            EmailModel.user_id == user_id
        )
    ).first()
    
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    email.read_at = datetime.utcnow()
    email.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Email marked as read"}


@router.post("/{email_id}/mark-unread")
async def mark_as_unread(
    email_id: uuid.UUID,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark email as unread"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    email = db.query(EmailModel).filter(
        and_(
            EmailModel.id == email_id,
            EmailModel.user_id == user_id
        )
    ).first()
    
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    email.read_at = None
    email.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Email marked as unread"}


@router.delete("/{email_id}")
async def delete_email(
    email_id: uuid.UUID,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Soft delete an email (move to trash)"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    email = db.query(EmailModel).filter(
        and_(
            EmailModel.id == email_id,
            EmailModel.user_id == user_id
        )
    ).first()
    
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    email.is_deleted = True
    email.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Email moved to trash"}


@router.post("/{email_id}/restore")
async def restore_email(
    email_id: uuid.UUID,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Restore email from trash"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    email = db.query(EmailModel).filter(
        and_(
            EmailModel.id == email_id,
            EmailModel.user_id == user_id
        )
    ).first()
    
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    email.is_deleted = False
    email.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Email restored"}


@router.get("/stats/summary")
async def get_email_stats(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get email statistics"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    total = db.query(EmailModel).filter(
        and_(
            EmailModel.user_id == user_id,
            EmailModel.is_deleted == False
        )
    ).count()
    
    unread = db.query(EmailModel).filter(
        and_(
            EmailModel.user_id == user_id,
            EmailModel.read_at == None,
            EmailModel.from_email != current_user["email"],
            EmailModel.is_deleted == False
        )
    ).count()
    
    sent = db.query(EmailModel).filter(
        and_(
            EmailModel.user_id == user_id,
            EmailModel.status == EmailStatus.SENT,
            EmailModel.from_email == current_user["email"],
            EmailModel.is_deleted == False
        )
    ).count()
    
    drafts = db.query(EmailModel).filter(
        and_(
            EmailModel.user_id == user_id,
            EmailModel.status == EmailStatus.DRAFT,
            EmailModel.is_deleted == False
        )
    ).count()
    
    return {
        "total": total,
        "unread": unread,
        "sent": sent,
        "drafts": drafts
    }


@router.post("/track/open/{email_id}")
async def track_email_open(
    email_id: str,
    db: Session = Depends(get_db)
):
    """Track email open event (called when tracking pixel loads)"""
    try:
        email = db.query(EmailModel).filter(
            EmailModel.id == uuid.UUID(email_id),
            EmailModel.is_deleted == False
        ).first()
        
        if not email:
            # Don't raise error for tracking - just return success
            return {"status": "ok"}
        
        # Update email read status
        if not email.read_at:
            email.read_at = datetime.utcnow()
        
        # Increment open count if field exists
        if hasattr(email, 'open_count'):
            email.open_count = (email.open_count or 0) + 1
        
        db.commit()
        db.refresh(email)
        
        # Trigger workflow for email_opened
        try:
            from app.services.workflow_executor import WorkflowExecutor
            from app.models.workflows import WorkflowTrigger
            from app.core.database import SessionLocal
            import asyncio
            import threading
            
            def run_workflow():
                workflow_db = SessionLocal()
                try:
                    print(f"🔥 Starting workflow trigger for email_opened")
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    executor = WorkflowExecutor(workflow_db)
                    trigger_data = {
                        "email_id": str(email.id),
                        "email_subject": email.subject,
                        "to_email": email.to_email,
                        "contact_id": str(email.contact_id) if email.contact_id else None,
                        "owner_id": str(email.owner_id)
                    }
                    print(f"🔥 Trigger data: {trigger_data}")
                    result = loop.run_until_complete(executor.trigger_workflows(
                        WorkflowTrigger.EMAIL_OPENED,
                        trigger_data,
                        str(email.owner_id)
                    ))
                    print(f"🔥 Workflow trigger completed, executions: {len(result) if result else 0}")
                    loop.close()
                except Exception as e:
                    print(f"❌ Workflow execution error: {e}")
                    import traceback
                    traceback.print_exc()
                finally:
                    workflow_db.close()
            
            thread = threading.Thread(target=run_workflow, daemon=True)
            thread.start()
            print(f"🔥 Workflow thread started for email_opened")
        except Exception as workflow_error:
            print(f"❌ Workflow trigger error: {workflow_error}")
        
        return {"status": "ok", "message": "Email open tracked"}
        
    except Exception as e:
        print(f"Error tracking email open: {e}")
        # Don't raise error for tracking
        return {"status": "ok"}
