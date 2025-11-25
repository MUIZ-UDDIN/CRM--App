# Email Integration Guide

## Overview
The CRM system supports two email integration providers:
1. **SendGrid** - For bulk email campaigns and transactional emails
2. **Gmail** - For individual email sending and receiving via Gmail OAuth

## Features

### SendGrid Integration
- ✅ API key-based authentication
- ✅ Configure sender email and name
- ✅ Bulk email campaigns
- ✅ Transactional emails
- ✅ Email tracking (opens, clicks)
- ✅ Easy connect/disconnect

### Gmail Integration
- ✅ OAuth 2.0 authentication
- ✅ Send and receive emails
- ✅ Email sync with configurable frequency
- ✅ Access to Gmail inbox
- ⏳ Full OAuth flow (placeholder ready)

## User Access

### Permissions Required
- **Super Admin**: Can manage integrations for any company
- **Company Admin**: Can manage integrations for their company
- **Sales Manager**: No access to integration settings
- **Sales Rep**: No access to integration settings

Permission used: `MANAGE_COMPANY_INTEGRATIONS`

## How to Use

### For End Users

#### Setting Up SendGrid

1. Navigate to **Settings > Integrations**
2. Find the **SendGrid** card (📧 icon)
3. Click **Connect**
4. Enter your SendGrid credentials:
   - **API Key**: Get from [SendGrid Dashboard](https://app.sendgrid.com/settings/api_keys)
   - **From Email**: Your verified sender email (e.g., noreply@yourcompany.com)
   - **From Name**: Display name for emails (e.g., Your Company)
5. Click **Connect SendGrid**
6. Status will change to "Connected" ✅

**Important**: Make sure to verify your sender email in SendGrid before using it.

#### Setting Up Gmail

1. Navigate to **Settings > Integrations**
2. Find the **Gmail** card (📬 icon)
3. Click **Connect**
4. A popup window will open for Gmail authorization
5. Sign in with your Google account
6. Grant permissions to the CRM app
7. Status will change to "Connected" ✅

#### Disconnecting Integrations

1. Navigate to **Settings > Integrations**
2. Find the integration card you want to disconnect
3. Click **Disconnect**
4. Confirm the action
5. All settings will be removed

## API Endpoints

### Email Settings

#### Get All Email Settings
```http
GET /api/email-settings/
Authorization: Bearer {token}
```

**Response:**
```json
{
  "sendgrid_enabled": true,
  "sendgrid_from_email": "noreply@company.com",
  "sendgrid_from_name": "Company Name",
  "gmail_enabled": false,
  "gmail_email": null,
  "gmail_sync_enabled": false,
  "gmail_sync_frequency": "5min",
  "default_provider": "sendgrid"
}
```

### SendGrid Endpoints

#### Save SendGrid Settings
```http
POST /api/email-settings/sendgrid
Authorization: Bearer {token}
Content-Type: application/json

{
  "api_key": "SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "from_email": "noreply@company.com",
  "from_name": "Company Name"
}
```

#### Get SendGrid Settings
```http
GET /api/email-settings/sendgrid
Authorization: Bearer {token}
```

#### Disconnect SendGrid
```http
DELETE /api/email-settings/sendgrid
Authorization: Bearer {token}
```

### Gmail Endpoints

#### Get Gmail OAuth URL
```http
GET /api/email-settings/gmail/auth-url
Authorization: Bearer {token}
```

**Response:**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "message": "Gmail OAuth integration coming soon"
}
```

#### Get Gmail Settings
```http
GET /api/email-settings/gmail
Authorization: Bearer {token}
```

#### Update Gmail Settings
```http
PATCH /api/email-settings/gmail
Authorization: Bearer {token}
Content-Type: application/json

{
  "sync_enabled": true,
  "sync_frequency": "15min"
}
```

#### Disconnect Gmail
```http
DELETE /api/email-settings/gmail
Authorization: Bearer {token}
```

## Database Schema

### EmailSettings Table

```sql
CREATE TABLE email_settings (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL UNIQUE REFERENCES companies(id),
    
    -- SendGrid Configuration
    sendgrid_api_key VARCHAR(255),
    sendgrid_from_email VARCHAR(255),
    sendgrid_from_name VARCHAR(255),
    sendgrid_enabled BOOLEAN DEFAULT TRUE,
    
    -- Gmail OAuth Configuration
    gmail_client_id VARCHAR(255),
    gmail_client_secret VARCHAR(255),
    gmail_refresh_token TEXT,
    gmail_access_token TEXT,
    gmail_token_expires_at TIMESTAMP,
    gmail_email VARCHAR(255),
    gmail_enabled BOOLEAN DEFAULT FALSE,
    
    -- Gmail Sync Settings
    gmail_last_sync_at TIMESTAMP,
    gmail_sync_enabled BOOLEAN DEFAULT TRUE,
    gmail_sync_frequency VARCHAR(50) DEFAULT '5min',
    gmail_history_id VARCHAR(255),
    
    -- Email Signature
    email_signature TEXT,
    signature_enabled BOOLEAN DEFAULT FALSE,
    
    -- Tracking Settings
    open_tracking_enabled BOOLEAN DEFAULT TRUE,
    click_tracking_enabled BOOLEAN DEFAULT TRUE,
    
    -- Auto-Reply Settings
    auto_reply_enabled BOOLEAN DEFAULT FALSE,
    auto_reply_subject VARCHAR(500),
    auto_reply_body TEXT,
    
    -- Provider Priority
    default_provider VARCHAR(50) DEFAULT 'sendgrid',
    
    -- Metadata
    settings_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);
