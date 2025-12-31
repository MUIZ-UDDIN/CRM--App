"""
Chat API endpoints for internal team communication
Chat is strictly scoped to company - users can only chat with teammates from their own company
Super Admin can chat with users in their own company only (not other companies)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, ChatConversation, ChatMessage, ChatMessageStatus

router = APIRouter(prefix="/api/chat", tags=["chat"])


# Pydantic models
class UserInfo(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    avatar_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender: Optional[UserInfo] = None
    content: str
    status: str
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: str
    other_participant: UserInfo
    last_message_at: Optional[datetime] = None
    last_message_preview: Optional[str] = None
    unread_count: int = 0
    created_at: datetime
    
    class Config:
        from_attributes = True


class ConversationWithMessages(BaseModel):
    id: str
    other_participant: UserInfo
    messages: List[MessageResponse]
    
    class Config:
        from_attributes = True


def check_chat_access(current_user: dict):
    """
    Check if user has access to chat feature.
    All users including Super Admin can access chat for their own company.
    """
    if not current_user.get('company_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must belong to a company to use chat"
        )
    
    return True


def validate_same_company(current_user: dict, other_user: User):
    """Validate that both users belong to the same company"""
    if str(current_user.get('company_id')) != str(other_user.company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot chat with users from other companies"
        )


@router.get("/teammates", response_model=List[UserInfo])
def get_teammates(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of teammates (users from the same company) that can be chatted with.
    Excludes the current user and super admins.
    """
    check_chat_access(current_user)
    
    user_id = current_user.get('id')
    company_id = current_user.get('company_id')
    
    teammates = db.query(User).filter(
        User.company_id == company_id,
        User.id != user_id,
        User.status == 'active',
        User.role != 'super_admin'
    ).all()
    
    return [
        UserInfo(
            id=str(t.id),
            first_name=t.first_name or '',
            last_name=t.last_name or '',
            email=t.email,
            avatar_url=t.avatar_url
        )
        for t in teammates
    ]


@router.get("/conversations", response_model=List[ConversationResponse])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all conversations for the current user.
    Only returns conversations within the same company.
    """
    check_chat_access(current_user)
    
    user_id = current_user.get('id')
    company_id = current_user.get('company_id')
    
    conversations = db.query(ChatConversation).filter(
        ChatConversation.company_id == company_id,
        or_(
            ChatConversation.participant_one_id == user_id,
            ChatConversation.participant_two_id == user_id
        )
    ).order_by(desc(ChatConversation.last_message_at)).all()
    
    result = []
    for conv in conversations:
        # Get the other participant
        other_user = conv.get_other_participant(user_id)
        
        # Count unread messages
        unread_count = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conv.id,
            ChatMessage.sender_id != user_id,
            ChatMessage.is_read == False,
            ChatMessage.is_deleted == False
        ).count()
        
        result.append(ConversationResponse(
            id=str(conv.id),
            other_participant=UserInfo(
                id=str(other_user.id),
                first_name=other_user.first_name or '',
                last_name=other_user.last_name or '',
                email=other_user.email,
                avatar_url=other_user.avatar_url
            ),
            last_message_at=conv.last_message_at,
            last_message_preview=conv.last_message_preview,
            unread_count=unread_count,
            created_at=conv.created_at
        ))
    
    return result


@router.get("/conversations/{user_id}", response_model=ConversationWithMessages)
def get_or_create_conversation(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get or create a conversation with another user.
    Both users must be from the same company.
    """
    check_chat_access(current_user)
    
    current_user_id = current_user.get('id')
    company_id = current_user.get('company_id')
    
    # Get the other user
    other_user = db.query(User).filter(User.id == user_id).first()
    if not other_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Validate same company
    validate_same_company(current_user, other_user)
    
    # Check if other user is super admin
    if other_user.role == 'super_admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot chat with Super Admin"
        )
    
    # Find existing conversation
    conversation = db.query(ChatConversation).filter(
        ChatConversation.company_id == company_id,
        or_(
            and_(
                ChatConversation.participant_one_id == current_user_id,
                ChatConversation.participant_two_id == other_user.id
            ),
            and_(
                ChatConversation.participant_one_id == other_user.id,
                ChatConversation.participant_two_id == current_user_id
            )
        )
    ).first()
    
    # Create new conversation if not exists
    if not conversation:
        conversation = ChatConversation(
            company_id=company_id,
            participant_one_id=current_user_id,
            participant_two_id=other_user.id
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    
    # Get messages
    messages = db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation.id,
        ChatMessage.is_deleted == False
    ).order_by(ChatMessage.created_at).all()
    
    # Mark messages as read - use .value for PostgreSQL enum compatibility (lowercase)
    db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation.id,
        ChatMessage.sender_id != current_user_id,
        ChatMessage.is_read == False
    ).update({
        ChatMessage.is_read: True,
        ChatMessage.read_at: datetime.utcnow(),
        ChatMessage.status: ChatMessageStatus.read
    }, synchronize_session=False)
    db.commit()
    
    return ConversationWithMessages(
        id=str(conversation.id),
        other_participant=UserInfo(
            id=str(other_user.id),
            first_name=other_user.first_name or '',
            last_name=other_user.last_name or '',
            email=other_user.email,
            avatar_url=other_user.avatar_url
        ),
        messages=[
            MessageResponse(
                id=str(m.id),
                conversation_id=str(m.conversation_id),
                sender_id=str(m.sender_id),
                sender=UserInfo(
                    id=str(m.sender.id),
                    first_name=m.sender.first_name or '',
                    last_name=m.sender.last_name or '',
                    email=m.sender.email,
                    avatar_url=m.sender.avatar_url
                ) if m.sender else None,
                content=m.content,
                status=m.status.value if m.status else 'sent',
                is_read=m.is_read,
                created_at=m.created_at
            )
            for m in messages
        ]
    )


