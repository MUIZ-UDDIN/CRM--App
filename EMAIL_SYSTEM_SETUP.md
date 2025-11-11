# 📧 Gmail-like Email System Setup Guide

## Overview
This guide will help you set up a comprehensive email system with:
- ✅ **SendGrid** integration for sending emails
- ✅ **Gmail API** integration for receiving and syncing emails  
- ✅ **Rich text editor** for composing emails
- ✅ **Email threading/conversations** like Gmail
- ✅ **Labels, search, filters**
- ✅ **Attachments support**
- ✅ **Read receipts & tracking**

---

## 🔧 Backend Setup

### 1. Install Required Packages

```bash
cd backend
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
pip install sendgrid
```

### 2. Database Migration

Run this SQL to add the new email tables:

```sql
-- Add email_settings table
CREATE TABLE IF NOT EXISTS email_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID UNIQUE NOT NULL REFERENCES companies(id),
    
    -- SendGrid
    sendgrid_api_key VARCHAR(255),
    sendgrid_from_email VARCHAR(255),
    sendgrid_from_name VARCHAR(255),
    sendgrid_enabled BOOLEAN DEFAULT TRUE,
    
    -- Gmail OAuth
    gmail_client_id VARCHAR(255),
    gmail_client_secret VARCHAR(255),
    gmail_refresh_token TEXT,
    gmail_access_token TEXT,
    gmail_token_expires_at TIMESTAMP,
    gmail_email VARCHAR(255),
    gmail_enabled BOOLEAN DEFAULT FALSE,
    
    -- Gmail Sync
    gmail_last_sync_at TIMESTAMP,
    gmail_sync_enabled BOOLEAN DEFAULT TRUE,
    gmail_sync_frequency VARCHAR(50) DEFAULT '5min',
    gmail_history_id VARCHAR(255),
    
    -- Settings
    email_signature TEXT,
    signature_enabled BOOLEAN DEFAULT FALSE,
    open_tracking_enabled BOOLEAN DEFAULT TRUE,
    click_tracking_enabled BOOLEAN DEFAULT TRUE,
    auto_reply_enabled BOOLEAN DEFAULT FALSE,
    auto_reply_subject VARCHAR(500),
    auto_reply_body TEXT,
    default_provider VARCHAR(50) DEFAULT 'sendgrid',
    settings_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Update emails table with Gmail-like features
ALTER TABLE emails ADD COLUMN IF NOT EXISTS snippet VARCHAR(500);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS from_name VARCHAR(255);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS to_name VARCHAR(255);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS reply_to VARCHAR(255);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS thread_id VARCHAR(255);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS in_reply_to VARCHAR(255);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS references TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS labels TEXT[];
ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT FALSE;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_spam BOOLEAN DEFAULT FALSE;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'sendgrid';
ALTER TABLE emails ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'outbound';
ALTER TABLE emails ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT FALSE;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE emails ADD COLUMN IF NOT EXISTS gmail_message_id VARCHAR(255);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS gmail_thread_id VARCHAR(255);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS headers JSONB DEFAULT '{}';
ALTER TABLE emails ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}';
ALTER TABLE emails ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_gmail_message_id ON emails(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_emails_gmail_thread_id ON emails(gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_is_starred ON emails(is_starred);
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read);
CREATE INDEX IF NOT EXISTS idx_emails_is_deleted ON emails(is_deleted);
CREATE INDEX IF NOT EXISTS idx_emails_sent_at ON emails(sent_at);
```

---

## 🔑 Gmail API Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Gmail API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Add authorized redirect URIs:
   ```
   https://sunstonecrm.com/api/gmail/oauth/callback
   http://localhost:3000/api/gmail/oauth/callback  (for development)
   ```
5. Save the **Client ID** and **Client Secret**

### 3. Configure OAuth Consent Screen

