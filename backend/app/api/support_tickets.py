"""
Support Tickets API - Complete implementation for all roles
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
import uuid
import re

from app.core.security import get_current_active_user
from app.core.database import get_db
from app.models.support_tickets import SupportTicket, TicketStatus, TicketPriority
from app.models.users import User
from app.middleware.permissions import has_permission
from app.models.permissions import Permission
from app.middleware.tenant import get_tenant_context

router = APIRouter(prefix="/support-tickets", tags=["Support Tickets"])


def sanitize_input(text: str) -> str:
    """Remove HTML tags and script tags from input"""
    if not text:
        return text
    # Remove script tags and their content
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)
    # Remove all HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()


def validate_no_html(text: str, field_name: str) -> None:
    """Validate that input doesn't contain HTML/script tags"""
    if not text:
        return
    # Check for HTML tags (must have < followed by letters/slash and >)
    if re.search(r'<\s*[a-zA-Z/][^>]*>', text):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="HTML tags and scripts are not allowed. Please enter plain text only."
        )


class TicketCreate(BaseModel):
    subject: str
    description: str
    priority: str = "medium"  # low, medium, high, urgent
    category: Optional[str] = None


class TicketUpdate(BaseModel):
    subject: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_id: Optional[str] = None


class TicketResponse(BaseModel):
    id: str
    subject: str
    description: str
    status: str
    priority: str
    category: Optional[str]
    created_by_id: str
    created_by_name: str
    assigned_to_id: Optional[str]
    assigned_to_name: Optional[str]
    company_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


