"""
Email service for sending invitations and notifications
Uses company-specific SendGrid API keys
"""

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
import logging

logger = logging.getLogger(__name__)


def send_invitation_email(
    to_email: str,
    first_name: str,
    company_name: str,
    invited_by: str,
    invitation_link: str,
    sendgrid_api_key: str = None
):
    """
    Send invitation email to new team member
    """
    
    if not sendgrid_api_key:
        logger.warning(f"No SendGrid API key configured for invitation to {to_email}")
        # In development, just log the invitation link
        logger.info(f"Invitation link for {to_email}: {invitation_link}")
        return
    
    try:
        # Create email content
        subject = f"You've been invited to join {company_name} on Sunstone CRM"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to Sunstone CRM!</h1>
                </div>
                <div class="content">
                    <p>Hi {first_name},</p>
                    
                    <p><strong>{invited_by}</strong> has invited you to join <strong>{company_name}</strong> on Sunstone CRM.</p>
                    
                    <p>Sunstone CRM is a powerful platform to manage your sales, contacts, and communications all in one place.</p>
                    
                    <p>Click the button below to accept your invitation and set up your account:</p>
                    
                    <center>
                        <a href="{invitation_link}" class="button">Accept Invitation</a>
                    </center>
                    
                    <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
                    
                    <p>If you have any questions, feel free to reach out to your team admin.</p>
                    
                    <p>Best regards,<br>The Sunstone CRM Team</p>
                </div>
                <div class="footer">
                    <p>This email was sent by Sunstone CRM on behalf of {company_name}</p>
                    <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Create SendGrid message
        message = Mail(
            from_email=Email("noreply@sunstonecrm.com", "Sunstone CRM"),
            to_emails=To(to_email),
            subject=subject,
            html_content=Content("text/html", html_content)
        )
        
        # Send email
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        
        logger.info(f"Invitation email sent to {to_email}, status: {response.status_code}")
        
    except Exception as e:
        logger.error(f"Failed to send invitation email to {to_email}: {str(e)}")
        # Don't raise exception - log and continue
        # In production, you might want to queue for retry


def send_welcome_email(
    to_email: str,
    first_name: str,
    company_name: str,
    sendgrid_api_key: str = None
):
    """
    Send welcome email after user accepts invitation
    """
    
    if not sendgrid_api_key:
        logger.warning(f"No SendGrid API key configured for welcome email to {to_email}")
        return
    
    try:
        subject = f"Welcome to {company_name}!"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Welcome Aboard!</h1>
                </div>
                <div class="content">
                    <p>Hi {first_name},</p>
                    
                    <p>Your account has been successfully created! You're now part of <strong>{company_name}</strong> on Sunstone CRM.</p>
                    
                    <p><strong>Here's what you can do:</strong></p>
                    <ul>
                        <li>Manage contacts and deals</li>
                        <li>Track sales activities</li>
                        <li>Send SMS and emails</li>
                        <li>Make calls and track conversations</li>
                        <li>View analytics and reports</li>
                    </ul>
                    
                    <center>
                        <a href="https://sunstonecrm.com/login" class="button">Login to Dashboard</a>
                    </center>
                    
                    <p>If you need help getting started, check out our help center or contact your team admin.</p>
                    
                    <p>Best regards,<br>The Sunstone CRM Team</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        message = Mail(
            from_email=Email("noreply@sunstonecrm.com", "Sunstone CRM"),
            to_emails=To(to_email),
            subject=subject,
            html_content=Content("text/html", html_content)
        )
        
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        
        logger.info(f"Welcome email sent to {to_email}, status: {response.status_code}")
        
    except Exception as e:
        logger.error(f"Failed to send welcome email to {to_email}: {str(e)}")


