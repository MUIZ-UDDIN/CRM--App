# Twilio Webhook Setup Guide

## Overview
This guide explains how to configure Twilio webhooks to receive SMS, voice calls, and status updates in your CRM.

## Webhook Endpoints

### 1. SMS Webhooks

#### Incoming SMS
- **URL:** `https://sunstonecrm.com/api/webhooks/twilio/sms/incoming`
- **Method:** POST
- **Purpose:** Receives incoming SMS messages from customers
- **Features:**
  - Auto-creates contacts for new numbers
  - Saves SMS to database
  - Creates real-time notifications
  - Sends WebSocket updates
  - Optional auto-reply

#### SMS Status Callback
- **URL:** `https://sunstonecrm.com/api/webhooks/twilio/sms/status`
- **Method:** POST
- **Purpose:** Receives delivery status updates for sent SMS
- **Statuses:** queued, sending, sent, delivered, undelivered, failed

### 2. Voice Webhooks

#### Incoming Calls
- **URL:** `https://sunstonecrm.com/api/webhooks/twilio/voice/incoming`
- **Method:** POST
- **Purpose:** Handles incoming voice calls
- **Features:**
  - Auto-creates contacts for new callers
  - Saves call to database
  - Creates real-time notifications
  - Forwards call to user's phone (if configured)
  - Plays greeting message

#### Call Status Callback
- **URL:** `https://sunstonecrm.com/api/webhooks/twilio/voice/status`
- **Method:** POST
- **Purpose:** Receives call status updates
- **Statuses:** queued, ringing, in-progress, completed, busy, failed, no-answer, canceled

#### Call Recording
- **URL:** `https://sunstonecrm.com/api/webhooks/twilio/voice/recording`
- **Method:** POST
- **Purpose:** Receives notification when call recording is available
- **Features:**
  - Saves recording URL to database
  - Sends notification to user

---

## Configuration Steps

### Step 1: Configure SMS Webhooks in Twilio Console

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**
3. Click on your phone number
4. Scroll to **Messaging Configuration**
5. Set the following:

   **A MESSAGE COMES IN:**
   - Webhook: `https://sunstonecrm.com/api/webhooks/twilio/sms/incoming`
   - HTTP Method: `POST`

   **PRIMARY HANDLER FAILS:**
   - Leave as default or set fallback URL

6. Click **Save**

### Step 2: Configure Voice Webhooks in Twilio Console

1. In the same phone number settings
2. Scroll to **Voice Configuration**
3. Set the following:

   **A CALL COMES IN:**
   - Webhook: `https://sunstonecrm.com/api/webhooks/twilio/voice/incoming`
   - HTTP Method: `POST`

   **CALL STATUS CHANGES:**
   - Webhook: `https://sunstonecrm.com/api/webhooks/twilio/voice/status`
   - HTTP Method: `POST`

4. Click **Save**

### Step 3: Configure SMS Status Callbacks (Optional)

For each SMS sent from the CRM, you can get delivery status updates:

1. In your Twilio Console, go to **Messaging** → **Settings** → **Geo Permissions**
2. Enable the countries you want to send SMS to
3. The CRM automatically includes the status callback URL when sending SMS

### Step 4: Enable Call Recording (Optional)

To automatically record calls:

1. In the CRM, go to **Settings** → **Twilio Settings**
2. Enable **Record Calls**
3. Recordings will be saved automatically when calls end

---

## Testing Webhooks

### Test SMS Reception

1. Send an SMS to your Twilio phone number from any mobile phone
2. Check the CRM:
   - SMS should appear in **Messages** page
   - Notification should appear in notification bell
   - Contact should be auto-created if new number

### Test Voice Call Reception

1. Call your Twilio phone number from any phone
2. Check the CRM:
   - Call should appear in **Calls** page
   - Notification should appear
   - Call should forward to your configured phone number

### Test Status Updates

1. Send an SMS from the CRM
2. Watch the status change in real-time:
   - Queued → Sending → Sent → Delivered

---

## Webhook Security

### Twilio Request Validation

All webhooks validate that requests are actually from Twilio using:
- `X-Twilio-Signature` header validation
- Request signature verification using your Auth Token