@router.post("/", response_model=TicketResponse)
async def create_ticket(
    ticket: TicketCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a support ticket - All roles can create"""
    try:
        context = get_tenant_context(current_user)
        company_id = current_user.get('company_id')
        user_id = current_user.get('id')
        
        # Regular users must belong to a company
        if not company_id and not context.is_super_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User must belong to a company"
            )
        
        # For Super Admin without company_id, use first company as default
        if not company_id and context.is_super_admin():
            from app.models.companies import Company
            first_company = db.query(Company).first()
            if not first_company:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No companies found in system"
                )
            company_id = str(first_company.id)
        
        # Validate input for HTML/script tags
        validate_no_html(ticket.subject, "Subject")
        validate_no_html(ticket.description, "Description")
        if ticket.category:
            validate_no_html(ticket.category, "Category")
        
        # Sanitize input (additional safety layer)
        sanitized_subject = sanitize_input(ticket.subject)
        sanitized_description = sanitize_input(ticket.description)
        sanitized_category = sanitize_input(ticket.category) if ticket.category else None
        
        # Map priority string to enum (case-insensitive)
        priority_map = {
            'low': TicketPriority.LOW,
            'medium': TicketPriority.MEDIUM,
            'high': TicketPriority.HIGH,
            'urgent': TicketPriority.URGENT
        }
        
        new_ticket = SupportTicket(
            id=uuid.uuid4(),
            subject=sanitized_subject,
            description=sanitized_description,
            status=TicketStatus.OPEN,
            priority=priority_map.get(ticket.priority.lower(), TicketPriority.MEDIUM),
            category=sanitized_category,
            created_by_id=uuid.UUID(user_id),
            company_id=uuid.UUID(company_id),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(new_ticket)
        db.commit()
        db.refresh(new_ticket)
        
        # Get creator info
        try:
            creator = db.query(User).filter(User.id == new_ticket.created_by_id).first()
            creator_name = f"{creator.first_name} {creator.last_name}" if creator else "Unknown"
        except Exception:
            creator_name = "Unknown"
        
        # Send creation notification
        try:
            from app.services.notification_service import NotificationService
            NotificationService.notify_support_ticket_created(
                db=db,
                ticket_id=new_ticket.id,
                ticket_title=new_ticket.subject,  # Fixed: use ticket_title parameter
                creator_id=new_ticket.created_by_id,
                creator_name=creator_name,
                company_id=new_ticket.company_id,
                priority=new_ticket.priority.value  # Pass priority
            )
        except Exception as e:
            print(f"⚠️ Failed to send support ticket creation notification: {e}")
        
        # Broadcast WebSocket event for real-time sync
        try:
            from app.services.websocket_manager import broadcast_entity_change
            import asyncio
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(broadcast_entity_change(
                    company_id=str(new_ticket.company_id),
                    entity_type="support_ticket",
                    action="created",
                    entity_id=str(new_ticket.id),
                    data={
                        "id": str(new_ticket.id),
                        "subject": new_ticket.subject,
                        "status": new_ticket.status.value,
                        "priority": new_ticket.priority.value
                    }
                ))
        except Exception as ws_error:
            print(f"WebSocket broadcast error: {ws_error}")
        
        return TicketResponse(
            id=str(new_ticket.id),
            subject=new_ticket.subject,
            description=new_ticket.description,
            status=new_ticket.status.value,
            priority=new_ticket.priority.value,
            category=new_ticket.category,
            created_by_id=str(new_ticket.created_by_id),
            created_by_name=creator_name,
            assigned_to_id=str(new_ticket.assigned_to_id) if new_ticket.assigned_to_id else None,
            assigned_to_name=None,
            company_id=str(new_ticket.company_id),
            created_at=new_ticket.created_at,
            updated_at=new_ticket.updated_at
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create ticket: {str(e)}"
        )


@router.get("/", response_model=List[TicketResponse])
async def get_tickets(
    status_filter: Optional[str] = None,
    priority_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get support tickets based on role permissions"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    team_id = current_user.get('team_id')
    
    # Build base query
    query = db.query(SupportTicket)
    
    # Apply role-based filtering
    if context.is_super_admin():
        # Super Admin sees all tickets across all companies
        pass
    elif has_permission(current_user, Permission.MANAGE_COMPANY_SUPPORT):
        # Company Admin sees all company tickets
        query = query.filter(SupportTicket.company_id == uuid.UUID(company_id))
    elif has_permission(current_user, Permission.MANAGE_TEAM_SUPPORT):
        # Sales Manager sees team tickets
        team_user_ids = db.query(User.id).filter(
            User.company_id == uuid.UUID(company_id),
            User.team_id == uuid.UUID(team_id) if team_id else None
        ).all()
        team_user_ids = [str(uid[0]) for uid in team_user_ids]
        query = query.filter(
            and_(
                SupportTicket.company_id == uuid.UUID(company_id),
                or_(
                    SupportTicket.created_by_id.in_([uuid.UUID(uid) for uid in team_user_ids]),
                    SupportTicket.assigned_to_id.in_([uuid.UUID(uid) for uid in team_user_ids])
                )
            )
        )
    else:
        # Regular users see only their own tickets
        query = query.filter(
            and_(
                SupportTicket.company_id == uuid.UUID(company_id),
                or_(
                    SupportTicket.created_by_id == uuid.UUID(user_id),
                    SupportTicket.assigned_to_id == uuid.UUID(user_id)
                )
            )
        )
    
    # Apply filters
    if status_filter:
        status_map = {
            'open': TicketStatus.OPEN,
            'in_progress': TicketStatus.IN_PROGRESS,
            'resolved': TicketStatus.RESOLVED,
            'closed': TicketStatus.CLOSED
        }
        if status_filter.lower() in status_map:
            query = query.filter(SupportTicket.status == status_map[status_filter.lower()])
    
    if priority_filter:
        priority_map = {
            'low': TicketPriority.LOW,
            'medium': TicketPriority.MEDIUM,
            'high': TicketPriority.HIGH,
            'urgent': TicketPriority.URGENT
        }
        if priority_filter.lower() in priority_map:
            query = query.filter(SupportTicket.priority == priority_map[priority_filter.lower()])
    
    tickets = query.order_by(desc(SupportTicket.created_at)).all()
    
    # Build response with user names
    response = []
    for ticket in tickets:
        creator = db.query(User).filter(User.id == ticket.created_by_id).first()
        assigned_to = db.query(User).filter(User.id == ticket.assigned_to_id).first() if ticket.assigned_to_id else None
        
        response.append(TicketResponse(
            id=str(ticket.id),
            subject=ticket.subject,
            description=ticket.description,
            status=ticket.status.value,
            priority=ticket.priority.value,
            category=ticket.category,
            created_by_id=str(ticket.created_by_id),
            created_by_name=f"{creator.first_name} {creator.last_name}" if creator else "Unknown",
            assigned_to_id=str(ticket.assigned_to_id) if ticket.assigned_to_id else None,
            assigned_to_name=f"{assigned_to.first_name} {assigned_to.last_name}" if assigned_to else None,
            company_id=str(ticket.company_id),
            created_at=ticket.created_at,
            updated_at=ticket.updated_at
        ))
    
    return response


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific ticket"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    
    ticket = db.query(SupportTicket).filter(SupportTicket.id == uuid.UUID(ticket_id)).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check permissions
    if not context.is_super_admin():
        if str(ticket.company_id) != company_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Regular users can only see their own tickets
        if not has_permission(current_user, Permission.MANAGE_COMPANY_SUPPORT):
            if str(ticket.created_by_id) != user_id and str(ticket.assigned_to_id) != user_id:
                raise HTTPException(status_code=403, detail="Access denied")
    
    creator = db.query(User).filter(User.id == ticket.created_by_id).first()
    assigned_to = db.query(User).filter(User.id == ticket.assigned_to_id).first() if ticket.assigned_to_id else None
    
    return TicketResponse(
        id=str(ticket.id),
        subject=ticket.subject,
        description=ticket.description,
        status=ticket.status.value,
        priority=ticket.priority.value,
        category=ticket.category,
        created_by_id=str(ticket.created_by_id),
        created_by_name=f"{creator.first_name} {creator.last_name}" if creator else "Unknown",
        assigned_to_id=str(ticket.assigned_to_id) if ticket.assigned_to_id else None,
        assigned_to_name=f"{assigned_to.first_name} {assigned_to.last_name}" if assigned_to else None,
        company_id=str(ticket.company_id),
        created_at=ticket.created_at,
        updated_at=ticket.updated_at
    )


@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: str,
    ticket_update: TicketUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a ticket - Admins and Managers can update"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    
    ticket = db.query(SupportTicket).filter(SupportTicket.id == uuid.UUID(ticket_id)).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check permissions
    can_update = False
    if context.is_super_admin():
        can_update = True
    elif has_permission(current_user, Permission.MANAGE_COMPANY_SUPPORT):
        can_update = str(ticket.company_id) == company_id
    elif has_permission(current_user, Permission.MANAGE_TEAM_SUPPORT):
        can_update = str(ticket.company_id) == company_id
    elif str(ticket.created_by_id) == user_id:
        # Creator can update their own ticket (limited fields)
        can_update = True
    
    if not can_update:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update fields
    if ticket_update.subject:
        ticket.subject = ticket_update.subject
    if ticket_update.description:
        ticket.description = ticket_update.description
    if ticket_update.status:
        status_map = {
            'open': TicketStatus.OPEN,
            'in_progress': TicketStatus.IN_PROGRESS,
            'resolved': TicketStatus.RESOLVED,
            'closed': TicketStatus.CLOSED
        }
        if ticket_update.status.lower() in status_map:
            ticket.status = status_map[ticket_update.status.lower()]
    if ticket_update.priority:
        priority_map = {
            'low': TicketPriority.LOW,
            'medium': TicketPriority.MEDIUM,
            'high': TicketPriority.HIGH,
            'urgent': TicketPriority.URGENT
        }
        if ticket_update.priority.lower() in priority_map:
            ticket.priority = priority_map[ticket_update.priority.lower()]
    
    # Only admins/managers can assign tickets
    if ticket_update.assigned_to_id and (context.is_super_admin() or has_permission(current_user, Permission.MANAGE_COMPANY_SUPPORT)):
        ticket.assigned_to_id = uuid.UUID(ticket_update.assigned_to_id) if ticket_update.assigned_to_id else None
    
    ticket.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(ticket)
    
    # Broadcast WebSocket event for real-time sync
    try:
        from app.services.websocket_manager import broadcast_entity_change
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(broadcast_entity_change(
                company_id=str(ticket.company_id),
                entity_type="support_ticket",
                action="updated",
                entity_id=str(ticket.id),
                data={
                    "id": str(ticket.id),
                    "subject": ticket.subject,
                    "status": ticket.status.value,
                    "priority": ticket.priority.value
                }
            ))
    except Exception as ws_error:
        print(f"WebSocket broadcast error: {ws_error}")
    
    creator = db.query(User).filter(User.id == ticket.created_by_id).first()
    assigned_to = db.query(User).filter(User.id == ticket.assigned_to_id).first() if ticket.assigned_to_id else None
    
    return TicketResponse(
        id=str(ticket.id),
        subject=ticket.subject,
        description=ticket.description,
        status=ticket.status.value,
        priority=ticket.priority.value,
        category=ticket.category,
        created_by_id=str(ticket.created_by_id),
        created_by_name=f"{creator.first_name} {creator.last_name}" if creator else "Unknown",
        assigned_to_id=str(ticket.assigned_to_id) if ticket.assigned_to_id else None,
        assigned_to_name=f"{assigned_to.first_name} {assigned_to.last_name}" if assigned_to else None,
        company_id=str(ticket.company_id),
        created_at=ticket.created_at,
        updated_at=ticket.updated_at
    )


@router.delete("/{ticket_id}")
async def delete_ticket(
    ticket_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete a ticket - Role-based permissions:
    - Super Admin: Can delete any ticket
    - Company Admin: Can delete tickets in their company
    - Sales Manager: Cannot delete tickets
    - Sales Rep: Cannot delete tickets
    """
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    
    # Only Super Admin and Company Admin can delete tickets
    if not context.is_super_admin() and not has_permission(current_user, Permission.MANAGE_COMPANY_SUPPORT):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only Super Admin and Company Admin can delete tickets"
        )
    
    ticket = db.query(SupportTicket).filter(SupportTicket.id == uuid.UUID(ticket_id)).first()
    
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
    # Company admin can only delete tickets in their company
    if not context.is_super_admin() and str(ticket.company_id) != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="You can only delete tickets from your company"
        )
    
    ticket_subject = ticket.subject  # Fixed: use 'subject' not 'title'
    ticket_company_id = ticket.company_id
    ticket_id_str = str(ticket.id)
    
    db.delete(ticket)
    db.commit()
    
    # Send deletion notification
    try:
        from app.services.notification_service import NotificationService
        from app.models.users import User
        deleter = db.query(User).filter(User.id == uuid.UUID(current_user['id'])).first()
        deleter_name = f"{deleter.first_name} {deleter.last_name}" if deleter else "Unknown User"
        
        NotificationService.notify_support_ticket_deleted(
            db=db,
            ticket_title=ticket_subject,  # Pass subject as ticket_title
            deleter_id=uuid.UUID(current_user['id']),
            deleter_name=deleter_name,
            company_id=ticket_company_id
        )
    except Exception as e:
        print(f"⚠️ Failed to send support ticket deletion notification: {e}")
    
    # Broadcast WebSocket event for real-time sync
    try:
        from app.services.websocket_manager import broadcast_entity_change
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(broadcast_entity_change(
                company_id=str(ticket_company_id),
                entity_type="support_ticket",
                action="deleted",
                entity_id=ticket_id_str,
                data=None
            ))
    except Exception as ws_error:
        print(f"WebSocket broadcast error: {ws_error}")
    
    return {"message": "Ticket deleted successfully"}


