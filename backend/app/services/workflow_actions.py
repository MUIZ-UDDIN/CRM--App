"""
Workflow Action Handlers
Implements different action types that workflows can execute
"""

from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import uuid
import logging
import re

from app.models.workflows import Workflow
from app.models.activities import Activity, ActivityType, ActivityStatus
from app.models.contacts import Contact
from app.models.deals import Deal

logger = logging.getLogger(__name__)


class ActionExecutor:
    """Executes different types of workflow actions"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def execute_action(
        self,
        action_type: str,
        action_config: Dict[str, Any],
        trigger_data: Dict[str, Any],
        workflow: Workflow
    ) -> Dict[str, Any]:
        """
        Execute a workflow action based on its type
        
        Args:
            action_type: Type of action to execute
            action_config: Configuration for the action
            trigger_data: Data from the trigger event
            workflow: The workflow being executed
            
        Returns:
            Result of the action execution
        """
        logger.info(f"Executing action: {action_type}")
        
        # Replace variables in config with actual data
        resolved_config = self._resolve_variables(action_config, trigger_data, workflow)
        
        # Route to appropriate handler
        if action_type == 'send_email':
            return await self._send_email(resolved_config, trigger_data)
        elif action_type == 'create_task':
            return await self._create_task(resolved_config, trigger_data, workflow)
        elif action_type == 'update_field':
            return await self._update_field(resolved_config, trigger_data)
        elif action_type == 'send_notification':
            return await self._send_notification(resolved_config, trigger_data)
        elif action_type == 'create_deal':
            return await self._create_deal(resolved_config, trigger_data, workflow)
        elif action_type == 'add_tag':
            return await self._add_tag(resolved_config, trigger_data)
        elif action_type == 'webhook':
            return await self._call_webhook(resolved_config, trigger_data)
        elif action_type == 'wait':
            return await self._wait(resolved_config)
        else:
            raise Exception(f"Unknown action type: {action_type}")
    
    def _resolve_variables(
        self,
        config: Dict[str, Any],
        trigger_data: Dict[str, Any],
        workflow: Workflow
    ) -> Dict[str, Any]:
        """
        Replace template variables in config with actual values
        Example: {{contact.email}} -> john@example.com
        """
        import json
        config_str = json.dumps(config)
        
        # Replace trigger data variables
        for key, value in trigger_data.items():
            if isinstance(value, str):
                config_str = config_str.replace(f"{{{{{key}}}}}", value)
        
        # Replace workflow variables
        config_str = config_str.replace("{{workflow.name}}", workflow.name)
        config_str = config_str.replace("{{workflow.id}}", str(workflow.id))
        
        return json.loads(config_str)
    
    async def _send_email(
        self,
        config: Dict[str, Any],
        trigger_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Send an email
        Note: This is a placeholder. You need to integrate with an email service
        like SendGrid, AWS SES, or SMTP
        """
        to_email = config.get('to')
        subject = config.get('subject')
        body = config.get('body')
        template = config.get('template')
        
        logger.info(f"Sending email to {to_email}: {subject}")
        
        # TODO: Integrate with actual email service
        # Example with SendGrid:
        # from sendgrid import SendGridAPIClient
        # from sendgrid.helpers.mail import Mail
        # 
        # message = Mail(
        #     from_email='noreply@yourcrm.com',
        #     to_emails=to_email,
        #     subject=subject,
        #     html_content=body
        # )
        # sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
        # response = sg.send(message)
        
        # For now, just log it
        return {
            'action': 'send_email',
            'to': to_email,
            'subject': subject,
            'status': 'simulated',
            'message': 'Email sending not configured. Integrate with SendGrid/SES/SMTP.'
        }
    
    async def _create_task(
        self,
        config: Dict[str, Any],
        trigger_data: Dict[str, Any],
        workflow: Workflow
    ) -> Dict[str, Any]:
        """Create a task/activity"""
        title = config.get('title', 'Workflow Task')
        description = config.get('description', '')
        due_date_offset = config.get('due_date', '+1 day')  # e.g., "+3 days", "+1 week"
        assigned_to = config.get('assigned_to')  # user_id
        activity_type = config.get('activity_type', 'task')
        
        # Parse due date
        due_date = self._parse_date_offset(due_date_offset)
        
        # Get contact or deal from trigger data
        contact_id = trigger_data.get('contact_id')
        deal_id = trigger_data.get('deal_id')
        
        # Create activity
        activity = Activity(
            title=title,
            description=description,
            activity_type=ActivityType.TASK,
            status=ActivityStatus.PENDING,
            due_date=due_date,
            owner_id=workflow.owner_id,
            contact_id=uuid.UUID(contact_id) if contact_id else None,
            deal_id=uuid.UUID(deal_id) if deal_id else None
        )
        
        self.db.add(activity)
        self.db.commit()
        
        logger.info(f"Created task: {title}")
        
        return {
            'action': 'create_task',
            'task_id': str(activity.id),
            'title': title,
            'due_date': due_date.isoformat() if due_date else None,
            'status': 'created'
        }
    
    async def _update_field(
        self,
        config: Dict[str, Any],
        trigger_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a field on a contact or deal"""
        object_type = config.get('object')  # 'contact' or 'deal'
        field_name = config.get('field')
        field_value = config.get('value')
        object_id = trigger_data.get(f'{object_type}_id')
        
        if not object_id:
            raise Exception(f"No {object_type}_id in trigger data")
        
        if object_type == 'contact':
            obj = self.db.query(Contact).filter(Contact.id == uuid.UUID(object_id)).first()
        elif object_type == 'deal':
            obj = self.db.query(Deal).filter(Deal.id == uuid.UUID(object_id)).first()
        else:
            raise Exception(f"Unknown object type: {object_type}")
        
        if not obj:
            raise Exception(f"{object_type} not found")
        
        # Update the field
        if hasattr(obj, field_name):
            setattr(obj, field_name, field_value)
            self.db.commit()
            logger.info(f"Updated {object_type}.{field_name} = {field_value}")
        else:
            raise Exception(f"Field {field_name} not found on {object_type}")
        
        return {
            'action': 'update_field',
            'object_type': object_type,
            'object_id': object_id,
            'field': field_name,
            'value': field_value,
            'status': 'updated'
        }
    
    async def _send_notification(
        self,
        config: Dict[str, Any],
        trigger_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send a notification to a user"""
        user_id = config.get('user_id')
        message = config.get('message')
        notification_type = config.get('type', 'info')
        
        logger.info(f"Sending notification to user {user_id}: {message}")
        
        # TODO: Implement notification system
        # This could be:
        # - In-app notifications
        # - Push notifications
        # - Slack/Teams messages
        # - SMS
        
        return {
            'action': 'send_notification',
            'user_id': user_id,
            'message': message,
            'type': notification_type,
            'status': 'simulated',
            'note': 'Notification system not implemented yet'
        }
    
    async def _create_deal(
        self,
        config: Dict[str, Any],
        trigger_data: Dict[str, Any],
        workflow: Workflow
    ) -> Dict[str, Any]:
        """Create a new deal"""
        title = config.get('title', 'New Deal')
        value = config.get('value', 0)
        stage = config.get('stage', 'lead')
        contact_id = trigger_data.get('contact_id')
        
        deal = Deal(
            title=title,
            value=value,
            stage=stage,
            owner_id=workflow.owner_id,
            contact_id=uuid.UUID(contact_id) if contact_id else None
        )
        
        self.db.add(deal)
        self.db.commit()
        
        logger.info(f"Created deal: {title}")
        
        return {
            'action': 'create_deal',
            'deal_id': str(deal.id),
            'title': title,
            'value': value,
            'status': 'created'
        }
    
    async def _add_tag(
        self,
        config: Dict[str, Any],
        trigger_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Add a tag to a contact or deal"""
        object_type = config.get('object')
        tag = config.get('tag')
        object_id = trigger_data.get(f'{object_type}_id')
        
        logger.info(f"Adding tag '{tag}' to {object_type} {object_id}")
        
        # TODO: Implement tagging system
        # This requires a tags table or tags field on objects
        
        return {
            'action': 'add_tag',
            'object_type': object_type,
            'object_id': object_id,
            'tag': tag,
            'status': 'simulated',
            'note': 'Tagging system not implemented yet'
        }
    
    async def _call_webhook(
        self,
        config: Dict[str, Any],
        trigger_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Call an external webhook"""
        url = config.get('url')
        method = config.get('method', 'POST')
        headers = config.get('headers', {})
        body = config.get('body', trigger_data)
        
        logger.info(f"Calling webhook: {method} {url}")
        
        # TODO: Implement webhook calls
        # import httpx
        # async with httpx.AsyncClient() as client:
        #     response = await client.request(
        #         method=method,
        #         url=url,
        #         headers=headers,
        #         json=body
        #     )
        #     return {
        #         'action': 'webhook',
        #         'url': url,
        #         'status_code': response.status_code,
        #         'response': response.text
        #     }
        
        return {
            'action': 'webhook',
            'url': url,
            'method': method,
            'status': 'simulated',
            'note': 'Webhook calls not implemented yet. Install httpx and uncomment code.'
        }
    
    async def _wait(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Wait/delay before next action"""
        duration = config.get('duration', '1 minute')
        
        logger.info(f"Wait action: {duration}")
        
        # For now, just log it
        # In a real implementation, you'd use a task queue like Celery
        # to schedule the next action
        
        return {
            'action': 'wait',
            'duration': duration,
            'status': 'simulated',
            'note': 'Wait/delay requires task queue (Celery/RQ)'
        }
    
    def _parse_date_offset(self, offset_str: str) -> Optional[datetime]:
        """
        Parse date offset string like "+3 days", "+1 week"
        Returns datetime or None
        """
        if not offset_str:
            return None
        
        match = re.match(r'([+-])(\d+)\s*(day|days|week|weeks|hour|hours)', offset_str.lower())
        if not match:
            return None
        
        sign, amount, unit = match.groups()
        amount = int(amount)
        
        if sign == '-':
            amount = -amount
        
        if 'day' in unit:
            delta = timedelta(days=amount)
        elif 'week' in unit:
            delta = timedelta(weeks=amount)
        elif 'hour' in unit:
            delta = timedelta(hours=amount)
        else:
            return None
        
        return datetime.utcnow() + delta