### HTTPS Required

- All webhooks MUST use HTTPS
- Twilio will not send webhooks to HTTP URLs

---

## Troubleshooting

### Webhooks Not Working

1. **Check Twilio Console Logs:**
   - Go to **Monitor** → **Logs** → **Errors**
   - Look for webhook errors

2. **Check CRM Logs:**
   ```bash
   tail -f /var/www/crm-app/backend/logs/app.log
   ```

3. **Verify URLs:**
   - Make sure URLs are correct in Twilio Console
   - URLs must be publicly accessible
   - HTTPS is required

4. **Check Firewall:**
   - Ensure port 443 is open
   - Twilio IPs are not blocked

### SMS Not Appearing in CRM

1. Check if phone number is configured in Twilio Settings
2. Verify webhook URL is correct
3. Check database for SMS record
4. Check logs for errors

### Calls Not Forwarding

1. Verify user has a phone number configured in their profile
2. Check call logs in Twilio Console
3. Verify TwiML response is correct

---

## Advanced Configuration

### Custom Auto-Reply Messages

Configure in **Settings** → **Twilio Settings**:
- Enable/disable auto-reply
- Customize auto-reply message
- Set business hours for auto-reply

### Call Forwarding Rules

Configure in user profile:
- Forward to mobile
- Forward to office
- Send to voicemail
- Custom IVR menu

### SMS Templates

Create templates for common responses:
- Welcome message
- Out of office
- Follow-up messages
- Appointment confirmations

---

## Webhook Payload Examples

### Incoming SMS Payload

```
MessageSid: SM1234567890abcdef
From: +1234567890
To: +0987654321
Body: Hello, I'm interested in your product
NumMedia: 0
AccountSid: AC1234567890abcdef
```

### Incoming Call Payload

```
CallSid: CA1234567890abcdef
From: +1234567890
To: +0987654321
CallStatus: ringing
Direction: inbound
AccountSid: AC1234567890abcdef
```

### SMS Status Callback Payload

```
MessageSid: SM1234567890abcdef
MessageStatus: delivered
ErrorCode: null
ErrorMessage: null
```

---

## Real-Time Features

### WebSocket Notifications

When SMS/calls are received, the CRM sends real-time updates via WebSocket:

```json
{
  "type": "sms_received",
  "title": "New SMS from John Doe",
  "message": "Hello, I'm interested...",
  "contact_id": "uuid",
  "sms_id": "uuid"
}
```

### Notification Types

- `sms_received` - New incoming SMS
- `call_received` - New incoming call
- `sms_status_update` - SMS delivery status changed
- `call_status_update` - Call status changed
- `recording_available` - Call recording ready

---

## Database Schema

### SMS Table
- `id` - UUID
- `direction` - INBOUND/OUTBOUND
- `status` - QUEUED/SENDING/SENT/DELIVERED/FAILED
- `from_address` - Phone number
- `to_address` - Phone number
- `body` - Message text
- `message_sid` - Twilio message ID
- `contact_id` - Related contact
- `user_id` - CRM user
- `company_id` - Company (multi-tenant)

### Calls Table
- `id` - UUID
- `direction` - INBOUND/OUTBOUND
- `status` - RINGING/IN_PROGRESS/COMPLETED/etc
- `from_number` - Phone number
- `to_number` - Phone number
- `call_sid` - Twilio call ID
- `duration` - Call duration in seconds
- `recording_url` - Recording URL
- `contact_id` - Related contact
- `user_id` - CRM user
- `company_id` - Company (multi-tenant)

---

## Support

For issues or questions:
1. Check Twilio Console logs
2. Check CRM application logs
3. Verify webhook configuration
4. Test with Twilio's webhook testing tool

## References

- [Twilio SMS Webhooks Documentation](https://www.twilio.com/docs/sms/tutorials/how-to-receive-and-reply-python)
- [Twilio Voice Webhooks Documentation](https://www.twilio.com/docs/voice/tutorials/how-to-respond-to-incoming-phone-calls-python)
- [TwiML Documentation](https://www.twilio.com/docs/voice/twiml)
- [Webhook Security](https://www.twilio.com/docs/usage/webhooks/webhooks-security)
