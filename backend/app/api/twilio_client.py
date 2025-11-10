"""
Twilio Client API endpoints for browser-based calling
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VoiceGrant
from twilio.twiml.voice_response import VoiceResponse, Dial
from pydantic import BaseModel
import uuid
import os
from datetime import datetime
from loguru import logger

from app.core.security import get_current_active_user
from app.core.database import get_db
from app.core.config import settings
from app.models.twilio_settings import TwilioSettings
from app.services.twilio_api_key_service import create_or_get_api_keys
from app.models.calls import Call as CallModel, CallDirection, CallStatus

router = APIRouter(tags=["Twilio Client"])


class TokenResponse(BaseModel):
    token: str
    identity: str


@router.get("/token", response_model=TokenResponse)
async def get_access_token(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate Twilio Access Token for browser-based calling
    """
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    # Get Twilio settings
    twilio_settings = db.query(TwilioSettings).filter(
        TwilioSettings.company_id == company_id
    ).first()
    
    if not twilio_settings:
        raise HTTPException(status_code=404, detail="Twilio settings not found")
    
    # Create identity for this user
    identity = f"user_{user_id}"
    
    # Auto-create or get API keys for this company
    try:
        api_key_sid, api_key_secret = create_or_get_api_keys(twilio_settings, db)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create/retrieve API keys: {str(e)}"
        )
    
    # Create access token
    token = AccessToken(
        twilio_settings.account_sid,
        api_key_sid,
        api_key_secret,
        identity=identity,
        ttl=3600  # 1 hour
    )
    
    # Create Voice grant with outgoing call handler
    # Use TwiML App SID if configured, otherwise Device SDK will need manual configuration
    twiml_app_sid = settings.TWIML_APP_SID or os.getenv("TWIML_APP_SID")
    
    voice_grant = VoiceGrant(
        incoming_allow=True,  # Allow incoming calls
        outgoing_application_sid=twiml_app_sid,  # TwiML App for outgoing calls
        push_credential_sid=None  # Not using push notifications
    )
    
    token.add_grant(voice_grant)
    
    logger.info(f"🎫 Token generated for {identity} with TwiML App: {twiml_app_sid or 'Not configured'}")
    
    return TokenResponse(
        token=token.to_jwt(),
        identity=identity
    )


@router.post("/call/answer/{call_sid}")
async def answer_call(
    call_sid: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Answer an incoming call
    """
    # This will be handled by the frontend Twilio Device
    # The webhook will be modified to queue calls instead of auto-answering
    return {"message": "Call answered", "call_sid": call_sid}


@router.post("/call/reject/{call_sid}")
async def reject_call(
    call_sid: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Reject an incoming call
    """
    from twilio.rest import Client
    from app.models.twilio_settings import TwilioSettings
    
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    # Get Twilio settings
    twilio_settings = db.query(TwilioSettings).filter(
        TwilioSettings.company_id == company_id
    ).first()
    
    if not twilio_settings:
        raise HTTPException(status_code=404, detail="Twilio settings not found")
    
    # Initialize Twilio client
    client = Client(twilio_settings.account_sid, twilio_settings.auth_token)
    
    # Update call to rejected/completed
    try:
        call = client.calls(call_sid).update(status='completed')
        return {"message": "Call rejected", "call_sid": call_sid}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/call/hangup/{call_sid}")
async def hangup_call(
    call_sid: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Hang up an active call
    """
    from twilio.rest import Client
    from app.models.twilio_settings import TwilioSettings
    
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    # Get Twilio settings
    twilio_settings = db.query(TwilioSettings).filter(
        TwilioSettings.company_id == company_id
    ).first()
    
    if not twilio_settings:
        raise HTTPException(status_code=404, detail="Twilio settings not found")
    
    # Initialize Twilio client
    client = Client(twilio_settings.account_sid, twilio_settings.auth_token)
    
    # Hang up the call
    try:
        call = client.calls(call_sid).update(status='completed')
        return {"message": "Call ended", "call_sid": call_sid}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/voice", response_class=Response)
async def handle_outgoing_voice(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    TwiML handler for outgoing calls from Twilio Device SDK
    This is called when a user initiates a call from the browser
    """
    try:
        form_data = await request.form()
        
        # Get parameters from Twilio Device SDK
        to_number = form_data.get("To")
        from_number = form_data.get("From") or form_data.get("from_number")
        caller_id = form_data.get("CallerId") or from_number
        
        logger.info(f"📞 Outgoing call from Device SDK: To={to_number}, From={from_number}, CallerId={caller_id}")
        
        # Create TwiML response
        resp = VoiceResponse()
        
        # Dial the destination number
        dial = Dial(
            caller_id=caller_id if caller_id else None,
            action="https://sunstonecrm.com/api/webhooks/twilio/voice/status",
            method="POST"
        )
        dial.number(to_number)
        resp.append(dial)
        
        logger.info(f"✅ TwiML generated for outgoing call to {to_number}")
        
        return Response(content=str(resp), media_type="application/xml")
        
    except Exception as e:
        logger.error(f"❌ Error in outgoing voice handler: {e}")
        resp = VoiceResponse()
        resp.say("An error occurred. Please try again.")
        return Response(content=str(resp), media_type="application/xml")
