"""
Conversations API - Phone-number-persistent conversations management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.conversations import UserConversation
from app.models.sms import SMSMessage
from app.services.phone_rotation_service import PhoneRotationService

router = APIRouter(prefix="/conversations", tags=["Conversations"])


# Pydantic Models
class ConversationResponse(BaseModel):
    id: str
    user_id: str
    to_number: str
    from_twilio_number: str
    conversation_status: str
    last_message_at: datetime
    created_at: datetime
    message_count: int = 0
    
    class Config:
        from_attributes = True


class ConversationDetailResponse(ConversationResponse):
    recent_messages: List[dict] = []


class StartConversationRequest(BaseModel):
    to_number: str
    initial_message: Optional[str] = None


class UpdateConversationStatusRequest(BaseModel):
    status: str  # active, inactive, blocked


@router.get("/", response_model=List[ConversationResponse])
async def list_conversations(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List all conversations for the current user
    """
    user_id = current_user["id"]
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    
    query = db.query(UserConversation).filter(
        UserConversation.user_id == user_id,
        UserConversation.is_deleted == False
    )
    
    if status:
        query = query.filter(UserConversation.conversation_status == status)
    
    conversations = query.order_by(
        UserConversation.last_message_at.desc()
    ).offset(offset).limit(limit).all()
    
    # Add message count for each conversation
    result = []
    for conv in conversations:
        message_count = db.query(SMSMessage).filter(
            SMSMessage.conversation_id == conv.id
        ).count()
        
        conv_dict = {
            "id": str(conv.id),
            "user_id": str(conv.user_id),
            "to_number": conv.to_number,
            "from_twilio_number": conv.from_twilio_number,
            "conversation_status": conv.conversation_status,
            "last_message_at": conv.last_message_at,
            "created_at": conv.created_at,
            "message_count": message_count
        }
        result.append(conv_dict)
    
    return result


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: str,
    include_messages: bool = Query(True, description="Include recent messages"),
    message_limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get conversation details with recent messages
    """
    user_id = current_user["id"]
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    
    conversation = db.query(UserConversation).filter(
        UserConversation.id == uuid.UUID(conversation_id),
        UserConversation.user_id == user_id,
        UserConversation.is_deleted == False
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get message count
    message_count = db.query(SMSMessage).filter(
        SMSMessage.conversation_id == conversation.id
    ).count()
    
    result = {
        "id": str(conversation.id),
        "user_id": str(conversation.user_id),
        "to_number": conversation.to_number,
        "from_twilio_number": conversation.from_twilio_number,
        "conversation_status": conversation.conversation_status,
        "last_message_at": conversation.last_message_at,
        "created_at": conversation.created_at,
        "message_count": message_count,
        "recent_messages": []
    }
    
    if include_messages:
        messages = db.query(SMSMessage).filter(
            SMSMessage.conversation_id == conversation.id
        ).order_by(SMSMessage.created_at.desc()).limit(message_limit).all()
        
        result["recent_messages"] = [
            {
                "id": str(msg.id),
                "direction": msg.direction,
                "from_address": msg.from_address,
                "to_address": msg.to_address,
                "body": msg.body,
                "status": msg.status,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
                "is_auto_response": msg.is_auto_response
            }
            for msg in messages
        ]
    
    return result


@router.post("/start", response_model=ConversationResponse)
async def start_conversation(
    request: StartConversationRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Start a new conversation with a recipient
    Assigns a Twilio number from the rotation pool
    """
    user_id = current_user["id"]
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    
    # Use phone rotation service to get/assign number
    rotation_service = PhoneRotationService(db)
    twilio_number = rotation_service.get_number_for_recipient(
        user_id=user_id,
        to_number=request.to_number,
        create_if_not_exists=True
    )
    
    if not twilio_number:
        raise HTTPException(
            status_code=400,
            detail="No available phone numbers in rotation pool"
        )
    
    # Get the conversation that was just created
    conversation = rotation_service.get_conversation(
        user_id=user_id,
        to_number=request.to_number
    )
    
    if not conversation:
        raise HTTPException(status_code=500, detail="Failed to create conversation")
    
    return {
        "id": str(conversation.id),
        "user_id": str(conversation.user_id),
        "to_number": conversation.to_number,
        "from_twilio_number": conversation.from_twilio_number,
        "conversation_status": conversation.conversation_status,
        "last_message_at": conversation.last_message_at,
        "created_at": conversation.created_at,
        "message_count": 0
    }


@router.patch("/{conversation_id}/status")
async def update_conversation_status(
    conversation_id: str,
    request: UpdateConversationStatusRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update conversation status (active, inactive, blocked)
    """
    user_id = current_user["id"]
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    
    conversation = db.query(UserConversation).filter(
        UserConversation.id == uuid.UUID(conversation_id),
        UserConversation.user_id == user_id,
        UserConversation.is_deleted == False
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Validate status
    valid_statuses = ['active', 'inactive', 'blocked']
    if request.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    conversation.conversation_status = request.status
    conversation.updated_at = datetime.utcnow()
    db.commit()
    
    return {
        "message": "Conversation status updated successfully",
        "conversation_id": str(conversation.id),
        "new_status": request.status
    }


@router.get("/stats/overview")
async def get_conversation_stats(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get overview statistics for user's conversations
    """
    user_id = current_user["id"]
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    
    # Use phone rotation service for stats
    rotation_service = PhoneRotationService(db)
    number_stats = rotation_service.get_number_statistics(user_id)
    
    # Get conversation counts by status
    total_conversations = db.query(UserConversation).filter(
        UserConversation.user_id == user_id,
        UserConversation.is_deleted == False
    ).count()
    
    active_conversations = db.query(UserConversation).filter(
        UserConversation.user_id == user_id,
        UserConversation.conversation_status == 'active',
        UserConversation.is_deleted == False
    ).count()
    
    blocked_conversations = db.query(UserConversation).filter(
        UserConversation.user_id == user_id,
        UserConversation.conversation_status == 'blocked',
        UserConversation.is_deleted == False
    ).count()
    
    return {
        "total_conversations": total_conversations,
        "active_conversations": active_conversations,
        "blocked_conversations": blocked_conversations,
        "inactive_conversations": total_conversations - active_conversations - blocked_conversations,
        "phone_numbers": number_stats
    }
