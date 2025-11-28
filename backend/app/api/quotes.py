"""
Quotes API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date
import uuid
import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

from app.core.security import get_current_active_user
from app.core.database import get_db
from app.models.quotes import Quote as QuoteModel, QuoteStatus

router = APIRouter(tags=["Quotes"])


# Pydantic Models
class QuoteBase(BaseModel):
    title: str
    amount: float
    client_id: Optional[str] = None
    deal_id: Optional[str] = None
    valid_until: Optional[date] = None
    description: Optional[str] = None
    terms: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "draft"


class QuoteCreate(QuoteBase):
    pass


class QuoteUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    client_id: Optional[str] = None
    deal_id: Optional[str] = None
    valid_until: Optional[date] = None
    description: Optional[str] = None
    terms: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class QuoteResponse(BaseModel):
    id: str
    quote_number: str
    title: str
    amount: float
    status: str
    client_id: Optional[str]
    deal_id: Optional[str]
    owner_id: str
    valid_until: Optional[str]
    created_at: str
    updated_at: str
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[QuoteResponse])
async def get_quotes(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get quotes based on user role - Sales Reps see only their own"""
    context = get_tenant_context(current_user)
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    user_id = current_user.get("id")
    user_team_id = current_user.get('team_id')
    
    if not company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No company associated with user")
    
    # Role-based filtering
    if context.is_super_admin():
        query = db.query(QuoteModel).filter(QuoteModel.is_deleted == False)
    elif has_permission(current_user, Permission.VIEW_COMPANY_DATA):
        # Company Admin sees all company quotes
        query = db.query(QuoteModel).filter(
            and_(
                QuoteModel.company_id == company_id,
                QuoteModel.is_deleted == False
            )
        )
    elif has_permission(current_user, Permission.VIEW_TEAM_DATA) and user_team_id:
        # Sales Manager sees team quotes
        from app.models.users import User
        team_user_ids = [str(u.id) for u in db.query(User).filter(
            User.team_id == user_team_id,
            User.is_deleted == False
        ).all()]
        query = db.query(QuoteModel).filter(
            and_(
                QuoteModel.company_id == company_id,
                QuoteModel.owner_id.in_([uuid.UUID(uid) for uid in team_user_ids]),
                QuoteModel.is_deleted == False
            )
        )
    else:
        # Sales Reps see ONLY their own quotes
        query = db.query(QuoteModel).filter(
            and_(
                QuoteModel.company_id == company_id,
                QuoteModel.owner_id == uuid.UUID(user_id),
                QuoteModel.is_deleted == False
            )
        )
    
    if status:
        query = query.filter(QuoteModel.status == status)
    
    quotes = query.order_by(desc(QuoteModel.created_at)).offset(skip).limit(limit).all()
    
    # Auto-fix: If quote is marked as expired but valid_until is in the future, change to draft
    from datetime import date as date_class
    for q in quotes:
        if q.status == QuoteStatus.EXPIRED and q.valid_until and q.valid_until > date_class.today():
            q.status = QuoteStatus.DRAFT
            db.commit()
    
    return [
        QuoteResponse(
            id=str(q.id),
            quote_number=q.quote_number,
            title=q.title,
            amount=float(q.amount),
            status=q.status.value if q.status else "draft",
            client_id=str(q.client_id) if q.client_id else None,
            deal_id=str(q.deal_id) if q.deal_id else None,
            owner_id=str(q.owner_id) if q.owner_id else None,
            valid_until=q.valid_until.isoformat() if q.valid_until else None,
            created_at=q.created_at.isoformat() if q.created_at else "",
            updated_at=q.updated_at.isoformat() if q.updated_at else ""
        )
        for q in quotes
    ]