@router.post("/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: str,
    assigned_to_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Assign a ticket to a user - Role-based permissions:
    - Super Admin: Can assign any ticket to any user
    - Company Admin: Can assign company tickets to company users
    - Sales Manager: Can assign team tickets to team members
    - Sales Rep: Cannot assign tickets
    """
    try:
        context = get_tenant_context(current_user)
        company_id = current_user.get('company_id')
        team_id = current_user.get('team_id')
        
        # Check if user has permission to assign tickets
        can_assign = (
            context.is_super_admin() or 
            has_permission(current_user, Permission.MANAGE_COMPANY_SUPPORT) or
            has_permission(current_user, Permission.MANAGE_TEAM_SUPPORT)
        )
        
        if not can_assign:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to assign tickets"
            )
        
        # Get ticket
        ticket = db.query(SupportTicket).filter(SupportTicket.id == uuid.UUID(ticket_id)).first()
        
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        
        # Check access to this ticket
        if not context.is_super_admin() and str(ticket.company_id) != company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="You can only assign tickets from your company"
            )
        
        # Sales Manager can only assign tickets within their team
        if has_permission(current_user, Permission.MANAGE_TEAM_SUPPORT) and not has_permission(current_user, Permission.MANAGE_COMPANY_SUPPORT):
            if not team_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not assigned to a team"
                )
            # Check if ticket belongs to team (created by or assigned to team member)
            team_user_ids = [u.id for u in db.query(User).filter(
                User.team_id == uuid.UUID(team_id),
                User.is_deleted == False
            ).all()]
            if ticket.created_by_id not in team_user_ids and (ticket.assigned_to_id and ticket.assigned_to_id not in team_user_ids):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only assign tickets from your team"
                )
        
        # Verify assignee exists and belongs to same company
        assignee = db.query(User).filter(User.id == uuid.UUID(assigned_to_id)).first()
        if not assignee:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        if not context.is_super_admin() and str(assignee.company_id) != company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only assign to users in your company"
            )
        
        # Sales Manager can only assign to team members
        if has_permission(current_user, Permission.MANAGE_TEAM_SUPPORT) and not has_permission(current_user, Permission.MANAGE_COMPANY_SUPPORT):
            if assignee.id not in team_user_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only assign tickets to your team members"
                )
        
        # Assign ticket
        ticket.assigned_to_id = uuid.UUID(assigned_to_id)
        ticket.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(ticket)
        
        return {
            "message": "Ticket assigned successfully",
            "ticket_id": str(ticket.id),
            "assigned_to": f"{assignee.first_name} {assignee.last_name}"
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign ticket: {str(e)}"
        )
