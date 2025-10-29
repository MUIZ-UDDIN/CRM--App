"""
Call Transcripts Model - Store transcriptions for calls >1 minute
"""

from sqlalchemy import Column, String, ForeignKey, DateTime, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import BaseModel


class CallTranscript(BaseModel):
    """
    Stores transcriptions for voice calls longer than 1 minute
    Integrated with Twilio Voice API
    """
    __tablename__ = "call_transcripts"

    call_sid = Column(String(50), unique=True, nullable=False, index=True)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("user_conversations.id"), index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    duration = Column(Integer)  # in seconds
    transcript_text = Column(Text)
    recording_url = Column(String(500))
    transcription_status = Column(String(20), default='pending')  # pending, processing, completed, failed
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    conversation = relationship("UserConversation", back_populates="call_transcripts")
    user = relationship("User")

    class Config:
        from_attributes = True

    def __repr__(self):
        return f"<CallTranscript {self.call_sid} duration={self.duration}s>"
