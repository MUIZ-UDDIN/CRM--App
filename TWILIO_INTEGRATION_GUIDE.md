# Twilio Integration Guide

## Overview

Your CRM now supports **multi-tenant Twilio integration**, allowing each user (both super admins and regular users) to configure their own Twilio accounts with their own phone numbers for SMS and voice calls - just like Salesmate!

## Features Implemented

### 1. REST API Documentation
- ✅ Complete API documentation in `API_DOCUMENTATION.md`
- ✅ All endpoints documented with examples
- ✅ Authentication guide
- ✅ Python and JavaScript SDK examples
- ✅ Error handling documentation

### 2. Multi-Tenant Twilio Settings
- ✅ Each user can configure their own Twilio account
- ✅ Secure storage of Twilio credentials (Account SID & Auth Token)
- ✅ Support for multiple phone numbers per user
- ✅ Enable/disable SMS and Voice features independently
- ✅ Credential verification system

### 3. Backend API Endpoints

#### Twilio Settings Endpoints:
- `GET /api/twilio-settings/` - Get current user's Twilio settings
- `POST /api/twilio-settings/` - Create new Twilio settings
- `PUT /api/twilio-settings/` - Update existing settings
- `DELETE /api/twilio-settings/` - Delete settings
- `POST /api/twilio-settings/verify` - Verify Twilio credentials
- `GET /api/twilio-settings/phone-numbers` - List available phone numbers from Twilio account

### 4. Frontend UI
- ✅ Twilio Settings page (`/twilio-settings`)
- ✅ Configuration form for Account SID and Auth Token
- ✅ Phone number selection
- ✅ SMS/Voice toggle switches
- ✅ Credential verification
- ✅ Visual status indicators (verified/not verified)
- ✅ List of available phone numbers from Twilio account

## Deployment Instructions

### On VPS:

```bash
cd /var/www/crm-app

# Pull latest code
git pull origin main

# Install Twilio SDK
cd backend
source venv/bin/activate
pip install twilio==8.10.0

# Create database table
python << 'EOF'
from app.core.database import engine, Base
from app.models.twilio_settings import TwilioSettings

# Create the twilio_settings table
Base.metadata.create_all(bind=engine, tables=[TwilioSettings.__table__])
print("Twilio settings table created successfully!")
EOF

# Restart backend
sudo systemctl restart crm-backend

# Rebuild frontend
cd ../frontend
npm run build

# Restart Nginx
sudo systemctl restart nginx
```

## How Users Configure Twilio

### Step 1: Get Twilio Credentials
1. Go to https://console.twilio.com
2. Sign in or create a free account
3. Copy your **Account SID** and **Auth Token** from the dashboard
4. Purchase a phone number if you don't have one

### Step 2: Configure in CRM
1. Navigate to **Twilio Settings** page
2. Enter your Account SID (34 characters, starts with "AC")
3. Enter your Auth Token (32+ characters)
4. Optionally enter your phone number in E.164 format (+1234567890)
5. Enable SMS and/or Voice features
6. Click **Save Settings**

### Step 3: Verify Credentials
1. Click **Verify Credentials** button
2. System will test connection to Twilio
3. If successful, you'll see "Verified" status
4. Available phone numbers will be displayed

### Step 4: Use SMS and Calls
- Once verified, users can send SMS and make calls using their own Twilio account
- All usage and costs are billed to their individual Twilio account
- No shared resources between users

## Security Features

### Implemented:
- ✅ Auth token stored in database (should be encrypted in production - see below)
- ✅ Masked auth token in UI (shows ••••••••)
- ✅ User-specific settings (one user cannot see another's settings)
- ✅ Credential verification before allowing usage

### TODO for Production:
- [ ] Encrypt auth tokens in database using Fernet or similar
- [ ] Add rate limiting for Twilio API calls
- [ ] Add audit logging for Twilio operations
- [ ] Implement webhook signatures for Twilio callbacks

## Database Schema

```sql
CREATE TABLE twilio_settings (
    id UUID PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES users(id),
    account_sid VARCHAR(255) NOT NULL,
    auth_token VARCHAR(255) NOT NULL,  -- Should be encrypted
    phone_number VARCHAR(20),
    sms_enabled BOOLEAN DEFAULT TRUE,
    voice_enabled BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_verified_at TIMESTAMP
);
```

## API Usage Examples

### Create Twilio Settings
```bash
curl -X POST https://sunstonecrm.com/api/twilio-settings/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_sid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "auth_token": "your_auth_token_here",
    "phone_number": "+1234567890",
    "sms_enabled": true,
    "voice_enabled": true
  }'
```

### Get Settings
```bash
curl -X GET https://sunstonecrm.com/api/twilio-settings/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Verify Credentials
```bash
curl -X POST https://sunstonecrm.com/api/twilio-settings/verify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### List Phone Numbers
```bash
curl -X GET https://sunstonecrm.com/api/twilio-settings/phone-numbers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Next Steps

### To Complete SMS Functionality:
1. Update SMS endpoints to use user's Twilio credentials
2. Implement SMS sending with user's phone number
3. Handle incoming SMS webhooks
4. Store SMS history per user

### To Complete Voice Functionality:
1. Update Call endpoints to use user's Twilio credentials
2. Implement call initiation with user's phone number
3. Handle call status webhooks
4. Store call history per user

### Additional Features:
- [ ] SMS templates
- [ ] Call recording
- [ ] SMS/Call analytics per user
- [ ] Twilio usage tracking and billing
- [ ] Multi-number support (user can have multiple phone numbers)
- [ ] Number porting support

## Testing

### Manual Testing:
1. Create a Twilio trial account (free)
2. Configure settings in CRM
3. Verify credentials
4. Test SMS sending
5. Test voice calls

### Automated Testing:
```python
# Test Twilio settings API
import requests

# Login
response = requests.post('https://sunstonecrm.com/api/auth/login', json={
    'email': 'test@example.com',
    'password': 'password'
})
token = response.json()['access_token']

# Create settings
response = requests.post('https://sunstonecrm.com/api/twilio-settings/', 
    headers={'Authorization': f'Bearer {token}'},
    json={
        'account_sid': 'AC...',
        'auth_token': '...',
        'phone_number': '+1234567890'
    }
)
print(response.json())
```

## Troubleshooting

### "Verification failed"
- Check that Account SID is exactly 34 characters
- Check that Auth Token is correct
- Ensure Twilio account is active (not suspended)
- Check internet connectivity from server

### "Failed to fetch phone numbers"
- Ensure credentials are verified first
- Check that you have at least one phone number in Twilio account
- Verify Twilio account has proper permissions

### "Settings not found"
- User needs to configure settings first
- Check that user is logged in correctly

## Support

For issues or questions:
- Check API documentation: `API_DOCUMENTATION.md`
- Review Twilio docs: https://www.twilio.com/docs
- Contact support: support@sunstonecrm.com

## Summary

✅ **Completed:**
1. REST API documentation
2. Multi-tenant Twilio settings model
3. Complete CRUD API for Twilio settings
4. Frontend UI for configuration
5. Credential verification
6. Phone number listing

🚧 **In Progress:**
- SMS sending with user credentials
- Voice calling with user credentials

📋 **Next:**
- Deploy to VPS
- Create database table
- Test with real Twilio accounts
- Implement SMS/Call functionality using user credentials
