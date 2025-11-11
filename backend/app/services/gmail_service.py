"""
Gmail API Service for OAuth authentication and email syncing
Handles Gmail integration for receiving and sending emails
"""

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import base64
import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from loguru import logger
from sqlalchemy.orm import Session
import json


class GmailService:
    """Gmail API service for OAuth and email operations"""
    
    def __init__(self, credentials_dict: Dict[str, str] = None):
        """
        Initialize Gmail service with OAuth credentials
        
        Args:
            credentials_dict: Dict with token, refresh_token, token_uri, client_id, client_secret
        """
        self.credentials = None
        self.service = None
        
        if credentials_dict:
            self.credentials = Credentials(
                token=credentials_dict.get('token'),
                refresh_token=credentials_dict.get('refresh_token'),
                token_uri=credentials_dict.get('token_uri', 'https://oauth2.googleapis.com/token'),
                client_id=credentials_dict.get('client_id'),
                client_secret=credentials_dict.get('client_secret'),
                scopes=['https://www.googleapis.com/auth/gmail.modify']
            )
            self.service = build('gmail', 'v1', credentials=self.credentials)
    
    @staticmethod
    def get_auth_url(client_id: str, client_secret: str, redirect_uri: str) -> str:
        """
        Generate OAuth authorization URL
        
        Args:
            client_id: Google OAuth client ID
            client_secret: Google OAuth client secret
            redirect_uri: OAuth redirect URI
            
        Returns:
            Authorization URL for user to visit
        """
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=[
                'https://www.googleapis.com/auth/gmail.modify',
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/gmail.readonly'
            ],
            redirect_uri=redirect_uri
        )
        
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        
        return auth_url
    
    @staticmethod
    def exchange_code_for_tokens(
        code: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str
    ) -> Dict[str, Any]:
        """
        Exchange authorization code for access and refresh tokens
        
        Args:
            code: Authorization code from OAuth callback
            client_id: Google OAuth client ID
            client_secret: Google OAuth client secret
            redirect_uri: OAuth redirect URI
            
        Returns:
            Dict with access_token, refresh_token, expires_in, etc.
        """
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=['https://www.googleapis.com/auth/gmail.modify'],
            redirect_uri=redirect_uri
        )
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        return {
            'access_token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'expires_at': credentials.expiry.isoformat() if credentials.expiry else None
        }
    
    def send_email(
        self,
        to: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict]] = None,
        from_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send email via Gmail API
        
        Args:
            to: Recipient email
            subject: Email subject
            body_html: HTML body
            body_text: Plain text body (optional)
            cc: List of CC emails
            bcc: List of BCC emails
            attachments: List of attachment dicts with 'filename' and 'content'
            from_email: Sender email (optional)
            
        Returns:
            Dict with success status and message_id
        """
        if not self.service:
            return {"success": False, "error": "Gmail not configured"}
        
        try:
            message = MIMEMultipart('alternative')
            message['To'] = to
            message['Subject'] = subject
            
            if from_email:
                message['From'] = from_email
            
            if cc:
                message['Cc'] = ', '.join(cc)
            if bcc:
                message['Bcc'] = ', '.join(bcc)
            
            # Add text and HTML parts
            if body_text:
                part1 = MIMEText(body_text, 'plain')
                message.attach(part1)
            
            part2 = MIMEText(body_html, 'html')
            message.attach(part2)
            
            # Add attachments
            if attachments:
                for attachment in attachments:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment['content'])
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename={attachment["filename"]}'
                    )
                    message.attach(part)
            
            # Encode message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            
            # Send via Gmail API
            sent_message = self.service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()
            
            logger.info(f"✅ Email sent via Gmail: {sent_message['id']}")
            
            return {
                "success": True,
                "message_id": sent_message['id'],
                "thread_id": sent_message.get('threadId')
            }
            
        except HttpError as error:
            logger.error(f"❌ Gmail send error: {error}")
            return {"success": False, "error": str(error)}
        except Exception as e:
            logger.error(f"❌ Gmail send error: {e}")
            return {"success": False, "error": str(e)}
    
    def list_messages(
        self,
        max_results: int = 100,
        query: str = None,
        label_ids: List[str] = None,
        page_token: str = None
    ) -> Dict[str, Any]:
        """
        List messages from Gmail
        
        Args:
            max_results: Maximum number of messages to return
            query: Gmail search query (e.g., 'is:unread')
            label_ids: List of label IDs to filter by
            page_token: Page token for pagination
            
        Returns:
            Dict with messages list and nextPageToken
        """
        if not self.service:
            return {"success": False, "error": "Gmail not configured"}
        
        try:
            params = {
                'userId': 'me',
                'maxResults': max_results
            }
            
            if query:
                params['q'] = query
            if label_ids:
                params['labelIds'] = label_ids
            if page_token:
                params['pageToken'] = page_token
            
            results = self.service.users().messages().list(**params).execute()
            messages = results.get('messages', [])
            
            return {
                "success": True,
                "messages": messages,
                "next_page_token": results.get('nextPageToken'),
                "result_size_estimate": results.get('resultSizeEstimate', 0)
            }
            
        except HttpError as error:
            logger.error(f"❌ Gmail list error: {error}")
            return {"success": False, "error": str(error)}
    
    def get_message(self, message_id: str, format: str = 'full') -> Dict[str, Any]:
        """
        Get a specific message by ID
        
        Args:
            message_id: Gmail message ID
            format: Format to return (full, metadata, minimal, raw)
            
        Returns:
            Dict with message data
        """
        if not self.service:
            return {"success": False, "error": "Gmail not configured"}
        
        try:
            message = self.service.users().messages().get(
                userId='me',
                id=message_id,
                format=format
            ).execute()
            
            return {"success": True, "message": message}
            
        except HttpError as error:
            logger.error(f"❌ Gmail get message error: {error}")
            return {"success": False, "error": str(error)}
    
    def parse_message(self, message: Dict) -> Dict[str, Any]:
        """
        Parse Gmail message into structured format
        
        Args:
            message: Raw Gmail message dict
            
        Returns:
            Parsed message dict with from, to, subject, body, etc.
        """
        headers = {h['name']: h['value'] for h in message['payload'].get('headers', [])}
        
        # Extract body
        body_html = ''
        body_text = ''
        
        if 'parts' in message['payload']:
            for part in message['payload']['parts']:
                if part['mimeType'] == 'text/plain':
                    body_text = base64.urlsafe_b64decode(
                        part['body'].get('data', '')
                    ).decode('utf-8')
                elif part['mimeType'] == 'text/html':
                    body_html = base64.urlsafe_b64decode(
                        part['body'].get('data', '')
                    ).decode('utf-8')
        elif 'body' in message['payload']:
            data = message['payload']['body'].get('data', '')
            if data:
                body_text = base64.urlsafe_b64decode(data).decode('utf-8')
        
        # Extract snippet for preview
        snippet = message.get('snippet', '')[:500]
        
        return {
            'gmail_message_id': message['id'],
            'gmail_thread_id': message['threadId'],
            'from_email': headers.get('From', ''),
            'to_email': headers.get('To', ''),
            'cc': headers.get('Cc', ''),
            'subject': headers.get('Subject', ''),
            'body_html': body_html,
            'body_text': body_text,
            'snippet': snippet,
            'date': headers.get('Date', ''),
            'message_id': headers.get('Message-ID', ''),
            'in_reply_to': headers.get('In-Reply-To', ''),
            'references': headers.get('References', ''),
            'labels': message.get('labelIds', []),
            'is_read': 'UNREAD' not in message.get('labelIds', []),
            'is_starred': 'STARRED' in message.get('labelIds', []),
            'is_important': 'IMPORTANT' in message.get('labelIds', []),
            'internal_date': message.get('internalDate'),
            'raw_data': message
        }
    
    def modify_labels(
        self,
        message_id: str,
        add_labels: List[str] = None,
        remove_labels: List[str] = None
    ) -> Dict[str, Any]:
        """
        Modify labels on a message
        
        Args:
            message_id: Gmail message ID
            add_labels: List of label IDs to add
            remove_labels: List of label IDs to remove
            
        Returns:
            Dict with success status
        """
        if not self.service:
            return {"success": False, "error": "Gmail not configured"}
        
        try:
            body = {}
            if add_labels:
                body['addLabelIds'] = add_labels
            if remove_labels:
                body['removeLabelIds'] = remove_labels
            
            self.service.users().messages().modify(
                userId='me',
                id=message_id,
                body=body
            ).execute()
            
            return {"success": True}
            
        except HttpError as error:
            logger.error(f"❌ Gmail modify labels error: {error}")
            return {"success": False, "error": str(error)}
    
    def mark_as_read(self, message_id: str) -> Dict[str, Any]:
        """Mark message as read"""
        return self.modify_labels(message_id, remove_labels=['UNREAD'])
    
    def mark_as_unread(self, message_id: str) -> Dict[str, Any]:
        """Mark message as unread"""
        return self.modify_labels(message_id, add_labels=['UNREAD'])
    
    def star_message(self, message_id: str) -> Dict[str, Any]:
        """Star a message"""
        return self.modify_labels(message_id, add_labels=['STARRED'])
    
    def unstar_message(self, message_id: str) -> Dict[str, Any]:
        """Unstar a message"""
        return self.modify_labels(message_id, remove_labels=['STARRED'])
    
    def trash_message(self, message_id: str) -> Dict[str, Any]:
        """Move message to trash"""
        if not self.service:
            return {"success": False, "error": "Gmail not configured"}
        
        try:
            self.service.users().messages().trash(
                userId='me',
                id=message_id
            ).execute()
            
            return {"success": True}
            
        except HttpError as error:
            logger.error(f"❌ Gmail trash error: {error}")
            return {"success": False, "error": str(error)}
    
    def get_profile(self) -> Dict[str, Any]:
        """Get user's Gmail profile"""
        if not self.service:
            return {"success": False, "error": "Gmail not configured"}
        
        try:
            profile = self.service.users().getProfile(userId='me').execute()
            
            return {
                "success": True,
                "email": profile.get('emailAddress'),
                "messages_total": profile.get('messagesTotal'),
                "threads_total": profile.get('threadsTotal'),
                "history_id": profile.get('historyId')
            }
            
        except HttpError as error:
            logger.error(f"❌ Gmail profile error: {error}")
            return {"success": False, "error": str(error)}
