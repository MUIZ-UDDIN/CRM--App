"""
Support Tickets and Chat API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, or_
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, UUID4, validator
from datetime import datetime, timedelta
import uuid

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

router = APIRouter(prefix="/api/support", tags=["support"])


# Pydantic models
class TicketPriority(str):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TicketStatus(str):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING = "waiting"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketBase(BaseModel):
    subject: str
    description: str
    priority: str = TicketPriority.MEDIUM
    category: Optional[str] = None


class TicketCreate(TicketBase):
    attachments: Optional[List[str]] = None


class TicketUpdate(BaseModel):
    subject: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None
    assigned_to: Optional[UUID4] = None


class TicketResponse(TicketBase):
    id: UUID4
    status: str
    created_at: datetime
    updated_at: datetime
    created_by: UUID4
    assigned_to: Optional[UUID4] = None
    company_id: UUID4
    attachments: Optional[List[str]] = None
    message_count: int = 0
    
    @validator('id', 'created_by', 'assigned_to', 'company_id', pre=True)
    def convert_uuid(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

    class Config:
        from_attributes = True


class MessageBase(BaseModel):
    content: str
    attachments: Optional[List[str]] = None


class MessageCreate(MessageBase):
    pass


class MessageResponse(MessageBase):
    id: UUID4
    ticket_id: UUID4
    created_at: datetime
    created_by: UUID4
    is_from_support: bool
    
    @validator('id', 'ticket_id', 'created_by', pre=True)
    def convert_uuid(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

    class Config:
        from_attributes = True


# Create models if they don't exist
def create_support_models(db: Session):
    """Create support models if they don't exist"""
    from sqlalchemy import Column, String, Boolean, JSON, ForeignKey, DateTime, Integer, Text, Enum
    from sqlalchemy.dialects.postgresql import UUID, ARRAY
    from sqlalchemy.orm import relationship
    from app.models.base import Base, BaseModel
    import enum
    
    # Check if models already exist
    if hasattr(Base.metadata.tables, 'support_tickets'):
        return
    
    # Create enum classes
    class TicketPriorityEnum(str, enum.Enum):
        LOW = "low"
        MEDIUM = "medium"
        HIGH = "high"
        URGENT = "urgent"
    
    class TicketStatusEnum(str, enum.Enum):
        OPEN = "open"
        IN_PROGRESS = "in_progress"
        WAITING = "waiting"
        RESOLVED = "resolved"
        CLOSED = "closed"
    
    # Create SupportTicket model
    class SupportTicket(BaseModel):
        __tablename__ = 'support_tickets'
        
        subject = Column(String(255), nullable=False)
        description = Column(Text, nullable=False)
        priority = Column(Enum(TicketPriorityEnum), default=TicketPriorityEnum.MEDIUM, nullable=False)
        status = Column(Enum(TicketStatusEnum), default=TicketStatusEnum.OPEN, nullable=False)
        category = Column(String(100))
        attachments = Column(ARRAY(String), default=[])
        
        company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False)
        created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
        assigned_to = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
        
        # Relationships
        messages = relationship('TicketMessage', back_populates='ticket', cascade='all, delete-orphan')
        creator = relationship('User', foreign_keys=[created_by])
        assignee = relationship('User', foreign_keys=[assigned_to])
        
        def __repr__(self):
            return f"<SupportTicket {self.subject} ({self.status})>"
    
    # Create TicketMessage model
    class TicketMessage(BaseModel):
        __tablename__ = 'ticket_messages'
        
        content = Column(Text, nullable=False)
        attachments = Column(ARRAY(String), default=[])
        is_from_support = Column(Boolean, default=False)
        
        ticket_id = Column(UUID(as_uuid=True), ForeignKey('support_tickets.id', ondelete='CASCADE'), nullable=False)
        created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
        
        # Relationships
        ticket = relationship('SupportTicket', back_populates='messages')
        creator = relationship('User')
        
        def __repr__(self):
            return f"<TicketMessage for ticket {self.ticket_id}>"
    
    # Create tables
    Base.metadata.create_all(bind=db.bind, tables=[SupportTicket.__table__, TicketMessage.__table__])
    
    return SupportTicket, TicketMessage


