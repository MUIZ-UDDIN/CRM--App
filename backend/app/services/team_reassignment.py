"""
Team Reassignment Service
Handles edge cases when users are moved between teams
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
import uuid
from typing import Optional
import logging

from app.models.users import User
from app.models.deals import Deal
from app.models.contacts import Contact
from app.models.activities import Activity

logger = logging.getLogger(__name__)


class TeamReassignmentService:
    """Service to handle team reassignment edge cases"""
    
    @staticmethod
    def reassign_user_to_team(
        db: Session,
        user_id: uuid.UUID,
        old_team_id: Optional[uuid.UUID],
        new_team_id: Optional[uuid.UUID],
        reassign_data: bool = False,
        new_owner_id: Optional[uuid.UUID] = None
    ) -> dict:
        """
        Reassign a user to a new team with proper data handling
        
        Args:
            db: Database session
            user_id: User being reassigned
            old_team_id: Previous team ID (can be None)
            new_team_id: New team ID (can be None)
            reassign_data: If True, reassign user's data to new_owner_id
            new_owner_id: New owner for the user's data (required if reassign_data=True)
            
        Returns:
            dict with reassignment statistics
        """
        
        logger.info(f"Reassigning user {user_id} from team {old_team_id} to team {new_team_id}")
        
        # Update user's team
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        user.team_id = new_team_id
        
        stats = {
            "user_id": str(user_id),
            "old_team_id": str(old_team_id) if old_team_id else None,
            "new_team_id": str(new_team_id) if new_team_id else None,
            "deals_reassigned": 0,
            "contacts_reassigned": 0,
            "activities_reassigned": 0
        }
        
        # If reassigning data to a new owner
        if reassign_data:
            if not new_owner_id:
                raise ValueError("new_owner_id is required when reassign_data=True")
            
            # Verify new owner exists and is in the new team (if team exists)
            new_owner = db.query(User).filter(User.id == new_owner_id).first()
            if not new_owner:
                raise ValueError(f"New owner {new_owner_id} not found")
            
            if new_team_id and str(new_owner.team_id) != str(new_team_id):
                raise ValueError(f"New owner must be in the target team {new_team_id}")
            
            # Reassign deals
            deals_updated = db.query(Deal).filter(
                and_(
                    Deal.owner_id == user_id,
                    Deal.is_deleted == False
                )
            ).update({"owner_id": new_owner_id}, synchronize_session=False)
            stats["deals_reassigned"] = deals_updated
            
            # Reassign contacts
            contacts_updated = db.query(Contact).filter(
                and_(
                    Contact.owner_id == user_id,
                    Contact.is_deleted == False
                )
            ).update({"owner_id": new_owner_id}, synchronize_session=False)
            stats["contacts_reassigned"] = contacts_updated
            
            # Reassign activities
            activities_updated = db.query(Activity).filter(
                and_(
                    Activity.owner_id == user_id,
                    Activity.is_deleted == False
                )
            ).update({"owner_id": new_owner_id}, synchronize_session=False)
            stats["activities_reassigned"] = activities_updated
            
            logger.info(f"Reassigned {deals_updated} deals, {contacts_updated} contacts, {activities_updated} activities to {new_owner_id}")
        
        db.commit()
        db.refresh(user)
        
        logger.info(f"User {user_id} successfully reassigned to team {new_team_id}")
        
        return stats
    
    @staticmethod
    def get_reassignment_impact(
        db: Session,
        user_id: uuid.UUID
    ) -> dict:
        """
        Get the impact of reassigning a user (how much data they own)
        
        Args:
            db: Database session
            user_id: User to check
            
        Returns:
            dict with counts of owned data
        """
        
        deals_count = db.query(Deal).filter(
            and_(
                Deal.owner_id == user_id,
                Deal.is_deleted == False
            )
        ).count()
        
        contacts_count = db.query(Contact).filter(
            and_(
                Contact.owner_id == user_id,
                Contact.is_deleted == False
            )
        ).count()
        
        activities_count = db.query(Activity).filter(
            and_(
                Activity.owner_id == user_id,
                Activity.is_deleted == False
            )
        ).count()
        
        return {
            "user_id": str(user_id),
            "deals_count": deals_count,
            "contacts_count": contacts_count,
            "activities_count": activities_count,
            "total_records": deals_count + contacts_count + activities_count
        }
    
    @staticmethod
    def validate_team_reassignment(
        db: Session,
        user_id: uuid.UUID,
        new_team_id: Optional[uuid.UUID],
        current_user_role: str,
        current_user_team_id: Optional[uuid.UUID]
    ) -> tuple[bool, Optional[str]]:
        """
        Validate if a team reassignment is allowed
        
        Args:
            db: Database session
            user_id: User being reassigned
            new_team_id: Target team ID
            current_user_role: Role of user performing the reassignment
            current_user_team_id: Team of user performing the reassignment
            
        Returns:
            tuple of (is_valid, error_message)
        """
        
        from app.models.users import Team
        
        # Super Admin can reassign anyone
        if current_user_role == "super_admin":
            return True, None
        
        # Company Admin can reassign anyone in their company
        if current_user_role == "company_admin":
            return True, None
        
        # Sales Manager can only reassign within their team
        if current_user_role == "sales_manager":
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return False, "User not found"
            
            # Can only reassign users currently in their team
            if str(user.team_id) != str(current_user_team_id):
                return False, "You can only reassign users from your own team"
            
            # Can only reassign to their own team or remove from team
            if new_team_id and str(new_team_id) != str(current_user_team_id):
                return False, "You can only reassign users to your own team"
            
            return True, None
        
        # Other roles cannot reassign
        return False, "You don't have permission to reassign users to teams"
