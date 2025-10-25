"""
Scheduled Workflow Service
Runs workflows with 'scheduled' trigger at specified intervals
"""

import asyncio
import threading
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from loguru import logger

from app.core.database import SessionLocal
from app.models.workflows import Workflow, WorkflowStatus, WorkflowTrigger
from app.services.workflow_executor import WorkflowExecutor


class WorkflowScheduler:
    """Background service to run scheduled workflows"""
    
    def __init__(self):
        self.running = False
        self.thread = None
    
    def start(self):
        """Start the scheduler in a background thread"""
        if self.running:
            logger.warning("Workflow scheduler already running")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        logger.info("✅ Workflow scheduler started")
    
    def stop(self):
        """Stop the scheduler"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("Workflow scheduler stopped")
    
    def _run_scheduler(self):
        """Main scheduler loop"""
        while self.running:
            try:
                self._check_scheduled_workflows()
            except Exception as e:
                logger.error(f"Error in workflow scheduler: {e}")
            
            # Check every 60 seconds
            for _ in range(60):
                if not self.running:
                    break
                threading.Event().wait(1)
    
    def _check_scheduled_workflows(self):
        """Check and trigger scheduled workflows"""
        db = SessionLocal()
        try:
            # Find active workflows with scheduled trigger
            workflows = db.query(Workflow).filter(
                Workflow.trigger_type == WorkflowTrigger.SCHEDULED,
                Workflow.status == WorkflowStatus.ACTIVE,
                Workflow.is_deleted == False
            ).all()
            
            if not workflows:
                return
            
            logger.info(f"🔍 Found {len(workflows)} scheduled workflows to check")
            
            for workflow in workflows:
                try:
                    # Check if workflow should run now
                    if self._should_run_workflow(workflow):
                        self._trigger_workflow(workflow, db)
                except Exception as e:
                    logger.error(f"Error processing scheduled workflow {workflow.id}: {e}")
        
        finally:
            db.close()
    
    def _should_run_workflow(self, workflow: Workflow) -> bool:
        """Determine if a scheduled workflow should run now"""
        # For now, run every hour if no last_executed_at or last run was > 1 hour ago
        # In production, you'd check workflow.schedule_config for cron expression
        
        if not workflow.last_executed_at:
            return True
        
        # Run if last run was more than 1 hour ago
        time_since_last_run = datetime.utcnow() - workflow.last_executed_at
        return time_since_last_run > timedelta(hours=1)
    
    def _trigger_workflow(self, workflow: Workflow, db: Session):
        """Trigger a scheduled workflow"""
        print(f"🔥 Triggering scheduled workflow: {workflow.name}")
        
        # Create new DB session for workflow execution
        workflow_db = SessionLocal()
        
        def run_workflow():
            try:
                print(f"🔥 Starting workflow trigger for scheduled: {workflow.name}")
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                executor = WorkflowExecutor(workflow_db)
                trigger_data = {
                    "workflow_id": str(workflow.id),
                    "workflow_name": workflow.name,
                    "scheduled_time": datetime.utcnow().isoformat(),
                    "trigger_type": "scheduled"
                }
                
                print(f"🔥 Trigger data: {trigger_data}")
                result = loop.run_until_complete(executor.trigger_workflows(
                    WorkflowTrigger.SCHEDULED,
                    trigger_data,
                    str(workflow.owner_id)
                ))
                print(f"🔥 Scheduled workflow completed, executions: {len(result) if result else 0}")
                
                # Update last_executed_at
                workflow.last_executed_at = datetime.utcnow()
                db.commit()
                
                loop.close()
            except Exception as e:
                print(f"❌ Scheduled workflow execution error: {e}")
                import traceback
                traceback.print_exc()
            finally:
                workflow_db.close()
        
        # Run in background thread
        thread = threading.Thread(target=run_workflow, daemon=True)
        thread.start()


# Global scheduler instance
_scheduler = None


def get_scheduler() -> WorkflowScheduler:
    """Get the global scheduler instance"""
    global _scheduler
    if _scheduler is None:
        _scheduler = WorkflowScheduler()
    return _scheduler


def start_scheduler():
    """Start the global scheduler"""
    scheduler = get_scheduler()
    scheduler.start()


def stop_scheduler():
    """Stop the global scheduler"""
    scheduler = get_scheduler()
    scheduler.stop()
