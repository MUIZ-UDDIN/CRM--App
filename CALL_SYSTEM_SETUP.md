# Call System Setup Guide

## Overview
The call system has been completely overhauled to use Twilio Device SDK for browser-to-phone calls instead of API-based calls. This fixes all the issues with voicemail, call UI, and status updates.

## Issues Fixed

### 1. ❌ Calls Going to Voicemail
**Problem:** Calls were using REST API which doesn't connect browser audio
**Solution:** Now using Twilio Device SDK for real browser-to-phone calls

### 2. ❌ No Call UI / Just Hung Up  
**Problem:** No proper call interface
**Solution:** Beautiful CallModal with ringing, connecting, connected, ended states

### 3. ❌ Status/Duration Not Auto-Updating
**Problem:** Page needed manual refresh
**Solution:** WebSocket real-time updates for call status changes

### 4. ❌ Incoming Call UI Not Showing
**Problem:** UI not appearing when answering
**Solution:** Proper Device SDK event listeners and state management

## Setup Steps

### Step 1: Create TwiML App

Run this command on the server:

```bash
cd /var/www/crm-app/backend
python3 setup_twiml_app.py
```

This will output a `TWIML_APP_SID`. Copy it!

### Step 2: Add to Environment Variables

Edit the `.env` file:

```bash
nano /var/www/crm-app/backend/.env
```

Add this line (replace with your actual SID):
```
TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Deploy Backend

```bash
cd /var/www/crm-app/backend
git pull origin main
pm2 restart crm-backend
pm2 logs crm-backend --lines 50
```

### Step 4: Deploy Frontend

```bash
cd /var/www/crm-app/frontend
git pull origin main
npm run build
```

## How It Works Now

### Outgoing Calls

1. User clicks "Call" or "Redial"
2. Frontend calls `twilioVoiceService.makeOutboundCall(phoneNumber, fromNumber)`
3. Twilio Device SDK connects to TwiML App endpoint
4. Backend `/api/twilio/client/voice` returns TwiML to dial the number
5. Call connects directly - NO VOICEMAIL!
6. Call UI shows: Ringing → Connecting → Connected (with duration)
7. WebSocket sends real-time status updates

### Incoming Calls

1. Twilio receives call
2. Webhook creates call record and notification
3. TwiML dials browser client
4. Device SDK fires `incoming` event
5. Call UI appears with Answer/Reject buttons
6. User answers → Full call controls appear
7. WebSocket updates status in real-time

## TwiML Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/twilio/client/token` | Get Device SDK access token |
| `/api/twilio/client/voice` | TwiML for outgoing calls from Device SDK |
| `/api/webhooks/twilio/voice/incoming` | Handle incoming calls |
| `/api/webhooks/twilio/voice/status` | Call status updates |

## Call UI States

```
idle → ringing → connecting → connected → ended
  ↓        ↓          ↓           ↓         ↓
 None   "Calling"  "Connecting" Duration  "Ended"
        [Cancel]   [Cancel]   [Mute/Hangup] [Close]
```

## WebSocket Events

- `incoming_call` - New incoming call
- `call_status_update` - Call status changed (triggers auto-refresh)

## Testing

### Test Outgoing Call:
1. Go to Calls page
2. Click any call's "Redial" button
3. Select your Twilio number
4. Click "Call Now"
5. Should see: Ringing → Connecting → Connected
6. Should hear ringing, then person answers
7. NO voicemail message!

### Test Incoming Call:
1. Call your Twilio number from another phone
2. Should see call UI popup immediately
3. Click Answer
4. Should connect and show call controls

### Test Auto-Update:
1. Make a call
2. Don't refresh page
3. After call ends, status should update automatically
4. Duration should appear without refresh

## Troubleshooting

### "Subscriber unavailable" Error
- TwiML App not configured
- Run `setup_twiml_app.py` and add SID to .env
- Restart backend

### Call UI Not Showing
- Check browser console for errors
- Verify Twilio Device SDK initialized
- Check WebSocket connection

### Status Not Updating
- Check WebSocket connection in browser console
- Verify backend is sending notifications
- Check `pm2 logs crm-backend`

### No Audio
- Check browser microphone permissions
- Verify Twilio Device SDK registered
- Check network/firewall settings

## Architecture

```
Frontend (Browser)
    ↓
Twilio Device SDK
    ↓
TwiML App (configured in Twilio Console)
    ↓
Backend /api/twilio/client/voice
    ↓
TwiML Response (Dial number)
    ↓
Twilio connects call
    ↓
Status callbacks → WebSocket → Frontend updates
```

## Important Files

### Backend:
- `backend/app/api/twilio_client.py` - Device SDK token & TwiML endpoint
- `backend/app/api/twilio_webhooks.py` - Incoming calls & status updates
- `backend/setup_twiml_app.py` - TwiML App setup script

### Frontend:
- `frontend/src/services/twilioVoiceService.ts` - Device SDK wrapper
- `frontend/src/components/CallModal.tsx` - Call UI component
- `frontend/src/pages/Calls.tsx` - Calls page with Device SDK integration
- `frontend/src/pages/SMSEnhanced.tsx` - SMS page with call integration

## Next Steps

1. ✅ Run `setup_twiml_app.py`
2. ✅ Add `TWIML_APP_SID` to `.env`
3. ✅ Deploy backend
4. ✅ Deploy frontend
5. ✅ Test outgoing call
6. ✅ Test incoming call
7. ✅ Verify auto-updates work
