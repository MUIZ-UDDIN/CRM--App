"""
Public Quote API endpoints - No authentication required
These endpoints allow clients to view and respond to quotes via a secure token link
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, date
import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

from app.core.database import get_db
from app.models.quotes import Quote as QuoteModel, QuoteStatus
from app.models.contacts import Contact
from app.models.users import User
from app.models.companies import Company
from app.models.notifications import Notification

router = APIRouter(tags=["Public Quotes"])


# Pydantic Models for Public API
class PublicQuoteResponse(BaseModel):
    quote_number: str
    title: str
    amount: float
    status: str
    valid_until: Optional[str]
    description: Optional[str]
    terms: Optional[str]
    created_at: str
    company_name: Optional[str]
    company_logo: Optional[str]
    client_name: Optional[str]
    client_email: Optional[str]
    is_expired: bool
    can_respond: bool


class QuoteResponseRequest(BaseModel):
    action: str  # "accept" or "reject"
    note: Optional[str] = None


@router.get("/{token}")
async def get_public_quote(
    token: str,
    db: Session = Depends(get_db)
):
    """Get quote details by public token - No authentication required"""
    
    # Find quote by token
    quote = db.query(QuoteModel).filter(
        and_(
            QuoteModel.public_token == token,
            QuoteModel.is_deleted == False
        )
    ).first()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found or link has expired"
        )
    
    # Get related data
    client = db.query(Contact).filter(Contact.id == quote.client_id).first() if quote.client_id else None
    company = db.query(Company).filter(Company.id == quote.company_id).first() if quote.company_id else None
    
    # Check if expired
    is_expired = False
    if quote.valid_until and quote.valid_until < date.today():
        is_expired = True
        # Auto-update status to expired if not already
        if quote.status == QuoteStatus.SENT:
            quote.status = QuoteStatus.EXPIRED
            db.commit()
    
    # Can only respond if status is "sent" and not expired
    can_respond = quote.status == QuoteStatus.SENT and not is_expired
    
    return {
        "quote_number": quote.quote_number,
        "title": quote.title,
        "amount": float(quote.amount),
        "status": quote.status.value if hasattr(quote.status, 'value') else quote.status,
        "valid_until": quote.valid_until.isoformat() if quote.valid_until else None,
        "description": quote.description,
        "terms": quote.terms,
        "created_at": quote.created_at.isoformat() if quote.created_at else None,
        "sent_at": quote.sent_at.isoformat() if quote.sent_at else None,
        "company_name": company.name if company else None,
        "company_logo": company.logo_url if company and hasattr(company, 'logo_url') else None,
        "client_name": f"{client.first_name} {client.last_name}" if client else None,
        "client_email": client.email if client else None,
        "is_expired": is_expired,
        "can_respond": can_respond
    }


@router.post("/{token}/respond")
async def respond_to_quote(
    token: str,
    response: QuoteResponseRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Accept or reject a quote - No authentication required"""
    
    # Find quote by token
    quote = db.query(QuoteModel).filter(
        and_(
            QuoteModel.public_token == token,
            QuoteModel.is_deleted == False
        )
    ).first()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found or link has expired"
        )
    
    # Check if quote can be responded to
    if quote.status != QuoteStatus.SENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quote has already been {quote.status.value if hasattr(quote.status, 'value') else quote.status}"
        )
    
    # Check if expired
    if quote.valid_until and quote.valid_until < date.today():
        quote.status = QuoteStatus.EXPIRED
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quote has expired and can no longer be accepted"
        )
    
    # Validate action
    if response.action not in ["accept", "reject"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be 'accept' or 'reject'"
        )
    
    # Get client IP for audit
    client_ip = request.client.host if request.client else None
    
    # Update quote status
    now = datetime.utcnow()
    if response.action == "accept":
        quote.status = QuoteStatus.ACCEPTED
        quote.accepted_at = now
        action_text = "accepted"
    else:
        quote.status = QuoteStatus.REJECTED
        quote.rejected_at = now
        action_text = "rejected"
    
    quote.client_response_note = response.note
    quote.client_ip = client_ip
    
    db.commit()
    
    # Create notification for quote owner
    try:
        client = db.query(Contact).filter(Contact.id == quote.client_id).first() if quote.client_id else None
        client_name = f"{client.first_name} {client.last_name}" if client else "Client"
        
        notification = Notification(
            user_id=quote.owner_id,
            company_id=quote.company_id,
            title=f"Quote {action_text.capitalize()}",
            message=f"{client_name} has {action_text} quote {quote.quote_number} ({quote.title}) for ${float(quote.amount):,.2f}",
            type="quote_response",
            reference_type="quote",
            reference_id=quote.id,
            is_read=False
        )
        db.add(notification)
        db.commit()
    except Exception as e:
        # Don't fail the response if notification fails
        print(f"Failed to create notification: {e}")
    
    return {
        "success": True,
        "message": f"Quote has been {action_text} successfully",
        "status": quote.status.value if hasattr(quote.status, 'value') else quote.status
    }