@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_quote(
    quote_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get single quote"""
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    quote = db.query(QuoteModel).filter(
        and_(
            QuoteModel.id == uuid.UUID(quote_id),
            QuoteModel.company_id == company_id,
            QuoteModel.is_deleted == False
        )
    ).first()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    return QuoteResponse(
        id=str(quote.id),
        quote_number=quote.quote_number,
        title=quote.title,
        amount=float(quote.amount),
        status=quote.status.value if quote.status else "draft",
        client_id=str(quote.client_id) if quote.client_id else None,
        deal_id=str(quote.deal_id) if quote.deal_id else None,
        owner_id=str(quote.owner_id),
        valid_until=quote.valid_until.isoformat() if quote.valid_until else None,
        created_at=quote.created_at.isoformat() if quote.created_at else "",
        updated_at=quote.updated_at.isoformat() if quote.updated_at else ""
    )


@router.post("/", response_model=QuoteResponse, status_code=201)
async def create_quote(
    quote_data: QuoteCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create new quote"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    # Check for duplicate quote with same title
    # Sales Reps can only have unique titles in their own quotes
    # Managers and Admins check company-wide
    context = get_tenant_context(current_user)
    
    if context.is_super_admin() or has_permission(current_user, Permission.VIEW_COMPANY_DATA):
        # Check company-wide for admins
        existing_quote = db.query(QuoteModel).filter(
            and_(
                QuoteModel.title == quote_data.title,
                QuoteModel.company_id == company_id,
                QuoteModel.is_deleted == False
            )
        ).first()
    else:
        # Check only user's own quotes for Sales Reps
        existing_quote = db.query(QuoteModel).filter(
            and_(
                QuoteModel.title == quote_data.title,
                QuoteModel.owner_id == user_id,
                QuoteModel.is_deleted == False
            )
        ).first()
    
    if existing_quote:
        raise HTTPException(
            status_code=400,
            detail=f"A quote with title '{quote_data.title}' already exists. Please use a different title."
        )
    
    # Generate quote number by finding the highest existing number
    year = datetime.now().year
    
    # Get all quote numbers for this year (including deleted ones)
    existing_quotes = db.query(QuoteModel.quote_number).filter(
        QuoteModel.quote_number.like(f"QT-{year}-%")
    ).all()
    
    # Extract numbers and find the maximum
    max_number = 0
    for (quote_num,) in existing_quotes:
        try:
            # Extract the number part (e.g., "QT-2025-028" -> 28)
            num_part = int(quote_num.split('-')[-1])
            if num_part > max_number:
                max_number = num_part
        except (ValueError, IndexError):
            continue
    
    # Generate next quote number
    quote_number = f"QT-{year}-{str(max_number + 1).zfill(3)}"
    
    # Handle empty strings for UUIDs
    client_uuid = None
    if quote_data.client_id and quote_data.client_id.strip():
        try:
            client_uuid = uuid.UUID(quote_data.client_id)
        except ValueError:
            pass
    
    deal_uuid = None
    if quote_data.deal_id and quote_data.deal_id.strip():
        try:
            deal_uuid = uuid.UUID(quote_data.deal_id)
        except ValueError:
            pass
    
    quote = QuoteModel(
        quote_number=quote_number,
        title=quote_data.title,
        amount=quote_data.amount,
        client_id=client_uuid,
        deal_id=deal_uuid,
        owner_id=user_id,
        company_id=company_id,
        valid_until=quote_data.valid_until,
        description=quote_data.description,
        terms=quote_data.terms,
        notes=quote_data.notes,
        status=QuoteStatus(quote_data.status) if quote_data.status else QuoteStatus.DRAFT
    )
    
    db.add(quote)
    db.commit()
    db.refresh(quote)
    
    # Send notifications
    try:
        from app.services.notification_service import NotificationService
        from app.models.users import User
        
        creator = db.query(User).filter(User.id == user_id).first()
        creator_name = f"{creator.first_name} {creator.last_name}" if creator else "Unknown User"
        
        NotificationService.notify_quote_created(
            db=db,
            quote_id=quote.id,
            quote_title=quote.title,
            creator_id=user_id,
            creator_name=creator_name,
            company_id=company_id,
            quote_amount=float(quote.amount)
        )
    except Exception as notification_error:
        print(f"Notification error: {notification_error}")
    
    # Broadcast WebSocket event for real-time sync
    try:
        from app.services.websocket_manager import broadcast_entity_change
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(broadcast_entity_change(
                company_id=str(company_id),
                entity_type="quote",
                action="created",
                entity_id=str(quote.id),
                data={
                    "id": str(quote.id),
                    "quote_number": quote.quote_number,
                    "title": quote.title,
                    "amount": float(quote.amount),
                    "status": quote.status.value
                }
            ))
    except Exception as ws_error:
        print(f"WebSocket broadcast error: {ws_error}")
    
    return QuoteResponse(
        id=str(quote.id),
        quote_number=quote.quote_number,
        title=quote.title,
        amount=float(quote.amount),
        status=quote.status.value,
        client_id=str(quote.client_id) if quote.client_id else None,
        deal_id=str(quote.deal_id) if quote.deal_id else None,
        owner_id=str(quote.owner_id),
        valid_until=quote.valid_until.isoformat() if quote.valid_until else None,
        created_at=quote.created_at.isoformat(),
        updated_at=quote.updated_at.isoformat()
    )


@router.patch("/{quote_id}", response_model=QuoteResponse)
async def update_quote(
    quote_id: str,
    quote_data: QuoteUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update quote"""
    context = get_tenant_context(current_user)
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    # Super Admin can update quotes from any company
    if context.is_super_admin():
        quote = db.query(QuoteModel).filter(
            and_(
                QuoteModel.id == uuid.UUID(quote_id),
                QuoteModel.is_deleted == False
            )
        ).first()
    else:
        if not company_id:
            raise HTTPException(status_code=403, detail="No company associated with user")
        
        quote = db.query(QuoteModel).filter(
            and_(
                QuoteModel.id == uuid.UUID(quote_id),
                QuoteModel.company_id == company_id,
                QuoteModel.is_deleted == False
            )
        ).first()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Update fields
    if quote_data.title is not None:
        quote.title = quote_data.title
    if quote_data.amount is not None:
        quote.amount = quote_data.amount
    if quote_data.client_id is not None:
        if quote_data.client_id and quote_data.client_id.strip():
            try:
                quote.client_id = uuid.UUID(quote_data.client_id)
            except ValueError:
                quote.client_id = None
        else:
            quote.client_id = None
    if quote_data.deal_id is not None:
        if quote_data.deal_id and quote_data.deal_id.strip():
            try:
                quote.deal_id = uuid.UUID(quote_data.deal_id)
            except ValueError:
                quote.deal_id = None
        else:
            quote.deal_id = None
    if quote_data.valid_until is not None:
        quote.valid_until = quote_data.valid_until
        # If quote was expired and valid_until is extended to future date, change status back to draft
        if quote.status == QuoteStatus.EXPIRED and quote_data.valid_until > date.today():
            quote.status = QuoteStatus.DRAFT
    if quote_data.description is not None:
        quote.description = quote_data.description
    if quote_data.terms is not None:
        quote.terms = quote_data.terms
    if quote_data.notes is not None:
        quote.notes = quote_data.notes
    if quote_data.status is not None:
        quote.status = QuoteStatus(quote_data.status)
        if quote_data.status == "sent" and not quote.sent_at:
            quote.sent_at = date.today()
        elif quote_data.status == "accepted" and not quote.accepted_at:
            quote.accepted_at = date.today()
    
    db.commit()
    db.refresh(quote)
    
    # Broadcast WebSocket event for real-time sync
    try:
        from app.services.websocket_manager import broadcast_entity_change
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(broadcast_entity_change(
                company_id=str(company_id),
                entity_type="quote",
                action="updated",
                entity_id=str(quote.id),
                data={
                    "id": str(quote.id),
                    "quote_number": quote.quote_number,
                    "title": quote.title,
                    "amount": float(quote.amount),
                    "status": quote.status.value
                }
            ))
    except Exception as ws_error:
        print(f"WebSocket broadcast error: {ws_error}")
    
    return QuoteResponse(
        id=str(quote.id),
        quote_number=quote.quote_number,
        title=quote.title,
        amount=float(quote.amount),
        status=quote.status.value,
        client_id=str(quote.client_id) if quote.client_id else None,
        deal_id=str(quote.deal_id) if quote.deal_id else None,
        owner_id=str(quote.owner_id),
        valid_until=quote.valid_until.isoformat() if quote.valid_until else None,
        created_at=quote.created_at.isoformat(),
        updated_at=quote.updated_at.isoformat()
    )


@router.delete("/{quote_id}")
async def delete_quote(
    quote_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete quote - Only Managers and Admins"""
    context = get_tenant_context(current_user)
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Super Admin can delete quotes from any company
    if context.is_super_admin():
        quote = db.query(QuoteModel).filter(
            and_(
                QuoteModel.id == uuid.UUID(quote_id),
                QuoteModel.is_deleted == False
            )
        ).first()
    else:
        if not company_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No company associated with user")
        
        quote = db.query(QuoteModel).filter(
            and_(
                QuoteModel.id == uuid.UUID(quote_id),
                QuoteModel.company_id == company_id,
                QuoteModel.is_deleted == False
            )
        ).first()
    
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quote not found")
    
    # Only Managers and Admins can delete quotes
    if context.is_super_admin():
        pass
    elif has_permission(current_user, Permission.VIEW_COMPANY_DATA):
        pass
    elif has_permission(current_user, Permission.VIEW_TEAM_DATA):
        if user_team_id:
            from app.models.users import User
            team_user_ids = [str(u.id) for u in db.query(User).filter(
                User.team_id == user_team_id,
                User.is_deleted == False
            ).all()]
            if str(quote.created_by) not in team_user_ids:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete quotes from your team members.")
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not assigned to a team.")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to delete quotes. Only managers and administrators can delete quotes.")
    
    quote.is_deleted = True
    db.commit()
    
    # Send deletion notification
    try:
        from app.services.notification_service import NotificationService
        from app.models.users import User
        deleter = db.query(User).filter(User.id == uuid.UUID(current_user['id'])).first()
        deleter_name = f"{deleter.first_name} {deleter.last_name}" if deleter else "Unknown User"
        
        NotificationService.notify_quote_deleted(
            db=db,
            quote_title=quote.title,
            deleter_id=uuid.UUID(current_user['id']),
            deleter_name=deleter_name,
            company_id=quote.company_id
        )
    except Exception as e:
        print(f"⚠️ Failed to send quote deletion notification: {e}")
    
    # Broadcast WebSocket event for real-time sync
    try:
        from app.services.websocket_manager import broadcast_entity_change
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(broadcast_entity_change(
                company_id=str(company_id),
                entity_type="quote",
                action="deleted",
                entity_id=str(quote.id),
                data=None
            ))
    except Exception as ws_error:
        print(f"WebSocket broadcast error: {ws_error}")
    
    return {"message": "Quote deleted successfully"}


@router.get("/{quote_id}/download")
async def download_quote(
    quote_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Download quote as PDF"""
    context = get_tenant_context(current_user)
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    # Super Admin can download quotes from any company
    if context.is_super_admin():
        quote = db.query(QuoteModel).filter(
            and_(
                QuoteModel.id == uuid.UUID(quote_id),
                QuoteModel.is_deleted == False
            )
        ).first()
    else:
        if not company_id:
            raise HTTPException(status_code=403, detail="No company associated with user")
        
        quote = db.query(QuoteModel).filter(
            and_(
                QuoteModel.id == uuid.UUID(quote_id),
                QuoteModel.company_id == company_id,
                QuoteModel.is_deleted == False
            )
        ).first()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Create PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=12,
    )
    
    # Add title
    elements.append(Paragraph("QUOTATION", title_style))
    elements.append(Spacer(1, 12))
    
    # Quote details table
    quote_data = [
        ['Quote Number:', quote.quote_number],
        ['Date:', quote.created_at.strftime('%B %d, %Y')],
        ['Valid Until:', quote.valid_until.strftime('%B %d, %Y') if quote.valid_until else 'N/A'],
        ['Status:', quote.status.value.upper()],
    ]
    
    quote_table = Table(quote_data, colWidths=[2*inch, 4*inch])
    quote_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#374151')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#6b7280')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(quote_table)
    elements.append(Spacer(1, 30))
    
    # Amount table
    amount_data = [
        ['Description', 'Amount'],
        [quote.title, f'${quote.amount:,.2f}'],
        ['', ''],
        ['Total Amount', f'${quote.amount:,.2f}'],
    ]
    
    amount_table = Table(amount_data, colWidths=[4*inch, 2*inch])
    amount_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -2), colors.white),
        ('GRID', (0, 0), (-1, -2), 1, colors.HexColor('#e5e7eb')),
        ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#1e40af')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 14),
        ('TOPPADDING', (0, -1), (-1, -1), 12),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#1e40af')),
    ]))
    
    elements.append(amount_table)
    elements.append(Spacer(1, 30))
    
    # Footer
    footer_text = f"<i>Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</i>"
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#9ca3af'),
        alignment=TA_CENTER
    )
    elements.append(Paragraph(footer_text, footer_style))
    
    # Build PDF
    doc.build(elements)
    
    # Get the value of the BytesIO buffer
    buffer.seek(0)
    
    # Return as streaming response
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={quote.quote_number}.pdf"
        }
    )
