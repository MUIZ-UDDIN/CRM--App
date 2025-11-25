# Developer Setup Guide - Email Integration

## Quick Start

### Prerequisites
- Backend server running
- Frontend development server running
- PostgreSQL database with `email_settings` table
- Company Admin or Super Admin account

## Database Migration

If the `email_settings` table doesn't exist, create it:

```sql
-- Run this in your PostgreSQL database
CREATE TABLE IF NOT EXISTS email_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    
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

-- Create index for faster lookups
CREATE INDEX idx_email_settings_company_id ON email_settings(company_id);
```

## Testing the Integration

### 1. Get a SendGrid API Key

1. Sign up at [SendGrid](https://sendgrid.com/)
2. Go to Settings > API Keys
3. Create a new API key with "Full Access" or "Mail Send" permissions
4. Copy the API key (starts with `SG.`)

### 2. Verify Sender Email

1. In SendGrid dashboard, go to Settings > Sender Authentication
2. Verify a single sender email address
3. Use this email as the "From Email" in the CRM

### 3. Test SendGrid Connection

1. Login to CRM as Company Admin
2. Navigate to Settings > Integrations
3. Click "Connect" on SendGrid card
4. Enter:
   - API Key: Your SendGrid API key
   - From Email: Your verified email
   - From Name: Your company name
5. Click "Connect SendGrid"
6. Verify status changes to "Connected"

### 4. Test API Endpoints

Using curl or Postman:

```bash
# Get email settings
curl -X GET http://localhost:8000/api/email-settings/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Save SendGrid settings
curl -X POST http://localhost:8000/api/email-settings/sendgrid \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "from_email": "noreply@yourcompany.com",
    "from_name": "Your Company"
  }'

# Get SendGrid settings
curl -X GET http://localhost:8000/api/email-settings/sendgrid \
  -H "Authorization: Bearer YOUR_TOKEN"

# Disconnect SendGrid
curl -X DELETE http://localhost:8000/api/email-settings/sendgrid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Development Workflow

### Frontend Development

1. **Email Service** (`frontend/src/services/emailService.ts`)
   - Contains all API calls
   - Type definitions for requests/responses

2. **Settings Page** (`frontend/src/pages/Settings.tsx`)
   - Integration cards
   - Modal components
   - State management
   - Event handlers

### Backend Development

1. **API Endpoints** (`backend/app/api/email_settings.py`)
   - RESTful endpoints
   - Permission checks
   - Database operations

2. **Models** (`backend/app/models/email_settings.py`)
   - EmailSettings model
   - Relationships
   - Field definitions

## Common Development Tasks

### Adding a New Email Provider

1. **Update Integration Array** (Settings.tsx):
```typescript
{ 
  id: '4', 
  name: 'Outlook', 
  description: 'Microsoft Outlook integration',
  status: 'disconnected', 
  icon: '📨' 
}
```

2. **Add State Variables**:
```typescript
const [showOutlookModal, setShowOutlookModal] = useState(false);
const [outlookDetails, setOutlookDetails] = useState<any>(null);
```

3. **Add Handler Functions**:
```typescript
const handleConnectOutlook = async () => { /* ... */ };
const handleDisconnectOutlook = async () => { /* ... */ };
```

4. **Update Backend Model** (email_settings.py):
```python
outlook_client_id = Column(String(255), nullable=True)
outlook_enabled = Column(Boolean, default=False)
```

5. **Add API Endpoints** (email_settings.py):
```python
@router.post("/outlook")
async def save_outlook_settings(...): pass

@router.delete("/outlook")
async def disconnect_outlook(...): pass
```

### Modifying Email Settings Fields

1. Update the database model
2. Create migration script
3. Update Pydantic schemas
4. Update API endpoints
5. Update frontend types
6. Update UI forms

## Debugging

### Backend Debugging

1. **Check Logs**:
```bash
# Backend logs will show:
✅ Email settings routes registered
```

2. **Test Database Connection**:
```python
# In Python shell
from app.models.email_settings import EmailSettings
from app.core.database import SessionLocal

db = SessionLocal()
settings = db.query(EmailSettings).all()
print(settings)
```

3. **Verify Permissions**:
```python
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

# Check if user has permission
has_permission(current_user, Permission.MANAGE_COMPANY_INTEGRATIONS)
```

### Frontend Debugging

1. **Check Network Tab**:
   - Look for `/api/email-settings/` requests
   - Verify request/response payloads
   - Check for 403 (permission) or 500 (server) errors

2. **Console Logs**:
```typescript
console.log('Email settings:', emailSettings);
console.log('SendGrid details:', sendGridDetails);
```

3. **React DevTools**:
   - Inspect Settings component state
   - Check integration array
   - Verify modal states

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/crm_db

# SendGrid (optional - for testing)
SENDGRID_API_KEY=SG.test_key_for_development

# Gmail OAuth (when implementing)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/email-settings/gmail/callback
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:8000
```

## Code Style Guidelines

### TypeScript/React

- Use functional components with hooks
- Follow existing patterns (see Twilio integration)
- Add proper TypeScript types
- Handle loading and error states
- Show user-friendly error messages

### Python/FastAPI

- Use async/await for database operations
- Add proper type hints
- Include docstrings for endpoints
- Handle exceptions gracefully
- Return consistent response formats

## Testing Checklist

Before committing:

- [ ] Backend server starts without errors
- [ ] Frontend compiles without TypeScript errors
- [ ] Can access Settings > Integrations page
- [ ] Integration cards display correctly
- [ ] Can open/close modals
- [ ] API endpoints return expected responses
- [ ] Permission checks work correctly
- [ ] Database operations succeed
- [ ] Error messages are user-friendly
- [ ] Code follows project conventions

## Deployment Notes

### Production Considerations

1. **Security**:
   - Encrypt API keys in database
   - Use HTTPS for all requests
   - Implement rate limiting
   - Validate all inputs

2. **Performance**:
   - Cache email settings
   - Use connection pooling
   - Implement retry logic
   - Monitor API usage

3. **Monitoring**:
   - Log all integration actions
   - Track success/failure rates
   - Monitor API response times
   - Alert on errors

## Resources

- [SendGrid API Documentation](https://docs.sendgrid.com/api-reference)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)

## Support

For development questions:
1. Check this guide
2. Review existing Twilio integration code
3. Check API documentation
4. Review error logs
5. Ask team lead or senior developer
