"""
Deal and Lead Assignment API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, UUID4, validator
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.deals import Deal
from app.models.contacts import Contact
from app.models.users import User
from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

router = APIRouter(prefix="/api/assignments", tags=["assignments"])


# Pydantic models
class AssignmentRequest(BaseModel):
    entity_ids: List[UUID4]
    assignee_id: UUID4
    entity_type: str  # "deal" or "contact"
    
    @validator('entity_type')
    def validate_entity_type(cls, v):
        if v not in ["deal", "contact"]:
            raise ValueError('entity_type must be either "deal" or "contact"')
        return v


class AssignmentResponse(BaseModel):
    success: bool
    message: str
    assigned_count: int
    failed_ids: Optional[List[str]] = None
    details: Optional[str] = None


@router.post("/", response_model=AssignmentResponse)
async def assign_entities(
    assignment: AssignmentRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Assign deals or contacts to a user based on role permissions"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Check if assignee exists and is in the same company
    assignee = db.query(User).filter(
        User.id == assignment.assignee_id,
        User.is_deleted == False
    ).first()
    
    if not assignee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignee not found"
        )
    
    # Check if assignee is in the same company
    if str(assignee.company_id) != str(company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot assign to users outside your company"
        )
    
    # Check permissions based on role
    can_assign = False
    
    # Super admin can assign any entity to any user
    if context.is_super_admin():
        can_assign = True
    # Company admin can assign any entity within their company
    elif has_permission(current_user, Permission.ASSIGN_COMPANY_LEADS):
        can_assign = True
    # Sales manager can assign entities to users in their team
    elif has_permission(current_user, Permission.ASSIGN_TEAM_LEADS):
        # Check if assignee is in the manager's team
        if assignee.team_id != user_team_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only assign to users in your team"
            )
        can_assign = True
    
    if not can_assign:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to assign entities"
        )
    
    # Process assignment based on entity type
    assigned_count = 0
    failed_ids = []
    
    if assignment.entity_type == "deal":
        # Assign deals
        for deal_id in assignment.entity_ids:
            try:
                deal = db.query(Deal).filter(
                    Deal.id == deal_id,
                    Deal.company_id == company_id,
                    Deal.is_deleted == False
                ).first()
                
                if not deal:
                    failed_ids.append(str(deal_id))
                    continue
                
                # Check team-level permission
                if has_permission(current_user, Permission.ASSIGN_TEAM_LEADS) and not has_permission(current_user, Permission.ASSIGN_COMPANY_LEADS):
                    # Get current owner's team
                    current_owner = db.query(User).filter(User.id == deal.owner_id).first()
                    if current_owner and current_owner.team_id != user_team_id:
                        failed_ids.append(str(deal_id))
                        continue
                
                # Update owner
                deal.owner_id = assignment.assignee_id
                deal.updated_at = datetime.utcnow()
                assigned_count += 1
                
                # Trigger notification for new owner
                try:
                    from app.models.notifications import Notification, NotificationType
                    notification = Notification(
                        user_id=assignment.assignee_id,
                        type=NotificationType.DEAL_ASSIGNED,
                        title="Deal Assigned",
                        content=f"You have been assigned a deal: {deal.title}",
                        entity_type="deal",
                        entity_id=deal_id,
                        created_by=uuid.UUID(user_id) if isinstance(user_id, str) else user_id
                    )
                    db.add(notification)
                except Exception as e:
                    print(f"Failed to create notification: {e}")
            
            except Exception as e:
                print(f"Error assigning deal {deal_id}: {e}")
                failed_ids.append(str(deal_id))
    
    elif assignment.entity_type == "contact":
        # Assign contacts
        for contact_id in assignment.entity_ids:
            try:
                contact = db.query(Contact).filter(
                    Contact.id == contact_id,
                    Contact.company_id == company_id,
                    Contact.is_deleted == False
                ).first()
                
                if not contact:
                    failed_ids.append(str(contact_id))
                    continue
                
                # Check team-level permission
                if has_permission(current_user, Permission.ASSIGN_TEAM_LEADS) and not has_permission(current_user, Permission.ASSIGN_COMPANY_LEADS):
                    # Get current owner's team
                    current_owner = db.query(User).filter(User.id == contact.owner_id).first()
                    if current_owner and current_owner.team_id != user_team_id:
                        failed_ids.append(str(contact_id))
                        continue
                
                # Update owner
                contact.owner_id = assignment.assignee_id
                contact.updated_at = datetime.utcnow()
                assigned_count += 1
                
                # Trigger notification for new owner
                try:
                    from app.models.notifications import Notification, NotificationType
                    notification = Notification(
                        user_id=assignment.assignee_id,
                        type=NotificationType.CONTACT_ASSIGNED,
                        title="Contact Assigned",
                        content=f"You have been assigned a contact: {contact.first_name} {contact.last_name}",
                        entity_type="contact",
                        entity_id=contact_id,
                        created_by=uuid.UUID(user_id) if isinstance(user_id, str) else user_id
                    )
                    db.add(notification)
                except Exception as e:
                    print(f"Failed to create notification: {e}")
            
            except Exception as e:
                print(f"Error assigning contact {contact_id}: {e}")
                failed_ids.append(str(contact_id))
    
    db.commit()
    
    # Prepare response
    if assigned_count == len(assignment.entity_ids):
        return AssignmentResponse(
            success=True,
            message=f"Successfully assigned {assigned_count} {assignment.entity_type}(s) to user",
            assigned_count=assigned_count
        )
    elif assigned_count > 0:
        return AssignmentResponse(
            success=True,
            message=f"Partially assigned {assigned_count} out of {len(assignment.entity_ids)} {assignment.entity_type}(s)",
            assigned_count=assigned_count,
            failed_ids=failed_ids
        )
    else:
        return AssignmentResponse(
            success=False,
            message=f"Failed to assign any {assignment.entity_type}(s)",
            assigned_count=0,
            failed_ids=failed_ids
        )


@router.get("/eligible-assignees")
async def get_eligible_assignees(
    entity_type: str = Query(..., description="Type of entity to assign (deal or contact)"),
    team_only: bool = Query(False, description="Only show users from the current user's team"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get list of users who can be assigned entities based on role permissions"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_team_id = current_user.get('team_id')
    
    # Base query - active users in the same company
    query = db.query(User).filter(
        User.company_id == company_id,
        User.is_deleted == False,
        User.status == 'active'
    )
    
    # Apply team filter if requested or if user only has team-level permissions
    if team_only or (has_permission(current_user, Permission.ASSIGN_TEAM_LEADS) and not has_permission(current_user, Permission.ASSIGN_COMPANY_LEADS)):
        if not user_team_id:
            return []
        query = query.filter(User.team_id == user_team_id)
    
    # Get users
    users = query.all()
    
    return [
        {
            "id": str(user.id),
            "name": f"{user.first_name} {user.last_name}",
            "email": user.email,
            "role": user.user_role,
            "team_id": str(user.team_id) if user.team_id else None
        }
        for user in users
    ]


@router.get("/bulk-assignment-rules")
async def get_bulk_assignment_rules(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get bulk assignment rules based on user role"""
    context = get_tenant_context(current_user)
    
    rules = {
        "can_assign_company_wide": has_permission(current_user, Permission.ASSIGN_COMPANY_LEADS),
        "can_assign_team_wide": has_permission(current_user, Permission.ASSIGN_TEAM_LEADS),
        "can_assign_own": has_permission(current_user, Permission.MANAGE_OWN_LEADS),
        "max_bulk_assign": 100  # Default limit
    }
    
    # Super admin can assign more entities at once
    if context.is_super_admin():
        rules["max_bulk_assign"] = 500
    # Company admin can assign more entities than team leads
    elif has_permission(current_user, Permission.ASSIGN_COMPANY_LEADS):
        rules["max_bulk_assign"] = 200
    
    return rules