@router.post("/tickets", response_model=TicketResponse)
async def create_ticket(
    ticket: TicketCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new support ticket"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    
    # Check permissions
    if not has_permission(current_user, Permission.CREATE_SUPPORT_TICKETS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create support tickets"
        )
    
    # Create models if they don't exist
    SupportTicket, _ = create_support_models(db)
    
    # Create ticket
    new_ticket = SupportTicket(
        subject=ticket.subject,
        description=ticket.description,
        priority=ticket.priority,
        category=ticket.category,
        attachments=ticket.attachments or [],
        company_id=uuid.UUID(company_id) if isinstance(company_id, str) else company_id,
        created_by=uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    )
    
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    
    # Add message count
    setattr(new_ticket, 'message_count', 0)
    
    # Notify support team (in a real implementation)
    # background_tasks.add_task(notify_support_team, new_ticket.id)
    
    return new_ticket


@router.get("/tickets", response_model=List[TicketResponse])
async def list_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    assigned_to_me: bool = False,
    created_by_me: bool = False,
    days: int = 90,  # Get tickets from the last X days
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List support tickets based on role permissions"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    
    # Check permissions
    if not has_permission(current_user, Permission.VIEW_SUPPORT_TICKETS) and not context.is_super_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view support tickets"
        )
    
    # Create models if they don't exist
    SupportTicket, TicketMessage = create_support_models(db)
    
    # Calculate date range
    date_from = datetime.utcnow() - timedelta(days=days)
    
    # Base query
    query = db.query(SupportTicket).filter(
        and_(
            SupportTicket.created_at >= date_from,
            SupportTicket.is_deleted == False
        )
    )
    
    # Apply role-based filters
    if context.is_super_admin():
        # Super admin can see all tickets
        pass
    elif has_permission(current_user, Permission.MANAGE_SUPPORT):
        # Support team can see all tickets
        pass
    else:
        # Regular users can only see their company's tickets
        query = query.filter(SupportTicket.company_id == company_id)
    
    # Apply filters
    if status:
        query = query.filter(SupportTicket.status == status)
    
    if priority:
        query = query.filter(SupportTicket.priority == priority)
    
    if category:
        query = query.filter(SupportTicket.category == category)
    
    if assigned_to_me:
        query = query.filter(SupportTicket.assigned_to == user_id)
    
    if created_by_me:
        query = query.filter(SupportTicket.created_by == user_id)
    
    # Get tickets
    tickets = query.order_by(desc(SupportTicket.created_at)).all()
    
    # Add message count to each ticket
    for ticket in tickets:
        message_count = db.query(TicketMessage).filter(
            TicketMessage.ticket_id == ticket.id,
            TicketMessage.is_deleted == False
        ).count()
        setattr(ticket, 'message_count', message_count)
    
    return tickets


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: UUID4,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific support ticket"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    
    # Create models if they don't exist
    SupportTicket, TicketMessage = create_support_models(db)
    
    # Get ticket
    ticket = db.query(SupportTicket).filter(
        SupportTicket.id == ticket_id,
        SupportTicket.is_deleted == False
    ).first()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Check permissions
    can_view = False
    
    if context.is_super_admin():
        can_view = True
    elif has_permission(current_user, Permission.MANAGE_SUPPORT):
        can_view = True
    elif str(ticket.company_id) == str(company_id):
        if has_permission(current_user, Permission.VIEW_SUPPORT_TICKETS):
            can_view = True
        elif str(ticket.created_by) == str(user_id):
            can_view = True
    
    if not can_view:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this ticket"
        )
    
    # Add message count
    message_count = db.query(TicketMessage).filter(
        TicketMessage.ticket_id == ticket.id,
        TicketMessage.is_deleted == False
    ).count()
    setattr(ticket, 'message_count', message_count)
    
    return ticket


@router.put("/tickets/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: UUID4,
    ticket_update: TicketUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a support ticket"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    
    # Create models if they don't exist
    SupportTicket, TicketMessage = create_support_models(db)
    
    # Get ticket
    ticket = db.query(SupportTicket).filter(
        SupportTicket.id == ticket_id,
        SupportTicket.is_deleted == False
    ).first()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Check permissions
    can_update = False
    
    if context.is_super_admin():
        can_update = True
    elif has_permission(current_user, Permission.MANAGE_SUPPORT):
        can_update = True
    elif str(ticket.company_id) == str(company_id):
        if has_permission(current_user, Permission.MANAGE_SUPPORT_TICKETS):
            can_update = True
        elif str(ticket.created_by) == str(user_id) and ticket.status not in ["resolved", "closed"]:
            # Creator can update their own tickets if not resolved/closed
            can_update = True
            
            # But they can't assign tickets
            if ticket_update.assigned_to is not None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to assign tickets"
                )
    
    if not can_update:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this ticket"
        )
    
    # Update fields
    update_data = ticket_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ticket, field, value)
    
    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)
    
    # Add message count
    message_count = db.query(TicketMessage).filter(
        TicketMessage.ticket_id == ticket.id,
        TicketMessage.is_deleted == False
    ).count()
    setattr(ticket, 'message_count', message_count)
    
    return ticket


@router.delete("/tickets/{ticket_id}")
async def delete_ticket(
    ticket_id: UUID4,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a support ticket"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    
    # Create models if they don't exist
    SupportTicket, _ = create_support_models(db)
    
    # Get ticket
    ticket = db.query(SupportTicket).filter(
        SupportTicket.id == ticket_id,
        SupportTicket.is_deleted == False
    ).first()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Check permissions
    can_delete = False
    
    if context.is_super_admin():
        can_delete = True
    elif has_permission(current_user, Permission.MANAGE_SUPPORT):
        can_delete = True
    elif str(ticket.company_id) == str(company_id):
        if has_permission(current_user, Permission.MANAGE_SUPPORT_TICKETS):
            can_delete = True
        elif str(ticket.created_by) == str(user_id) and ticket.status not in ["resolved", "closed"]:
            # Creator can delete their own tickets if not resolved/closed
            can_delete = True
    
    if not can_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this ticket"
        )
    
    # Soft delete
    ticket.is_deleted = True
    ticket.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Ticket deleted successfully"}


