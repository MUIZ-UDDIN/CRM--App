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
