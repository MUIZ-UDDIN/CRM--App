"""
Notification Service - Centralized notification creation for all CRM actions
"""

from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime

from app.models.notifications import Notification, NotificationType
from app.models.users import User
from app.models.permissions import Permission
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for creating and managing notifications across the CRM"""
    
    @staticmethod
    def _get_all_company_users(db: Session, company_id: uuid.UUID) -> List[User]:
        """Get ALL active users in a company (including creator for confirmation)"""
        query = db.query(User).filter(
            User.company_id == company_id,
            User.is_deleted == False,
            User.status == 'active'
        )
        return query.all()
    
    @staticmethod
    def _get_admins_and_managers(db: Session, company_id: uuid.UUID, exclude_user_id: Optional[uuid.UUID] = None) -> List[User]:
        """Get all admins and managers in a company"""
        query = db.query(User).filter(
            User.company_id == company_id,
            User.is_deleted == False,
            User.status == 'active',
            User.user_role.in_(['super_admin', 'company_admin', 'sales_manager'])
        )
        
        if exclude_user_id:
            query = query.filter(User.id != exclude_user_id)
        
        return query.all()
    
    @staticmethod
    def _get_company_admins(db: Session, company_id: uuid.UUID, exclude_user_id: Optional[uuid.UUID] = None) -> List[User]:
        """Get all company admins and super admins in a company, excluding the action performer"""
        query = db.query(User).filter(
            User.company_id == company_id,
            User.is_deleted == False,
            User.status == 'active',
            User.user_role.in_(['super_admin', 'company_admin'])
        )
        
        if exclude_user_id:
            query = query.filter(User.id != exclude_user_id)
        
        return query.all()
    
    @staticmethod
    def _get_super_admins(db: Session, exclude_user_id: Optional[uuid.UUID] = None) -> List[User]:
        """Get all super admins"""
        query = db.query(User).filter(
            User.is_deleted == False,
            User.status == 'active',
            User.user_role == 'super_admin'
        )
        
        if exclude_user_id:
            query = query.filter(User.id != exclude_user_id)
        
        return query.all()
    
    @staticmethod
    def _create_notification(
        db: Session,
        user_id: uuid.UUID,
        company_id: uuid.UUID,
        title: str,
        message: str,
        notification_type: NotificationType = NotificationType.INFO,
        link: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None
    ):
        """Create a single notification and broadcast it via WebSocket"""
        try:
            notification = Notification(
                title=title,
                message=message,
                type=notification_type,
                link=link,
                extra_data=extra_data or {},
                user_id=user_id,
                company_id=company_id
            )
            db.add(notification)
            db.flush()  # Flush to get the ID
            
            # Broadcast notification via WebSocket for real-time updates
            try:
                import asyncio
                from ..services.websocket_manager import broadcast_notification
                
                notification_data = {
                    "id": str(notification.id),
                    "title": notification.title,
                    "message": notification.message,
                    "type": notification.type.value if hasattr(notification.type, 'value') else str(notification.type),
                    "link": notification.link,
                    "read": notification.read,
                    "created_at": notification.created_at.isoformat() if notification.created_at else None,
                    "user_id": str(notification.user_id)
                }
                
                # Run broadcast in background
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.ensure_future(broadcast_notification(
                        company_id=str(company_id),
                        notification_data=notification_data
                    ))
            except Exception as broadcast_error:
                logger.warning(f"Failed to broadcast notification: {broadcast_error}")
            
            return notification
        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}")
            return None
    
    @staticmethod
    def notify_deal_created(
        db: Session,
        deal_id: uuid.UUID,
        deal_title: str,
        creator_id: uuid.UUID,
        creator_name: str,
        company_id: uuid.UUID,
        deal_value: float
    ):
        """Notify admins and managers when a deal is created"""
        try:
            print(f"🔔 notify_deal_created called: deal_id={deal_id}, company_id={company_id}, creator_id={creator_id}")
            logger.info(f"notify_deal_created called: deal_id={deal_id}, company_id={company_id}, creator_id={creator_id}")
            
            print(f"🔔 Getting recipients for deal notification...")
            
            # Get creator's role to determine who to notify
            from ..models.users import User
            creator = db.query(User).filter(User.id == creator_id).first()
            creator_role = creator.user_role if creator else None
            print(f"🔍 Creator role: {creator_role}, Company: {company_id}")
            
            recipients = []
            recipient_ids = set()
            
            # NOTIFICATION RULES:
            # 1. Super Admin creates: Notify ALL users in super admin's company (including super admin for confirmation)
            # 2. Company Admin creates: Notify super admin + ALL users in that company (including company admin)
            # 3. Sales Manager/Rep creates: Notify super admin + company admin + creator (for confirmation)
            
            if creator_role == 'super_admin':
                # Notify ALL users in the super admin's company (including the super admin themselves)
                print(f"🔍 Super admin action - notifying all users in company {company_id}")
                recipients = NotificationService._get_all_company_users(db, company_id)
                
            elif creator_role == 'company_admin':
                # Notify ALL users in the company (including company admin themselves)
                print(f"🔍 Company admin action - notifying all company users + super admin")
                recipients = NotificationService._get_all_company_users(db, company_id)
                # Also notify super admin
                super_admin = db.query(User).filter(
                    User.user_role == 'super_admin',
                    User.is_deleted == False,
                    User.status == 'active'
                ).first()
                if super_admin and super_admin.id not in [r.id for r in recipients]:
                    recipients.append(super_admin)
                    
            else:  # sales_manager, sales_rep, or any other role
                # Notify company admin + super admin + creator themselves
                print(f"🔍 Sales rep/manager action - notifying company admin + super admin + self")
                # Get company admin
                company_admin = db.query(User).filter(
                    User.company_id == company_id,
                    User.user_role == 'company_admin',
                    User.is_deleted == False,
                    User.status == 'active'
                ).first()
                if company_admin:
                    recipients.append(company_admin)
                
                # Get super admin
                super_admin = db.query(User).filter(
                    User.user_role == 'super_admin',
                    User.is_deleted == False,
                    User.status == 'active'
                ).first()
                if super_admin:
                    recipients.append(super_admin)
                
                # Add creator themselves for confirmation
                if creator:
                    recipients.append(creator)
            
            # Remove duplicates
            unique_recipients = []
            seen_ids = set()
            for r in recipients:
                if r.id not in seen_ids:
                    unique_recipients.append(r)
                    seen_ids.add(r.id)
            recipients = unique_recipients
            
            print(f"🔔 Found {len(recipients)} recipients for deal notification")
            logger.info(f"Found {len(recipients)} recipients for deal notification")
            
            for recipient in recipients:
                print(f"🔔 Creating notification for user: {recipient.email} (role: {recipient.user_role})")
                logger.info(f"Creating notification for user: {recipient.email} (role: {recipient.user_role})")
                NotificationService._create_notification(
                    db=db,
                    user_id=recipient.id,
                    company_id=company_id,
                    title="New Deal Created",
                    message=f"{creator_name} created a new deal: {deal_title} (${deal_value:,.2f})",
                    notification_type=NotificationType.SUCCESS,
                    link=f"/deals/{deal_id}"
                )
            
            print(f"🔔 Committing notifications to database...")
            db.commit()
            print(f"🔔 SUCCESS: Notified {len(recipients)} users about new deal: {deal_title}")
            logger.info(f"Notified {len(recipients)} users about new deal: {deal_title}")
        except Exception as e:
            print(f"❌ ERROR in notify_deal_created: {e}")
            import traceback
            print(f"❌ Traceback: {traceback.format_exc()}")
            logger.error(f"Error in notify_deal_created: {e}")
    
    @staticmethod
    def notify_deal_updated(
        db: Session,
        deal_id: uuid.UUID,
        deal_title: str,
        updater_id: uuid.UUID,
        updater_name: str,
        company_id: uuid.UUID,
        changes: str
    ):
        """Notify admins and managers when a deal is updated"""
        recipients = NotificationService._get_admins_and_managers(db, company_id, exclude_user_id=updater_id)
        
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="Deal Updated",
                message=f"{updater_name} updated deal: {deal_title} - {changes}",
                notification_type=NotificationType.INFO,
                link=f"/deals/{deal_id}"
            )
        
        db.commit()
    
    @staticmethod
    def notify_deal_stage_changed(
        db: Session,
        deal_id: uuid.UUID,
        deal_title: str,
        updater_id: uuid.UUID,
        updater_name: str,
        company_id: uuid.UUID,
        old_stage: str,
        new_stage: str
    ):
        """Notify admins and managers when a deal stage changes"""
        recipients = NotificationService._get_admins_and_managers(db, company_id, exclude_user_id=updater_id)
        
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="Deal Stage Changed",
                message=f"{updater_name} moved deal '{deal_title}' from {old_stage} to {new_stage}",
                notification_type=NotificationType.INFO,
                link=f"/deals/{deal_id}"
            )
        
        db.commit()
    
    @staticmethod
    def notify_contact_created(
        db: Session,
        contact_id: uuid.UUID,
        contact_name: str,
        creator_id: uuid.UUID,
        creator_name: str,
        company_id: uuid.UUID
    ):
        """Notify admins when a contact is created"""
        recipients = NotificationService._get_company_admins(db, company_id, exclude_user_id=creator_id)
        
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="New Contact Created",
                message=f"{creator_name} created a new contact: {contact_name}",
                notification_type=NotificationType.SUCCESS,
                link=f"/contacts/{contact_id}"
            )
        
        db.commit()
    
    @staticmethod
    def notify_pipeline_created(
        db: Session,
        pipeline_id: uuid.UUID,
        pipeline_name: str,
        creator_id: uuid.UUID,
        creator_name: str,
        company_id: uuid.UUID
    ):
        """Notify admins when a pipeline is created"""
        recipients = NotificationService._get_company_admins(db, company_id, exclude_user_id=creator_id)
        
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="New Pipeline Created",
                message=f"{creator_name} created a new pipeline: {pipeline_name}",
                notification_type=NotificationType.SUCCESS,
                link=f"/settings?tab=pipelines"
            )
        
        db.commit()
    
    @staticmethod
    def notify_quote_created(
        db: Session,
        quote_id: uuid.UUID,
        quote_title: str,
        creator_id: uuid.UUID,
        creator_name: str,
        company_id: uuid.UUID,
        quote_amount: float
    ):
        """Notify admins when a quote is created"""
        recipients = NotificationService._get_company_admins(db, company_id, exclude_user_id=creator_id)
        
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="New Quote Created",
                message=f"{creator_name} created a new quote: {quote_title} (${quote_amount:,.2f})",
                notification_type=NotificationType.SUCCESS,
                link=f"/quotes/{quote_id}"
            )
        
        db.commit()
    
    @staticmethod
    def notify_activity_created(
        db: Session,
        activity_id: uuid.UUID,
        activity_type: str,
        activity_subject: str,
        creator_id: uuid.UUID,
        creator_name: str,
        company_id: uuid.UUID
    ):
        """Notify admins when an activity is created"""
        recipients = NotificationService._get_company_admins(db, company_id, exclude_user_id=creator_id)
        
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title=f"New {activity_type.title()} Activity",
                message=f"{creator_name} created a new {activity_type}: {activity_subject}",
                notification_type=NotificationType.INFO,
                link=f"/activities/{activity_id}"
            )
        
        db.commit()
    
    @staticmethod
    def notify_email_sent(
        db: Session,
        creator_id: uuid.UUID,
        creator_name: str,
        company_id: uuid.UUID,
        recipient_email: str,
        subject: str
    ):
        """Notify admins when an email is sent"""
        recipients = NotificationService._get_company_admins(db, company_id, exclude_user_id=creator_id)
        
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="Email Sent",
                message=f"{creator_name} sent an email to {recipient_email}: {subject}",
                notification_type=NotificationType.INFO
            )
        
        db.commit()
    
    @staticmethod
    def notify_sms_sent(
        db: Session,
        creator_id: uuid.UUID,
        creator_name: str,
        company_id: uuid.UUID,
        recipient_phone: str
    ):
        """Notify admins when an SMS is sent"""
        recipients = NotificationService._get_company_admins(db, company_id, exclude_user_id=creator_id)
        
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="SMS Sent",
                message=f"{creator_name} sent an SMS to {recipient_phone}",
                notification_type=NotificationType.INFO
            )
        
        db.commit()
    
    @staticmethod
    def notify_call_made(
        db: Session,
        creator_id: uuid.UUID,
        creator_name: str,
        company_id: uuid.UUID,
        recipient_phone: str,
        duration: Optional[int] = None
    ):
        """Notify admins when a call is made"""
        recipients = NotificationService._get_company_admins(db, company_id, exclude_user_id=creator_id)
        
        duration_text = f" ({duration}s)" if duration else ""
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="Call Made",
                message=f"{creator_name} made a call to {recipient_phone}{duration_text}",
                notification_type=NotificationType.INFO
            )
        
        db.commit()
    
    @staticmethod
    def notify_file_uploaded(
        db: Session,
        file_name: str,
        uploader_id: uuid.UUID,
        uploader_name: str,
        company_id: uuid.UUID,
        entity_type: str,
        entity_id: uuid.UUID
    ):
        """Notify admins when a file is uploaded"""
        recipients = NotificationService._get_company_admins(db, company_id, exclude_user_id=uploader_id)
        
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="File Uploaded",
                message=f"{uploader_name} uploaded a file: {file_name} to {entity_type}",
                notification_type=NotificationType.INFO
            )
        
        db.commit()
    
    @staticmethod
    def notify_workflow_created(
        db: Session,
        workflow_id: uuid.UUID,
        workflow_name: str,
        creator_id: uuid.UUID,
        creator_name: str,
        company_id: uuid.UUID
    ):
        """Notify admins when a workflow is created"""
        recipients = NotificationService._get_company_admins(db, company_id, exclude_user_id=creator_id)
        
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="New Workflow Created",
                message=f"{creator_name} created a new workflow: {workflow_name}",
                notification_type=NotificationType.SUCCESS,
                link=f"/workflows/{workflow_id}"
            )
        
        db.commit()
    
    @staticmethod
    def notify_template_created(
        db: Session,
        template_id: uuid.UUID,
        template_name: str,
        template_type: str,
        creator_id: uuid.UUID,
        creator_name: str,
        company_id: uuid.UUID
    ):
        """Notify admins when a template is created"""
        recipients = NotificationService._get_company_admins(db, company_id, exclude_user_id=creator_id)
        
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title=f"New {template_type.title()} Template Created",
                message=f"{creator_name} created a new {template_type} template: {template_name}",
                notification_type=NotificationType.SUCCESS
            )
        
        db.commit()
    
    @staticmethod
    def notify_support_ticket_created(
        db: Session,
        ticket_id: uuid.UUID,
        ticket_title: str,
        creator_id: uuid.UUID,
        creator_name: str,
        company_id: uuid.UUID,
        priority: str
    ):
        """Notify admins when a support ticket is created"""
        recipients = NotificationService._get_company_admins(db, company_id, exclude_user_id=creator_id)
        
        notification_type = NotificationType.WARNING if priority in ['high', 'urgent'] else NotificationType.INFO
        
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title=f"New Support Ticket ({priority.upper()})",
                message=f"{creator_name} created a support ticket: {ticket_title}",
                notification_type=notification_type,
                link=f"/support/tickets/{ticket_id}"
            )
        
        db.commit()
    
    @staticmethod
    def notify_user_role_changed(
        db: Session,
        target_user_id: uuid.UUID,
        target_user_name: str,
        old_role: str,
        new_role: str,
        changer_id: uuid.UUID,
        changer_name: str,
        company_id: uuid.UUID
    ):
        """Notify admins and the user when a user role is changed"""
        # Notify admins
        recipients = NotificationService._get_company_admins(db, company_id, exclude_user_id=changer_id)
        
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="User Role Changed",
                message=f"{changer_name} changed {target_user_name}'s role from {old_role} to {new_role}",
                notification_type=NotificationType.WARNING,
                link=f"/users/{target_user_id}"
            )
        
        # Notify the user whose role was changed
        NotificationService._create_notification(
            db=db,
            user_id=target_user_id,
            company_id=company_id,
            title="Your Role Has Been Changed",
            message=f"Your role has been changed from {old_role} to {new_role} by {changer_name}",
            notification_type=NotificationType.WARNING
        )
        
        db.commit()
    
    @staticmethod
    def notify_custom_field_added(
        db: Session,
        field_name: str,
        entity_type: str,
        creator_id: uuid.UUID,
        creator_name: str,
        company_id: uuid.UUID
    ):
        """Notify admins when a custom field is added"""
        recipients = NotificationService._get_company_admins(db, company_id, exclude_user_id=creator_id)
        
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="Custom Field Added",
                message=f"{creator_name} added a custom field '{field_name}' to {entity_type}",
                notification_type=NotificationType.INFO,
                link=f"/settings?tab=custom-fields"
            )
        
        db.commit()
    
    @staticmethod
    def notify_company_created(
        db: Session,
        company_id: uuid.UUID,
        company_name: str,
        creator_id: uuid.UUID,
        creator_name: str
    ):
        """Notify all super admins when a new company is created"""
        recipients = NotificationService._get_super_admins(db, exclude_user_id=creator_id)
        
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=recipient.company_id,
                title="New Company Created",
                message=f"{creator_name} created a new company: {company_name}",
                notification_type=NotificationType.SUCCESS,
                link=f"/admin/companies/{company_id}"
            )
        
        db.commit()
    
    @staticmethod
    def notify_user_created(
        db: Session,
        new_user_id: uuid.UUID,
        new_user_name: str,
        new_user_role: str,
        creator_id: uuid.UUID,
        creator_name: str,
        company_id: uuid.UUID
    ):
        """Notify admins when a new user is created"""
        recipients = NotificationService._get_company_admins(db, company_id, exclude_user_id=creator_id)
        
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="New User Created",
                message=f"{creator_name} created a new user: {new_user_name} ({new_user_role})",
                notification_type=NotificationType.SUCCESS,
                link=f"/users/{new_user_id}"
            )
        
        db.commit()
    
    # ==================== DELETION NOTIFICATIONS ====================
    
    @staticmethod
    def notify_deal_deleted(
        db: Session,
        deal_title: str,
        deleter_id: uuid.UUID,
        deleter_name: str,
        company_id: uuid.UUID
    ):
        """Notify when a deal is deleted"""
        from ..models.users import User
        deleter = db.query(User).filter(User.id == deleter_id).first()
        deleter_role = deleter.user_role if deleter else None
        
        recipients = []
        if deleter_role == 'super_admin':
            recipients = NotificationService._get_all_company_users(db, company_id)
        elif deleter_role == 'company_admin':
            recipients = NotificationService._get_all_company_users(db, company_id)
            super_admin = db.query(User).filter(
                User.user_role == 'super_admin',
                User.is_deleted == False,
                User.status == 'active'
            ).first()
            if super_admin and super_admin.id not in [r.id for r in recipients]:
                recipients.append(super_admin)
        else:
            company_admin = db.query(User).filter(
                User.company_id == company_id,
                User.user_role == 'company_admin',
                User.is_deleted == False,
                User.status == 'active'
            ).first()
            if company_admin:
                recipients.append(company_admin)
            super_admin = db.query(User).filter(
                User.user_role == 'super_admin',
                User.is_deleted == False,
                User.status == 'active'
            ).first()
            if super_admin:
                recipients.append(super_admin)
            if deleter:
                recipients.append(deleter)
        
        # Remove duplicates
        unique_recipients = []
        seen_ids = set()
        for r in recipients:
            if r.id not in seen_ids:
                unique_recipients.append(r)
                seen_ids.add(r.id)
        
        for recipient in unique_recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="Deal Deleted",
                message=f"{deleter_name} deleted deal: {deal_title}",
                notification_type=NotificationType.WARNING,
                link="/deals"
            )
        db.commit()
    
    @staticmethod
    def notify_contact_deleted(
        db: Session,
        contact_name: str,
        deleter_id: uuid.UUID,
        deleter_name: str,
        company_id: uuid.UUID
    ):
        """Notify when a contact is deleted"""
        recipients = NotificationService._get_admins_and_managers(db, company_id, exclude_user_id=deleter_id)
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="Contact Deleted",
                message=f"{deleter_name} deleted contact: {contact_name}",
                notification_type=NotificationType.WARNING,
                link="/contacts"
            )
        db.commit()
    
    @staticmethod
    def notify_pipeline_deleted(
        db: Session,
        pipeline_name: str,
        deleter_id: uuid.UUID,
        deleter_name: str,
        company_id: uuid.UUID
    ):
        """Notify when a pipeline is deleted"""
        recipients = NotificationService._get_company_admins(db, company_id, exclude_user_id=deleter_id)
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="Pipeline Deleted",
                message=f"{deleter_name} deleted pipeline: {pipeline_name}",
                notification_type=NotificationType.WARNING,
                link="/pipeline-settings"
            )
        db.commit()
    
    @staticmethod
    def notify_quote_deleted(
        db: Session,
        quote_title: str,
        deleter_id: uuid.UUID,
        deleter_name: str,
        company_id: uuid.UUID
    ):
        """Notify when a quote is deleted"""
        recipients = NotificationService._get_admins_and_managers(db, company_id, exclude_user_id=deleter_id)
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="Quote Deleted",
                message=f"{deleter_name} deleted quote: {quote_title}",
                notification_type=NotificationType.WARNING,
                link="/quotes"
            )
        db.commit()
    
    @staticmethod
    def notify_workflow_deleted(
        db: Session,
        workflow_name: str,
        deleter_id: uuid.UUID,
        deleter_name: str,
        company_id: uuid.UUID
    ):
        """Notify when a workflow is deleted"""
        recipients = NotificationService._get_company_admins(db, company_id, exclude_user_id=deleter_id)
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="Workflow Deleted",
                message=f"{deleter_name} deleted workflow: {workflow_name}",
                notification_type=NotificationType.WARNING,
                link="/workflows"
            )
        db.commit()
    
    @staticmethod
    def notify_file_deleted(
        db: Session,
        file_name: str,
        deleter_id: uuid.UUID,
        deleter_name: str,
        company_id: uuid.UUID
    ):
        """Notify when a file is deleted"""
        recipients = NotificationService._get_admins_and_managers(db, company_id, exclude_user_id=deleter_id)
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="File Deleted",
                message=f"{deleter_name} deleted file: {file_name}",
                notification_type=NotificationType.WARNING,
                link="/files"
            )
        db.commit()
    
    @staticmethod
    def notify_activity_deleted(
        db: Session,
        activity_type: str,
        deleter_id: uuid.UUID,
        deleter_name: str,
        company_id: uuid.UUID
    ):
        """Notify when an activity is deleted"""
        recipients = NotificationService._get_admins_and_managers(db, company_id, exclude_user_id=deleter_id)
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="Activity Deleted",
                message=f"{deleter_name} deleted a {activity_type} activity",
                notification_type=NotificationType.WARNING,
                link="/activities"
            )
        db.commit()
    
    @staticmethod
    def notify_user_deleted(
        db: Session,
        deleted_user_name: str,
        deleter_id: uuid.UUID,
        deleter_name: str,
        company_id: uuid.UUID
    ):
        """Notify when a user is deleted"""
        recipients = NotificationService._get_company_admins(db, company_id, exclude_user_id=deleter_id)
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="User Deleted",
                message=f"{deleter_name} deleted user: {deleted_user_name}",
                notification_type=NotificationType.WARNING,
                link="/users"
            )
        db.commit()
    
    @staticmethod
    def notify_support_ticket_deleted(
        db: Session,
        ticket_title: str,
        deleter_id: uuid.UUID,
        deleter_name: str,
        company_id: uuid.UUID
    ):
        """Notify when a support ticket is deleted"""
        recipients = NotificationService._get_company_admins(db, company_id, exclude_user_id=deleter_id)
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=company_id,
                title="Support Ticket Deleted",
                message=f"{deleter_name} deleted support ticket: {ticket_title}",
                notification_type=NotificationType.WARNING,
                link="/support-tickets"
            )
        db.commit()
    
    @staticmethod
    def notify_company_deleted(
        db: Session,
        company_name: str,
        deleter_id: uuid.UUID,
        deleter_name: str
    ):
        """Notify super admins when a company is deleted"""
        recipients = NotificationService._get_super_admins(db, exclude_user_id=deleter_id)
        for recipient in recipients:
            NotificationService._create_notification(
                db=db,
                user_id=recipient.id,
                company_id=recipient.company_id,
                title="Company Deleted",
                message=f"{deleter_name} deleted company: {company_name}",
                notification_type=NotificationType.ERROR,
                link="/companies"
            )
        db.commit()