@router.post("/tickets/{ticket_id}/messages", response_model=MessageResponse)
async def create_message(
    ticket_id: UUID4,
    message: MessageCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add a message to a support ticket"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    
    # Create models if they don't exist
    SupportTicket, TicketMessage = create_support_models(db)
    
    # Get ticket
    ticket = db.query(SupportTicket).filter(
        SupportTicket.id == ticket_id,
        SupportTicket.is_deleted == False
    ).first()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Check permissions
    can_message = False
    is_support = False
    
    if context.is_super_admin():
        can_message = True
        is_support = True
    elif has_permission(current_user, Permission.MANAGE_SUPPORT):
        can_message = True
        is_support = True
    elif str(ticket.company_id) == str(company_id):
        if has_permission(current_user, Permission.VIEW_SUPPORT_TICKETS):
            can_message = True
        elif str(ticket.created_by) == str(user_id):
            can_message = True
    
    if not can_message:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to message this ticket"
        )
    
    # Create message
    new_message = TicketMessage(
        content=message.content,
        attachments=message.attachments or [],
        is_from_support=is_support,
        ticket_id=ticket_id,
        created_by=uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    )
    
    db.add(new_message)
    
    # Update ticket status if needed
    if is_support and ticket.status == "open":
        ticket.status = "in_progress"
    elif not is_support and ticket.status in ["resolved", "closed"]:
        ticket.status = "open"
    
    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(new_message)
    
    return new_message


@router.get("/tickets/{ticket_id}/messages", response_model=List[MessageResponse])
async def list_messages(
    ticket_id: UUID4,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List messages for a support ticket"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    
    # Create models if they don't exist
    SupportTicket, TicketMessage = create_support_models(db)
    
    # Get ticket
    ticket = db.query(SupportTicket).filter(
        SupportTicket.id == ticket_id,
        SupportTicket.is_deleted == False
    ).first()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Check permissions
    can_view = False
    
    if context.is_super_admin():
        can_view = True
    elif has_permission(current_user, Permission.MANAGE_SUPPORT):
        can_view = True
    elif str(ticket.company_id) == str(company_id):
        if has_permission(current_user, Permission.VIEW_SUPPORT_TICKETS):
            can_view = True
        elif str(ticket.created_by) == str(user_id):
            can_view = True
    
    if not can_view:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view messages for this ticket"
        )
    
    # Get messages
    messages = db.query(TicketMessage).filter(
        TicketMessage.ticket_id == ticket_id,
        TicketMessage.is_deleted == False
    ).order_by(TicketMessage.created_at).all()
    
    return messages


@router.get("/categories")
async def list_categories(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List available support ticket categories"""
    # These would typically come from a database table
    # For now, we'll return a static list
    categories = [
        {"id": "billing", "name": "Billing & Subscription"},
        {"id": "technical", "name": "Technical Support"},
        {"id": "feature", "name": "Feature Request"},
        {"id": "bug", "name": "Bug Report"},
        {"id": "account", "name": "Account Management"},
        {"id": "other", "name": "Other"}
    ]
    
    return categories


@router.get("/stats")
async def get_support_stats(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get support ticket statistics"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    
    # Check permissions
    if not context.is_super_admin() and not has_permission(current_user, Permission.MANAGE_SUPPORT):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view support statistics"
        )
    
    # Create models if they don't exist
    SupportTicket, _ = create_support_models(db)
    
    # Base query
    query = db.query(SupportTicket).filter(SupportTicket.is_deleted == False)
    
    # Get counts by status
    open_count = query.filter(SupportTicket.status == "open").count()
    in_progress_count = query.filter(SupportTicket.status == "in_progress").count()
    waiting_count = query.filter(SupportTicket.status == "waiting").count()
    resolved_count = query.filter(SupportTicket.status == "resolved").count()
    closed_count = query.filter(SupportTicket.status == "closed").count()
    
    # Get counts by priority
    urgent_count = query.filter(SupportTicket.priority == "urgent").count()
    high_count = query.filter(SupportTicket.priority == "high").count()
    medium_count = query.filter(SupportTicket.priority == "medium").count()
    low_count = query.filter(SupportTicket.priority == "low").count()
    
    return {
        "status_counts": {
            "open": open_count,
            "in_progress": in_progress_count,
            "waiting": waiting_count,
            "resolved": resolved_count,
            "closed": closed_count,
            "total": open_count + in_progress_count + waiting_count + resolved_count + closed_count
        },
        "priority_counts": {
            "urgent": urgent_count,
            "high": high_count,
            "medium": medium_count,
            "low": low_count
        }
    }