@router.post("/conversations/{user_id}/messages", response_model=MessageResponse)
def send_message(
    user_id: str,
    message: MessageCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Send a message to another user.
    Both users must be from the same company.
    """
    check_chat_access(current_user)
    
    current_user_id = current_user.get('id')
    company_id = current_user.get('company_id')
    
    if not message.content or not message.content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be empty"
        )
    
    # Get the other user
    other_user = db.query(User).filter(User.id == user_id).first()
    if not other_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Validate same company
    validate_same_company(current_user, other_user)
    
    # Check if other user is super admin
    if other_user.role == 'super_admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot chat with Super Admin"
        )
    
    # Find or create conversation
    conversation = db.query(ChatConversation).filter(
        ChatConversation.company_id == company_id,
        or_(
            and_(
                ChatConversation.participant_one_id == current_user_id,
                ChatConversation.participant_two_id == other_user.id
            ),
            and_(
                ChatConversation.participant_one_id == other_user.id,
                ChatConversation.participant_two_id == current_user_id
            )
        )
    ).first()
    
    if not conversation:
        conversation = ChatConversation(
            company_id=company_id,
            participant_one_id=current_user_id,
            participant_two_id=other_user.id
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    
    # Create message - use .value for PostgreSQL enum compatibility (lowercase)
    new_message = ChatMessage(
        conversation_id=conversation.id,
        sender_id=current_user_id,
        content=message.content.strip(),
        status=ChatMessageStatus.sent
    )
    db.add(new_message)
    
    # Update conversation
    conversation.last_message_at = datetime.utcnow()
    conversation.last_message_preview = message.content[:255] if len(message.content) > 255 else message.content
    
    db.commit()
    db.refresh(new_message)
    
    return MessageResponse(
        id=str(new_message.id),
        conversation_id=str(new_message.conversation_id),
        sender_id=str(new_message.sender_id),
        sender=UserInfo(
            id=str(current_user_id),
            first_name=current_user.get('first_name') or '',
            last_name=current_user.get('last_name') or '',
            email=current_user.get('email'),
            avatar_url=current_user.get('avatar_url')
        ),
        content=new_message.content,
        status=new_message.status.value if new_message.status else 'sent',
        is_read=new_message.is_read,
        created_at=new_message.created_at
    )


@router.put("/messages/{message_id}/read")
def mark_message_as_read(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Mark a message as read"""
    check_chat_access(current_user)
    
    current_user_id = current_user.get('id')
    company_id = current_user.get('company_id')
    
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Verify user is part of the conversation
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == message.conversation_id,
        ChatConversation.company_id == company_id,
        or_(
            ChatConversation.participant_one_id == current_user_id,
            ChatConversation.participant_two_id == current_user_id
        )
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Only mark as read if current user is not the sender
    if str(message.sender_id) != str(current_user_id):
        message.is_read = True
        message.read_at = datetime.utcnow()
        message.status = ChatMessageStatus.read
        db.commit()
    
    return {"success": True}


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get total unread message count for the current user"""
    check_chat_access(current_user)
    
    user_id = current_user.get('id')
    company_id = current_user.get('company_id')
    
    # Get all conversations for the user
    conversation_ids = db.query(ChatConversation.id).filter(
        ChatConversation.company_id == company_id,
        or_(
            ChatConversation.participant_one_id == user_id,
            ChatConversation.participant_two_id == user_id
        )
    ).all()
    
    conversation_ids = [c[0] for c in conversation_ids]
    
    if not conversation_ids:
        return {"unread_count": 0}
    
    # Count unread messages
    unread_count = db.query(ChatMessage).filter(
        ChatMessage.conversation_id.in_(conversation_ids),
        ChatMessage.sender_id != user_id,
        ChatMessage.is_read == False,
        ChatMessage.is_deleted == False
    ).count()
    
    return {"unread_count": unread_count}


@router.delete("/messages/{message_id}")
def delete_message(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Permanently delete a message (only sender can delete)"""
    check_chat_access(current_user)
    
    current_user_id = current_user.get('id')
    company_id = current_user.get('company_id')
    
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Only sender can delete their own message
    if str(message.sender_id) != str(current_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own messages"
        )
    
    # Verify conversation belongs to user's company
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == message.conversation_id,
        ChatConversation.company_id == company_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Permanent delete
    db.delete(message)
    db.commit()
    
    return {"success": True, "message": "Message permanently deleted"}


@router.delete("/conversations/{user_id}")
def delete_conversation(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Permanently delete an entire conversation and all its messages"""
    check_chat_access(current_user)
    
    current_user_id = current_user.get('id')
    company_id = current_user.get('company_id')
    
    # Find the conversation between current user and the other user
    conversation = db.query(ChatConversation).filter(
        ChatConversation.company_id == company_id,
        or_(
            and_(
                ChatConversation.participant_one_id == current_user_id,
                ChatConversation.participant_two_id == user_id
            ),
            and_(
                ChatConversation.participant_one_id == user_id,
                ChatConversation.participant_two_id == current_user_id
            )
        )
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Delete all messages in the conversation first (cascade should handle this, but being explicit)
    db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation.id
    ).delete(synchronize_session=False)
    
    # Delete the conversation
    db.delete(conversation)
    db.commit()
    
    return {"success": True, "message": "Conversation permanently deleted"}
