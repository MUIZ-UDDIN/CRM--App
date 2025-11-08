# Twilio Webhook Quick Setup

## 🚀 Quick Configuration (5 Minutes)

### Step 1: Run Database Migration
```bash
cd /var/www/crm-app/backend
psql -U postgres -d crm_db -f migrations/add_twilio_auto_reply.sql
```

### Step 2: Restart Backend
```bash
sudo systemctl restart crm-backend
# OR
pm2 restart crm-backend
```

### Step 3: Configure Twilio Console

Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/active

For each phone number, set these webhooks:

#### SMS Configuration
```
A MESSAGE COMES IN:
URL: https://sunstonecrm.com/api/webhooks/twilio/sms/incoming
Method: POST

STATUS CALLBACK URL (optional):
URL: https://sunstonecrm.com/api/webhooks/twilio/sms/status
Method: POST
```

#### Voice Configuration
```
A CALL COMES IN:
URL: https://sunstonecrm.com/api/webhooks/twilio/voice/incoming
Method: POST

CALL STATUS CHANGES:
URL: https://sunstonecrm.com/api/webhooks/twilio/voice/status
Method: POST
```

### Step 4: Test

#### Test SMS:
1. Send SMS to your Twilio number: `+1234567890`
2. Check CRM Messages page
3. Should see notification + new SMS

#### Test Call:
1. Call your Twilio number: `+1234567890`
2. Check CRM Calls page
3. Should see notification + call forwarded

---

## 📋 Webhook URLs Reference

| Feature | URL | Method |
|---------|-----|--------|
| Incoming SMS | `https://sunstonecrm.com/api/webhooks/twilio/sms/incoming` | POST |
| SMS Status | `https://sunstonecrm.com/api/webhooks/twilio/sms/status` | POST |
| Incoming Call | `https://sunstonecrm.com/api/webhooks/twilio/voice/incoming` | POST |
| Call Status | `https://sunstonecrm.com/api/webhooks/twilio/voice/status` | POST |
| Call Recording | `https://sunstonecrm.com/api/webhooks/twilio/voice/recording` | POST |

---

## ✅ What's Fixed

### SMS Receiving ✅
- ✅ Incoming SMS are saved to database
- ✅ Auto-creates contacts for new numbers
- ✅ Real-time notifications via WebSocket
- ✅ Optional auto-reply
- ✅ Media attachments supported (images, videos)
- ✅ Delivery status tracking

### Voice Receiving ✅
- ✅ Incoming calls are saved to database
- ✅ Auto-creates contacts for new callers
- ✅ Real-time notifications via WebSocket
- ✅ Call forwarding to user's phone
- ✅ Greeting message played
- ✅ Call status tracking (ringing, answered, completed)
- ✅ Call recording support

### Notifications ✅
- ✅ Real-time notifications in CRM
- ✅ WebSocket push notifications
- ✅ Database notifications
- ✅ Notification bell updates
- ✅ Click to view SMS/call

---

## 🔧 Configuration Options

### Auto-Reply for SMS

In CRM Settings → Twilio Settings:
```
Auto-Reply Enabled: [✓]
Auto-Reply Message: "Thank you for your message. We'll get back to you soon!"
```

### Call Forwarding

In User Profile:
```
Forward Calls To: +1234567890
```

---

## 🐛 Troubleshooting

### SMS Not Appearing?
```bash
# Check logs
tail -f /var/www/crm-app/backend/logs/app.log | grep "INCOMING SMS"

# Check database
psql -U postgres -d crm_db -c "SELECT * FROM sms ORDER BY created_at DESC LIMIT 5;"
```

### Calls Not Working?
```bash
# Check logs
tail -f /var/www/crm-app/backend/logs/app.log | grep "INCOMING CALL"

# Check database
psql -U postgres -d crm_db -c "SELECT * FROM calls ORDER BY created_at DESC LIMIT 5;"
```

### Webhooks Not Triggering?
1. Check Twilio Console → Monitor → Logs → Errors
2. Verify URLs are correct (no typos)
3. Ensure HTTPS is working
4. Check firewall allows Twilio IPs

---

## 📊 Monitoring

### Check Webhook Activity
```bash
# Real-time webhook logs
tail -f /var/www/crm-app/backend/logs/app.log | grep "WEBHOOK"

# Count SMS received today
psql -U postgres -d crm_db -c "SELECT COUNT(*) FROM sms WHERE direction='inbound' AND created_at::date = CURRENT_DATE;"

# Count calls received today
psql -U postgres -d crm_db -c "SELECT COUNT(*) FROM calls WHERE direction='inbound' AND created_at::date = CURRENT_DATE;"
```

---

## 🎯 Features Implemented

### According to Twilio Documentation:

✅ **SMS Webhooks** (https://www.twilio.com/docs/sms/tutorials/how-to-receive-and-reply-python)
- Receive incoming SMS
- Send TwiML responses
- Auto-reply functionality
- Media message support

✅ **Voice Webhooks** (https://www.twilio.com/docs/voice/tutorials/how-to-respond-to-incoming-phone-calls-python)
- Receive incoming calls
- Generate TwiML responses
- Call forwarding
- IVR support

✅ **Status Callbacks** (https://www.twilio.com/docs/usage/webhooks)
- SMS delivery status
- Call status updates
- Recording availability

✅ **Security** (https://www.twilio.com/docs/usage/webhooks/webhooks-security)
- Request signature validation
- HTTPS required
- Auth token verification

---

## 📞 Support

If issues persist:
1. Check `TWILIO_WEBHOOK_SETUP.md` for detailed guide
2. Review Twilio Console logs
3. Check CRM application logs
4. Verify database records

---

## 🚀 Next Steps

1. ✅ Deploy changes
2. ✅ Run migration
3. ✅ Configure webhooks in Twilio Console
4. ✅ Test SMS and calls
5. ✅ Monitor logs for any issues