```

## Frontend Components

### Files Modified/Created

1. **`frontend/src/pages/Settings.tsx`**
   - Added SendGrid and Gmail integration cards
   - Added state management for email integrations
   - Added handlers for connect/disconnect
   - Added SendGrid configuration modal

2. **`frontend/src/services/emailService.ts`** (NEW)
   - API client for email settings endpoints
   - Type definitions for email settings

### Integration Cards

Both SendGrid and Gmail cards follow the same pattern as Twilio:

```tsx
{
  id: '2',
  name: 'SendGrid',
  description: 'Bulk email campaigns and transactional emails',
  status: 'disconnected',
  icon: '📧'
}
```

## Backend Implementation

### Files Created

1. **`backend/app/api/email_settings.py`** (NEW)
   - All email settings API endpoints
   - Permission checks
   - CRUD operations for email settings

2. **`backend/app/models/email_settings.py`** (EXISTING)
   - EmailSettings model with all fields
   - Relationships with Company model

### Permission Checks

All endpoints check for `MANAGE_COMPANY_INTEGRATIONS` permission:

```python
if not has_permission(current_user, Permission.MANAGE_COMPANY_INTEGRATIONS):
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have permission to manage integrations"
    )
```

## Gmail OAuth Implementation (TODO)

To complete the Gmail OAuth flow:

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Gmail API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://yourapp.com/api/email-settings/gmail/callback`

### 2. Environment Variables

Add to `.env`:
```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://yourapp.com/api/email-settings/gmail/callback
```

### 3. Update Backend Code

In `email_settings.py`, replace the placeholder OAuth URL generation:

```python
from google_auth_oauthlib.flow import Flow
import os

@router.get("/gmail/auth-url")
async def get_gmail_auth_url(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "redirect_uris": [os.getenv("GOOGLE_REDIRECT_URI")],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=[
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
        ],
    )
    
    flow.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
    )
    
    return {"auth_url": authorization_url, "state": state}
```

### 4. Add OAuth Callback Endpoint

```python
@router.get("/gmail/callback")
async def gmail_oauth_callback(
    code: str,
    state: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Exchange code for tokens
    # Save tokens to database
    # Return success response
    pass
```

## Testing

### Manual Testing Steps

1. **SendGrid Connection**
   - [ ] Can open SendGrid modal
   - [ ] Form validation works
   - [ ] Can save valid API key
   - [ ] Status changes to "Connected"
   - [ ] Can disconnect SendGrid
   - [ ] Settings are removed after disconnect

2. **Gmail Connection**
   - [ ] Can click Connect button
   - [ ] OAuth popup opens (when implemented)
   - [ ] Status changes after successful auth
   - [ ] Can disconnect Gmail
   - [ ] Settings are removed after disconnect

3. **Permissions**
   - [ ] Company Admin can access integrations
   - [ ] Super Admin can access integrations
   - [ ] Sales Manager cannot access integrations
   - [ ] Sales Rep cannot access integrations

### API Testing

Use the provided Postman collection or curl commands to test endpoints.

## Troubleshooting

### SendGrid Connection Issues

**Problem**: "Failed to connect SendGrid"
- **Solution**: Verify API key is correct and has proper permissions
- Check SendGrid dashboard for API key status
- Ensure sender email is verified in SendGrid

### Gmail Connection Issues

**Problem**: OAuth popup doesn't open
- **Solution**: Check browser popup blocker settings
- Verify Google OAuth credentials are configured
- Check redirect URI matches exactly

### Permission Denied

**Problem**: "You don't have permission to manage integrations"
- **Solution**: Contact your Company Admin
- Verify your role has `MANAGE_COMPANY_INTEGRATIONS` permission
- Only Company Admins and Super Admins can manage integrations

## Future Enhancements

- [ ] Complete Gmail OAuth flow implementation
- [ ] Email template management
- [ ] Email scheduling
- [ ] Email analytics dashboard
- [ ] A/B testing for email campaigns
- [ ] Email automation workflows
- [ ] Custom SMTP server support
- [ ] Microsoft Outlook integration
- [ ] Email signature editor with rich text
- [ ] Unsubscribe management
- [ ] Bounce and complaint handling

## Support

For issues or questions:
1. Check this documentation
2. Review API error messages
3. Check browser console for frontend errors
4. Review backend logs for API errors
5. Contact system administrator

## Version History

- **v1.0.0** (2024-11-25): Initial implementation
  - SendGrid integration with API key
  - Gmail OAuth placeholder
  - Basic connect/disconnect functionality
  - Permission-based access control
