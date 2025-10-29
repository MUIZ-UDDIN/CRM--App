"""
Voice Transcription API - Twilio voice call transcriptions
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.call_transcripts import CallTranscript
from app.models.conversations import UserConversation

router = APIRouter(prefix="/transcripts", tags=["Voice Transcription"])


# Pydantic Models
class TranscriptResponse(BaseModel):
    id: str
    call_sid: str
    conversation_id: Optional[str]
    duration: Optional[int]
    transcript_text: Optional[str]
    recording_url: Optional[str]
    transcription_status: str
    timestamp: datetime
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[TranscriptResponse])
async def list_transcripts(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all transcripts for current user"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    query = db.query(CallTranscript).filter(
        CallTranscript.user_id == user_id,
        CallTranscript.is_deleted == False
    )
    
    if status:
        query = query.filter(CallTranscript.transcription_status == status)
    
    transcripts = query.order_by(
        CallTranscript.timestamp.desc()
    ).offset(offset).limit(limit).all()
    
    return [
        {
            "id": str(t.id),
            "call_sid": t.call_sid,
            "conversation_id": str(t.conversation_id) if t.conversation_id else None,
            "duration": t.duration,
            "transcript_text": t.transcript_text,
            "recording_url": t.recording_url,
            "transcription_status": t.transcription_status,
            "timestamp": t.timestamp
        }
        for t in transcripts
    ]


@router.get("/{call_sid}", response_model=TranscriptResponse)
async def get_transcript(
    call_sid: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get transcript by call SID"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    transcript = db.query(CallTranscript).filter(
        CallTranscript.call_sid == call_sid,
        CallTranscript.user_id == user_id,
        CallTranscript.is_deleted == False
    ).first()
    
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")
    
    return {
        "id": str(transcript.id),
        "call_sid": transcript.call_sid,
        "conversation_id": str(transcript.conversation_id) if transcript.conversation_id else None,
        "duration": transcript.duration,
        "transcript_text": transcript.transcript_text,
        "recording_url": transcript.recording_url,
        "transcription_status": transcript.transcription_status,
        "timestamp": transcript.timestamp
    }


@router.post("/webhooks/recording")
async def handle_recording_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Twilio webhook for call recordings
    Called when a call recording is available
    """
    form_data = await request.form()
    
    call_sid = form_data.get("CallSid")
    recording_url = form_data.get("RecordingUrl")
    duration = int(form_data.get("RecordingDuration", 0))
    
    if not call_sid:
        raise HTTPException(status_code=400, detail="CallSid is required")
    
    # Check if transcript already exists
    existing = db.query(CallTranscript).filter(
        CallTranscript.call_sid == call_sid
    ).first()
    
    if existing:
        # Update existing
        existing.recording_url = recording_url
        existing.duration = duration
        existing.updated_at = datetime.utcnow()
        db.commit()
        return {"message": "Recording updated", "call_sid": call_sid}
    
    # Create new transcript record
    # Note: user_id should be determined from the call
    # For now, we'll create it without user_id and update later
    transcript = CallTranscript(
        call_sid=call_sid,
        recording_url=recording_url,
        duration=duration,
        transcription_status="pending",
        user_id=uuid.uuid4()  # Placeholder - should be updated
    )
    
    db.add(transcript)
    db.commit()
    
    # If duration > 60 seconds, trigger transcription
    if duration > 60:
        transcript.transcription_status = "processing"
        db.commit()
        # TODO: Trigger actual transcription service
    
    return {"message": "Recording received", "call_sid": call_sid}


@router.post("/webhooks/transcription")
async def handle_transcription_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Twilio webhook for transcriptions
    Called when transcription is complete
    """
    form_data = await request.form()
    
    call_sid = form_data.get("CallSid")
    transcript_text = form_data.get("TranscriptionText")
    transcription_status = form_data.get("TranscriptionStatus")
    
    if not call_sid:
        raise HTTPException(status_code=400, detail="CallSid is required")
    
    # Find transcript
    transcript = db.query(CallTranscript).filter(
        CallTranscript.call_sid == call_sid
    ).first()
    
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")
    
    # Update transcript
    transcript.transcript_text = transcript_text
    transcript.transcription_status = "completed" if transcription_status == "completed" else "failed"
    transcript.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Transcription updated", "call_sid": call_sid}


@router.get("/stats/overview")
async def get_transcription_stats(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get transcription statistics"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    total = db.query(CallTranscript).filter(
        CallTranscript.user_id == user_id,
        CallTranscript.is_deleted == False
    ).count()
    
    completed = db.query(CallTranscript).filter(
        CallTranscript.user_id == user_id,
        CallTranscript.transcription_status == "completed",
        CallTranscript.is_deleted == False
    ).count()
    
    pending = db.query(CallTranscript).filter(
        CallTranscript.user_id == user_id,
        CallTranscript.transcription_status == "pending",
        CallTranscript.is_deleted == False
    ).count()
    
    processing = db.query(CallTranscript).filter(
        CallTranscript.user_id == user_id,
        CallTranscript.transcription_status == "processing",
        CallTranscript.is_deleted == False
    ).count()
    
    return {
        "total_transcripts": total,
        "completed": completed,
        "pending": pending,
        "processing": processing,
        "failed": total - completed - pending - processing
    }
