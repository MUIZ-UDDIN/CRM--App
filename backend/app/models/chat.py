"""
Chat models for internal team communication
Chat is strictly scoped to company - users can only chat with teammates from their own company
Super Admin does NOT have access to any company's chat
"""

from sqlalchemy import Column, String, Text, ForeignKey, TIMESTAMP, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from datetime import datetime
import uuid
import enum

from app.models.base import Base


class ChatMessageStatus(str, enum.Enum):
    """Enum values must match PostgreSQL enum values exactly (lowercase)"""
    sent = "sent"
    delivered = "delivered"
    read = "read"


class ChatConversation(Base):
    """
    Represents a chat conversation between two users within the same company.
    Each conversation is strictly scoped to a company_id.
    """
    __tablename__ = "chat_conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Participants (always 2 users for direct messaging)
    participant_one_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    participant_two_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Last message info for quick access
    last_message_at = Column(TIMESTAMP, default=datetime.utcnow)
    last_message_preview = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Per-user soft delete - conversation is hidden only for the user who deleted it
    deleted_for_user_ids = Column(ARRAY(UUID(as_uuid=True)), default=list)
    
    # Relationships
    company = relationship("Company", backref="chat_conversations")
    participant_one = relationship("User", foreign_keys=[participant_one_id], backref="conversations_as_one")
    participant_two = relationship("User", foreign_keys=[participant_two_id], backref="conversations_as_two")
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ChatMessage.created_at")

    def __repr__(self):
        return f"<ChatConversation {self.id}>"
    
    def get_other_participant(self, user_id):
        """Get the other participant in the conversation"""
        if str(self.participant_one_id) == str(user_id):
            return self.participant_two
        return self.participant_one


class ChatMessage(Base):
    """
    Represents a single message in a chat conversation.
    Messages are strictly scoped to company through the conversation.
    """
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Sender info
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Message content
    content = Column(Text, nullable=False)
    
    # Message status - uses chat_message_status enum in database
    status = Column(SQLEnum(ChatMessageStatus, name='chat_message_status', create_type=False), default=ChatMessageStatus.sent)
    
    # Read status
    is_read = Column(Boolean, default=False)
    read_at = Column(TIMESTAMP, nullable=True)
    
    # Timestamps
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Per-user soft delete - message is hidden only for the user who deleted it
    deleted_for_user_ids = Column(ARRAY(UUID(as_uuid=True)), default=list)
    
    # Legacy soft delete (kept for backward compatibility)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(TIMESTAMP, nullable=True)
    
    # Relationships
    conversation = relationship("ChatConversation", back_populates="messages")
    sender = relationship("User", backref="sent_messages")

    def __repr__(self):
        return f"<ChatMessage {self.id}>"
    
    def mark_as_read(self):
        """Mark message as read"""
        self.is_read = True
        self.read_at = datetime.utcnow()
        self.status = ChatMessageStatus.read
    
    def soft_delete(self):
        """Soft delete the message"""
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