@router.get("/{token}/pdf")
async def download_public_quote_pdf(
    token: str,
    db: Session = Depends(get_db)
):
    """Download quote as PDF - No authentication required"""
    
    # Find quote by token
    quote = db.query(QuoteModel).filter(
        and_(
            QuoteModel.public_token == token,
            QuoteModel.is_deleted == False
        )
    ).first()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quote not found"
        )
    
    # Get related data
    client = db.query(Contact).filter(Contact.id == quote.client_id).first() if quote.client_id else None
    company = db.query(Company).filter(Company.id == quote.company_id).first() if quote.company_id else None
    
    # Generate PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    elements = []
    styles = getSampleStyleSheet()
    
    # Header with company name
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=20,
        alignment=TA_CENTER
    )
    company_name = company.name if company else "Quote"
    elements.append(Paragraph(company_name, header_style))
    
    # Quote title
    title_style = ParagraphStyle(
        'QuoteTitle',
        parent=styles['Heading2'],
        fontSize=18,
        textColor=colors.HexColor('#374151'),
        spaceAfter=10,
        alignment=TA_CENTER
    )
    elements.append(Paragraph(f"Quote: {quote.title}", title_style))
    elements.append(Spacer(1, 20))
    
    # Quote details table
    quote_info = [
        ["Quote Number:", quote.quote_number],
        ["Date:", quote.created_at.strftime('%B %d, %Y') if quote.created_at else "N/A"],
        ["Valid Until:", quote.valid_until.strftime('%B %d, %Y') if quote.valid_until else "N/A"],
        ["Status:", (quote.status.value if hasattr(quote.status, 'value') else quote.status).upper()],
    ]
    
    if client:
        quote_info.insert(1, ["Client:", f"{client.first_name} {client.last_name}"])
        if client.email:
            quote_info.insert(2, ["Email:", client.email])
    
    info_table = Table(quote_info, colWidths=[1.5*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6b7280')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#111827')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 30))
    
    # Description
    if quote.description:
        desc_title = ParagraphStyle('DescTitle', parent=styles['Heading3'], fontSize=14, textColor=colors.HexColor('#374151'))
        elements.append(Paragraph("Description", desc_title))
        elements.append(Spacer(1, 10))
        desc_style = ParagraphStyle('Description', parent=styles['Normal'], fontSize=11, textColor=colors.HexColor('#4b5563'))
        elements.append(Paragraph(quote.description, desc_style))
        elements.append(Spacer(1, 20))
    
    # Terms
    if quote.terms:
        terms_title = ParagraphStyle('TermsTitle', parent=styles['Heading3'], fontSize=14, textColor=colors.HexColor('#374151'))
        elements.append(Paragraph("Terms & Conditions", terms_title))
        elements.append(Spacer(1, 10))
        terms_style = ParagraphStyle('Terms', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#6b7280'))
        elements.append(Paragraph(quote.terms, terms_style))
        elements.append(Spacer(1, 20))
    
    # Amount box
    amount_data = [["Total Amount", f"${float(quote.amount):,.2f}"]]
    amount_table = Table(amount_data, colWidths=[3*inch, 2.5*inch])
    amount_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 16),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 15),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ('LEFTPADDING', (0, 0), (-1, -1), 15),
        ('RIGHTPADDING', (0, 0), (-1, -1), 15),
    ]))
    elements.append(amount_table)
    elements.append(Spacer(1, 30))
    
    # Footer
    footer_text = f"<i>Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</i>"
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#9ca3af'), alignment=TA_CENTER)
    elements.append(Paragraph(footer_text, footer_style))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={quote.quote_number}.pdf"}
    )
