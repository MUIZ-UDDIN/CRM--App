"""
Phone Number Rotation Service
Implements phone-number-persistent conversations
- Each recipient always uses the same Twilio number
- New conversations get assigned a number from the rotation pool
- Uses round-robin or least-recently-used strategy
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Optional
import uuid

from app.models.conversations import UserConversation
from app.models.phone_numbers import PhoneNumber
from app.models.sms import SMSMessage


class PhoneRotationService:
    """
    Manages phone number rotation and conversation persistence
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_number_for_recipient(
        self,
        user_id: uuid.UUID,
        to_number: str,
        create_if_not_exists: bool = True
    ) -> Optional[str]:
        """
        Get the Twilio number assigned to a recipient
        If no conversation exists, assign a new number from the pool
        
        Args:
            user_id: User ID
            to_number: Recipient phone number
            create_if_not_exists: Create new conversation if not exists
            
        Returns:
            Twilio phone number (E.164 format) or None
        """
        # Check if conversation already exists
        existing_conversation = self.db.query(UserConversation).filter(
            UserConversation.user_id == user_id,
            UserConversation.to_number == to_number,
            UserConversation.is_active == True,
            UserConversation.is_deleted == False
        ).first()
        
        if existing_conversation:
            # Update last message timestamp
            existing_conversation.last_message_at = datetime.utcnow()
            self.db.commit()
            return existing_conversation.from_twilio_number
        
        if not create_if_not_exists:
            return None
        
        # Assign new number from rotation pool
        assigned_number = self._assign_new_number(user_id, to_number)
        return assigned_number
    
    def _assign_new_number(self, user_id: uuid.UUID, to_number: str) -> Optional[str]:
        """
        Assign a new Twilio number to a recipient using rotation logic
        Strategy: Least Recently Used (LRU)
        
        Args:
            user_id: User ID
            to_number: Recipient phone number
            
        Returns:
            Assigned Twilio phone number or None if no numbers available
        """
        # Get available numbers for this user (rotation enabled)
        available_numbers = self.db.query(PhoneNumber).filter(
            PhoneNumber.user_id == user_id,
            PhoneNumber.is_active == True,
            PhoneNumber.is_deleted == False,
            PhoneNumber.rotation_enabled == True
        ).order_by(
            # Order by priority (higher first), then by last used (older first)
            PhoneNumber.rotation_priority.desc(),
            func.coalesce(PhoneNumber.last_used_at, datetime.min).asc()
        ).all()
        
        if not available_numbers:
            return None
        
        # Select the first number (LRU with priority)
        selected_number = available_numbers[0]
        
        # Create conversation record
        conversation = UserConversation(
            user_id=user_id,
            to_number=to_number,
            from_twilio_number=selected_number.phone_number,
            conversation_status='active',
            last_message_at=datetime.utcnow()
        )
        self.db.add(conversation)
        
        # Update last used timestamp
        selected_number.last_used_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(conversation)
        
        return selected_number.phone_number
    
    def get_conversation(
        self,
        user_id: uuid.UUID,
        to_number: str
    ) -> Optional[UserConversation]:
        """
        Get conversation record for a recipient
        
        Args:
            user_id: User ID
            to_number: Recipient phone number
            
        Returns:
            UserConversation object or None
        """
        return self.db.query(UserConversation).filter(
            UserConversation.user_id == user_id,
            UserConversation.to_number == to_number,
            UserConversation.is_active == True,
            UserConversation.is_deleted == False
        ).first()
    
    def get_conversation_by_twilio_number(
        self,
        from_twilio_number: str,
        to_number: str
    ) -> Optional[UserConversation]:
        """
        Get conversation by Twilio number and recipient
        Used for incoming messages
        
        Args:
            from_twilio_number: Twilio phone number that received the message
            to_number: Sender's phone number
            
        Returns:
            UserConversation object or None
        """
        return self.db.query(UserConversation).filter(
            UserConversation.from_twilio_number == from_twilio_number,
            UserConversation.to_number == to_number,
            UserConversation.is_active == True,
            UserConversation.is_deleted == False
        ).first()
    
    def update_conversation_status(
        self,
        conversation_id: uuid.UUID,
        status: str
    ) -> bool:
        """
        Update conversation status (active, inactive, blocked)
        
        Args:
            conversation_id: Conversation ID
            status: New status
            
        Returns:
            True if updated successfully
        """
        conversation = self.db.query(UserConversation).filter(
            UserConversation.id == conversation_id
        ).first()
        
        if not conversation:
            return False
        
        conversation.conversation_status = status
        conversation.updated_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    def get_number_statistics(self, user_id: uuid.UUID) -> dict:
        """
        Get statistics for all numbers in rotation pool
        
        Args:
            user_id: User ID
            
        Returns:
            Dictionary with number statistics
        """
        numbers = self.db.query(PhoneNumber).filter(
            PhoneNumber.user_id == user_id,
            PhoneNumber.is_active == True,
            PhoneNumber.is_deleted == False
        ).all()
        
        stats = []
        for number in numbers:
            # Count conversations
            conversation_count = self.db.query(UserConversation).filter(
                UserConversation.from_twilio_number == number.phone_number,
                UserConversation.is_active == True
            ).count()
            
            # Count messages
            message_count = self.db.query(SMSMessage).filter(
                SMSMessage.from_address == number.phone_number
            ).count()
            
            stats.append({
                'phone_number': number.phone_number,
                'friendly_name': number.friendly_name,
                'rotation_enabled': number.rotation_enabled,
                'rotation_priority': number.rotation_priority,
                'last_used_at': number.last_used_at.isoformat() if number.last_used_at else None,
                'active_conversations': conversation_count,
                'total_messages': message_count
            })
        
        return {
            'total_numbers': len(numbers),
            'numbers': stats
        }


def get_phone_rotation_service(db: Session) -> PhoneRotationService:
    """
    Dependency injection for phone rotation service
    """
    return PhoneRotationService(db)
