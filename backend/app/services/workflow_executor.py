"""
Workflow Execution Engine
Handles workflow execution, action processing, and logging
"""

from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any, List, Optional
import uuid
import logging

from app.models.workflows import Workflow, WorkflowExecution, WorkflowStatus, WorkflowTrigger
from app.services.workflow_actions import ActionExecutor

logger = logging.getLogger(__name__)


class WorkflowExecutor:
    """Main workflow execution engine"""
    
    def __init__(self, db: Session):
        self.db = db
        self.action_executor = ActionExecutor(db)
    
    async def trigger_workflows(
        self,
        trigger_type: WorkflowTrigger,
        trigger_data: Dict[str, Any],
        user_id: Optional[uuid.UUID] = None
    ) -> List[WorkflowExecution]:
        """
        Find and execute all active workflows matching the trigger
        
        Args:
            trigger_type: The type of trigger that occurred
            trigger_data: Data associated with the trigger event
            user_id: Optional user ID to filter workflows
            
        Returns:
            List of workflow executions
        """
        try:
            # Find active workflows with this trigger
            query = self.db.query(Workflow).filter(
                Workflow.trigger_type == trigger_type,
                Workflow.status == WorkflowStatus.ACTIVE,
                Workflow.is_deleted == False
            )
            
            # Optionally filter by user
            if user_id:
                query = query.filter(Workflow.owner_id == user_id)
            
            workflows = query.all()
            
            logger.info(f"Found {len(workflows)} workflows for trigger {trigger_type.value}")
            
            # Execute each workflow
            executions = []
            for workflow in workflows:
                try:
                    execution = await self.execute_workflow(workflow, trigger_data)
                    executions.append(execution)
                except Exception as e:
                    logger.error(f"Failed to execute workflow {workflow.id}: {str(e)}")
                    # Create failed execution log
                    execution = self._create_failed_execution(workflow, trigger_data, str(e))
                    executions.append(execution)
            
            return executions
            
        except Exception as e:
            logger.error(f"Error triggering workflows: {str(e)}")
            return []
    
    async def execute_workflow(
        self,
        workflow: Workflow,
        trigger_data: Dict[str, Any]
    ) -> WorkflowExecution:
        """
        Execute a single workflow
        
        Args:
            workflow: The workflow to execute
            trigger_data: Data that triggered the workflow
            
        Returns:
            WorkflowExecution record
        """
        start_time = datetime.utcnow()
        
        # Create execution record
        execution = WorkflowExecution(
            workflow_id=workflow.id,
            status='running',
            trigger_data=trigger_data,
            started_at=start_time,
            actions_executed=[],
            success_count=0,
            failure_count=0
        )
        self.db.add(execution)
        self.db.commit()
        
        logger.info(f"Executing workflow {workflow.id}: {workflow.name}")
        
        try:
            # Check if workflow has reached max executions
            if workflow.max_executions and workflow.execution_count >= workflow.max_executions:
                raise Exception(f"Workflow has reached maximum executions ({workflow.max_executions})")
            
            # Execute each action in sequence
            actions_executed = []
            for action in workflow.actions:
                try:
                    result = await self.action_executor.execute_action(
                        action_type=action.get('type'),
                        action_config=action.get('config', {}),
                        trigger_data=trigger_data,
                        workflow=workflow
                    )
                    
                    actions_executed.append({
                        'action': action,
                        'result': result,
                        'status': 'success',
                        'timestamp': datetime.utcnow().isoformat()
                    })
                    execution.success_count += 1
                    
                except Exception as action_error:
                    logger.error(f"Action failed: {str(action_error)}")
                    actions_executed.append({
                        'action': action,
                        'error': str(action_error),
                        'status': 'failed',
                        'timestamp': datetime.utcnow().isoformat()
                    })
                    execution.failure_count += 1
            
            # Update execution record
            end_time = datetime.utcnow()
            execution.actions_executed = actions_executed
            execution.completed_at = end_time
            execution.duration_seconds = int((end_time - start_time).total_seconds())
            execution.status = 'success' if execution.failure_count == 0 else 'partial'
            
            # Update workflow stats
            workflow.execution_count += 1
            workflow.last_executed_at = end_time
            
            self.db.commit()
            
            logger.info(f"Workflow {workflow.id} completed: {execution.success_count} success, {execution.failure_count} failed")
            
            return execution
            
        except Exception as e:
            logger.error(f"Workflow execution failed: {str(e)}")
            
            # Update execution as failed
            execution.status = 'failed'
            execution.error_message = str(e)
            execution.completed_at = datetime.utcnow()
            execution.duration_seconds = int((datetime.utcnow() - start_time).total_seconds())
            
            self.db.commit()
            
            return execution
    
    def _create_failed_execution(
        self,
        workflow: Workflow,
        trigger_data: Dict[str, Any],
        error_message: str
    ) -> WorkflowExecution:
        """Create a failed execution record"""
        execution = WorkflowExecution(
            workflow_id=workflow.id,
            status='failed',
            trigger_data=trigger_data,
            error_message=error_message,
            started_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
            duration_seconds=0,
            success_count=0,
            failure_count=0
        )
        self.db.add(execution)
        self.db.commit()
        return execution
    
    async def execute_workflow_manually(
        self,
        workflow_id: uuid.UUID,
        trigger_data: Optional[Dict[str, Any]] = None
    ) -> WorkflowExecution:
        """
        Manually execute a workflow (for testing)
        
        Args:
            workflow_id: ID of workflow to execute
            trigger_data: Optional trigger data
            
        Returns:
            WorkflowExecution record
        """
        workflow = self.db.query(Workflow).filter(
            Workflow.id == workflow_id,
            Workflow.is_deleted == False
        ).first()
        
        if not workflow:
            raise Exception("Workflow not found")
        
        if not trigger_data:
            trigger_data = {"manual_trigger": True, "timestamp": datetime.utcnow().isoformat()}
        
        return await self.execute_workflow(workflow, trigger_data)
