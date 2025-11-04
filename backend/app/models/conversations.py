"""
User Conversations Model - Phone-Number-Persistent Conversations
Each recipient always communicates with the same Twilio number
"""

from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import BaseModel


class UserConversation(BaseModel):
    """
    Tracks which Twilio number is assigned to each recipient
    Ensures conversation persistence - same number for same recipient
    """
    __tablename__ = "user_conversations"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=True, index=True)
    to_number = Column(String(20), nullable=False, index=True)
    from_twilio_number = Column(String(20), nullable=False, index=True)
    conversation_status = Column(String(20), default='active')  # active, inactive, blocked
    last_message_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="conversations")
    messages = relationship("SMSMessage", back_populates="conversation", foreign_keys="SMSMessage.conversation_id")
    analytics = relationship("MessageAnalytics", back_populates="conversation", cascade="all, delete-orphan")
    call_transcripts = relationship("CallTranscript", back_populates="conversation")

    class Config:
        from_attributes = True

    def __repr__(self):
        return f"<UserConversation {self.to_number} -> {self.from_twilio_number}>"