1. Go to "OAuth consent screen"
2. Choose "External" user type
3. Fill in app information:
   - App name: "Sunstone CRM"
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
5. Add test users (your Gmail accounts for testing)
6. Save and continue

---

## 📧 SendGrid Setup

### 1. Create SendGrid Account

1. Go to [SendGrid](https://sendgrid.com/)
2. Sign up for free account (100 emails/day free)
3. Verify your email

### 2. Create API Key

1. Go to Settings > API Keys
2. Click "Create API Key"
3. Choose "Full Access"
4. Save the API key securely

### 3. Verify Sender Email

1. Go to Settings > Sender Authentication
2. Click "Verify a Single Sender"
3. Fill in your email details
4. Verify the email sent to your inbox

---

## 🎨 Frontend Setup

### 1. Install Rich Text Editor

```bash
cd frontend
npm install react-quill quill
npm install @heroicons/react
npm install react-hot-toast
```

### 2. Environment Variables

Add to `.env`:

```env
VITE_GMAIL_CLIENT_ID=your_google_client_id
VITE_GMAIL_REDIRECT_URI=https://sunstonecrm.com/api/gmail/oauth/callback
```

---

## 🚀 Usage Flow

### For Users:

1. **Connect Gmail** (One-time setup):
   - Go to Settings > Email Integration
   - Click "Connect Gmail"
   - Authorize access in Google popup
   - Emails will start syncing automatically

2. **Send Email via SendGrid**:
   - Go to Email page
   - Click "Compose"
   - Write email with rich text editor
   - Click "Send"
   - Email sent via SendGrid

3. **Send Email via Gmail**:
   - Same as above, but select "Gmail" as provider
   - Email sent via Gmail API

4. **Receive Emails**:
   - Gmail emails sync automatically every 5 minutes
   - View in Inbox tab
   - Thread conversations like Gmail
   - Star, archive, delete, label emails

---

## 📋 Features

### ✅ Implemented

- **Email Models**: Enhanced with Gmail-like features
- **Gmail Service**: OAuth, send, receive, sync
- **Email Settings**: Per-company configuration
- **Database Schema**: Ready for migration

### 🔄 Next Steps (I'll create these files)

1. **Backend API Endpoints**:
   - `/api/gmail/oauth/authorize` - Start OAuth flow
   - `/api/gmail/oauth/callback` - Handle OAuth callback
   - `/api/gmail/sync` - Sync emails from Gmail
   - `/api/emails` - CRUD operations
   - `/api/emails/send` - Send via SendGrid or Gmail
   - `/api/emails/threads/{thread_id}` - Get conversation

2. **Frontend Components**:
   - `EmailInbox.tsx` - Gmail-like inbox UI
   - `EmailCompose.tsx` - Rich text email composer
   - `EmailThread.tsx` - Conversation view
   - `EmailSettings.tsx` - Configure Gmail/SendGrid

3. **Background Jobs**:
   - Gmail sync scheduler (every 5 min)
   - Email tracking (opens, clicks)
   - Auto-reply handler

---

## 🔐 Security Notes

1. **Encrypt tokens** in production:
   ```python
   from cryptography.fernet import Fernet
   # Encrypt refresh_token before storing
   # Decrypt when using
   ```

2. **Use environment variables** for sensitive data:
   - Never commit API keys or secrets
   - Use `.env` files (gitignored)

3. **Validate OAuth state** to prevent CSRF attacks

4. **Rate limiting** on email endpoints

---

## 📊 Database Relationships

```
companies
  └── email_settings (1:1)
  └── emails (1:many)
      └── contact (many:1)
      └── deal (many:1)
      └── user (many:1)
```

---

## 🎯 Next Steps

I'll now create:
1. ✅ Backend API endpoints for Gmail OAuth and email operations
2. ✅ Enhanced email API with threading and search
3. ✅ Frontend Gmail-like UI components
4. ✅ Rich text email composer
5. ✅ Email sync scheduler

Would you like me to proceed with creating these files?
