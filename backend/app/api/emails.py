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
    """Get emails by type (inbox, sent, draft, trash) for company"""
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    query = db.query(EmailModel).filter(EmailModel.company_id == company_id)
    
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
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    email = db.query(EmailModel).filter(
        and_(
            EmailModel.id == email_id,
            EmailModel.company_id == company_id
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
    from loguru import logger
    import os
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, Email, To, Content
    
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    try:
        # Get SendGrid settings from Twilio settings
        from app.models.twilio_settings import TwilioSettings
        settings = db.query(TwilioSettings).filter(
            TwilioSettings.company_id == company_id
        ).first()
        
        if not settings or not settings.sendgrid_api_key:
            raise HTTPException(
                status_code=400,
                detail="SendGrid not configured. Please add SendGrid API key in Twilio Settings."
            )
        
        sendgrid_api_key = settings.sendgrid_api_key
        from_email = settings.sendgrid_from_email or current_user["email"]
        
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
            company_id=company_id,
            status=EmailStatus.DRAFT,  # Start as draft
            sent_at=None
        )
        
        # Send email via SendGrid
        try:
            sg = SendGridAPIClient(sendgrid_api_key)
            
            message = Mail(
                from_email=Email(from_email),
                to_emails=To(email_data.to_email),
                subject=email_data.subject,
                html_content=Content("text/html", email_data.body)
            )
            
            # Add CC and BCC if provided
            if email_data.cc:
                message.add_cc(email_data.cc)
            if email_data.bcc:
                message.add_bcc(email_data.bcc)
            
            response = sg.send(message)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"✅ Email sent successfully to {email_data.to_email}")
                email.status = EmailStatus.SENT
                email.sent_at = datetime.utcnow()
            else:
                logger.error(f"❌ SendGrid error: {response.status_code}")
                email.status = EmailStatus.FAILED
                
        except Exception as e:
            logger.error(f"❌ SendGrid error: {str(e)}")
            email.status = EmailStatus.FAILED
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send email: {str(e)}"
            )
        
        db.add(email)
        db.commit()
        db.refresh(email)
        
        return email
        
    except Exception as e:
        logger.error(f"❌ Email creation error: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create email: {str(e)}"
        )


@router.post("/draft", response_model=EmailResponse, status_code=201)
async def create_draft(
    email_data: EmailCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Save email as draft"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    email = EmailModel(
        from_email=current_user["email"],
        to_email=email_data.to_email,
        subject=email_data.subject,
        body=email_data.body,
        cc=email_data.cc,
        bcc=email_data.bcc,
        contact_id=email_data.contact_id,
        user_id=user_id,
        company_id=company_id,
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
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    email = db.query(EmailModel).filter(
        and_(
            EmailModel.id == email_id,
            EmailModel.company_id == company_id
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
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    email = db.query(EmailModel).filter(
        and_(
            EmailModel.id == email_id,
            EmailModel.company_id == company_id
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
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    email = db.query(EmailModel).filter(
        and_(
            EmailModel.id == email_id,
            EmailModel.company_id == company_id
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
    """Soft delete an email (move to trash) - Only Managers and Admins"""
    from app.middleware.tenant import get_tenant_context
    from app.middleware.permissions import has_permission
    from app.models.permissions import Permission
    
    context = get_tenant_context(current_user)
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    email = db.query(EmailModel).filter(
        and_(
            EmailModel.id == email_id,
            EmailModel.company_id == company_id
        )
    ).first()
    
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    # CRITICAL: Only Managers and Admins can delete emails
    # Sales Reps CANNOT delete emails per permission matrix
    if context.is_super_admin():
        # Super admin can delete any email
        pass
    elif has_permission(current_user, Permission.MANAGE_COMPANY_DATA):
        # Company admin can delete any email in their company
        pass
    elif has_permission(current_user, Permission.MANAGE_TEAM_DATA):
        # Sales manager can only delete emails from their team
        if user_team_id:
            from app.models.users import User
            team_user_ids = [str(u.id) for u in db.query(User).filter(
                User.team_id == user_team_id,
                User.is_deleted == False
            ).all()]
            
            if str(email.sender_id) not in team_user_ids:
                raise HTTPException(
                    status_code=403,
                    detail="You can only delete emails from your team members."
                )
        else:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to a team. Please contact your administrator."
            )
    else:
        # Sales Reps and regular users CANNOT delete emails
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to delete emails. Only managers and administrators can delete emails. Please contact your manager if you need to remove an email."
        )
    
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
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    email = db.query(EmailModel).filter(
        and_(
            EmailModel.id == email_id,
            EmailModel.company_id == company_id
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
    """Get email statistics for company"""
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    total = db.query(EmailModel).filter(
        and_(
            EmailModel.company_id == company_id,
            EmailModel.is_deleted == False
        )
    ).count()
    
    unread = db.query(EmailModel).filter(
        and_(
            EmailModel.company_id == company_id,
            EmailModel.read_at == None,
            EmailModel.from_email != current_user["email"],
            EmailModel.is_deleted == False
        )
    ).count()
    
    sent = db.query(EmailModel).filter(
        and_(
            EmailModel.company_id == company_id,
            EmailModel.status == EmailStatus.SENT,
            EmailModel.from_email == current_user["email"],
            EmailModel.is_deleted == False
        )
    ).count()
    
    drafts = db.query(EmailModel).filter(
        and_(
            EmailModel.company_id == company_id,
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


@router.post("/webhook/inbound", include_in_schema=False)
async def inbound_email_webhook(
    request: dict,
    db: Session = Depends(get_db)
):
    """
    Webhook for receiving inbound emails from SendGrid
    Configure this URL in SendGrid: https://sunstonecrm.com/api/emails/webhook/inbound
    """
    from loguru import logger
    
    try:
        logger.info(f"📧 Received inbound email webhook: {request}")
        
        # Extract email data from SendGrid webhook
        from_email = request.get("from", "")
        to_email = request.get("to", "")
        subject = request.get("subject", "")
        text_body = request.get("text", "")
        html_body = request.get("html", "")
        
        # Use HTML if available, otherwise text
        body = html_body if html_body else text_body
        
        # Find user by to_email (match with sendgrid_from_email)
        from app.models.twilio_settings import TwilioSettings
        settings = db.query(TwilioSettings).filter(
            TwilioSettings.sendgrid_from_email == to_email
        ).first()
        
        if not settings:
            logger.warning(f"⚠️ No user found for email: {to_email}")
            return {"status": "ok", "message": "No user found"}
        
        # Create inbound email record
        email = EmailModel(
            from_email=from_email,
            to_email=to_email,
            subject=subject,
            body=body,
            user_id=settings.user_id,
            status=EmailStatus.RECEIVED,
            sent_at=datetime.utcnow()
        )
        
        db.add(email)
        db.commit()
        
        logger.info(f"✅ Inbound email saved from {from_email}")
        
        return {"status": "ok", "message": "Email received"}
        
    except Exception as e:
        logger.error(f"❌ Inbound email webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}


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