def send_quote_email(
    to_email: str,
    client_name: str,
    quote_number: str,
    quote_title: str,
    quote_amount: float,
    valid_until: str,
    company_name: str,
    sender_name: str,
    quote_link: str,
    sendgrid_api_key: str = None
):
    """
    Send quote to client with link to view and respond
    """
    
    if not sendgrid_api_key:
        logger.warning(f"No SendGrid API key configured for quote email to {to_email}")
        # In development, just log the quote link
        logger.info(f"Quote link for {to_email}: {quote_link}")
        return True  # Return True so the quote status still updates
    
    try:
        subject = f"Quote {quote_number} from {company_name} - {quote_title}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .quote-box {{ background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }}
                .quote-amount {{ font-size: 32px; font-weight: bold; color: #1e40af; text-align: center; margin: 15px 0; }}
                .button {{ display: inline-block; background: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }}
                .button-accept {{ background: #059669; }}
                .button-view {{ background: #1e40af; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
                .detail-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }}
                .detail-label {{ color: #6b7280; }}
                .detail-value {{ font-weight: 500; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{company_name}</h1>
                    <p style="margin: 0; opacity: 0.9;">Quote #{quote_number}</p>
                </div>
                <div class="content">
                    <p>Hi {client_name},</p>
                    
                    <p><strong>{sender_name}</strong> from <strong>{company_name}</strong> has sent you a quote for your review.</p>
                    
                    <div class="quote-box">
                        <h3 style="margin-top: 0; color: #374151;">{quote_title}</h3>
                        <div class="quote-amount">${quote_amount:,.2f}</div>
                        <div style="text-align: center; color: #6b7280; font-size: 14px;">
                            Valid until: {valid_until}
                        </div>
                    </div>
                    
                    <p>Click the button below to view the full quote details and respond:</p>
                    
                    <center>
                        <a href="{quote_link}" class="button button-view">View Quote & Respond</a>
                    </center>
                    
                    <p style="color: #666; font-size: 14px; margin-top: 30px;">
                        You can accept or reject this quote directly from the link above. 
                        If you have any questions, please contact {sender_name} directly.
                    </p>
                    
                    <p>Best regards,<br><strong>{sender_name}</strong><br>{company_name}</p>
                </div>
                <div class="footer">
                    <p>This quote was sent via Sunstone CRM on behalf of {company_name}</p>
                    <p>Quote #{quote_number} | Valid until {valid_until}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Create SendGrid message
        message = Mail(
            from_email=Email("noreply@sunstonecrm.com", company_name),
            to_emails=To(to_email),
            subject=subject,
            html_content=Content("text/html", html_content)
        )
        
        # Send email
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        
        logger.info(f"Quote email sent to {to_email}, status: {response.status_code}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send quote email to {to_email}: {str(e)}")
        return False


def send_quote_response_notification(
    to_email: str,
    owner_name: str,
    client_name: str,
    quote_number: str,
    quote_title: str,
    quote_amount: float,
    action: str,  # "accepted" or "rejected"
    client_note: str = None,
    sendgrid_api_key: str = None
):
    """
    Notify quote owner when client accepts or rejects a quote
    """
    
    if not sendgrid_api_key:
        logger.warning(f"No SendGrid API key configured for quote notification to {to_email}")
        return
    
    try:
        action_emoji = "✅" if action == "accepted" else "❌"
        action_color = "#059669" if action == "accepted" else "#dc2626"
        
        subject = f"{action_emoji} Quote {quote_number} has been {action}"
        
        note_section = ""
        if client_note:
            note_section = f"""
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p style="margin: 0; color: #6b7280; font-size: 12px;">Client's note:</p>
                <p style="margin: 5px 0 0 0; color: #374151;">"{client_note}"</p>
            </div>
            """
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: {action_color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{action_emoji} Quote {action.capitalize()}</h1>
                </div>
                <div class="content">
                    <p>Hi {owner_name},</p>
                    
                    <p><strong>{client_name}</strong> has <strong style="color: {action_color};">{action}</strong> your quote.</p>
                    
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>Quote:</strong> {quote_title}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Quote #:</strong> {quote_number}</p>
                        <p style="margin: 0;"><strong>Amount:</strong> ${quote_amount:,.2f}</p>
                    </div>
                    
                    {note_section}
                    
                    <center>
                        <a href="https://sunstonecrm.com/quotes" class="button">View in CRM</a>
                    </center>
                    
                    <p>Best regards,<br>Sunstone CRM</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        message = Mail(
            from_email=Email("noreply@sunstonecrm.com", "Sunstone CRM"),
            to_emails=To(to_email),
            subject=subject,
            html_content=Content("text/html", html_content)
        )
        
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        
        logger.info(f"Quote response notification sent to {to_email}, status: {response.status_code}")
        
    except Exception as e:
        logger.error(f"Failed to send quote response notification to {to_email}: {str(e)}")
