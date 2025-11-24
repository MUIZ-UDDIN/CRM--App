"""
Deals API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
import uuid

from ..core.security import get_current_active_user
from ..core.database import get_db
from ..models.deals import Deal as DealModel, DealStatus
from ..models.users import User
from ..middleware.tenant import get_tenant_context
from ..middleware.permissions import has_permission
from ..models.permissions import Permission

router = APIRouter()


class DealCreate(BaseModel):
    title: str
    value: float
    company: Optional[str] = None
    contact: Optional[str] = None  
    stage_id: str
    pipeline_id: Optional[str] = None  # Optional - will use default pipeline if not provided
    description: Optional[str] = None
    expected_close_date: Optional[datetime] = None
    status: Optional[str] = 'open'


class DealResponse(BaseModel):
    """Secure response model - only exposes necessary fields"""
    id: str
    title: str
    value: float
    stage_id: str
    pipeline_id: str
    company: Optional[str] = None
    contact: Optional[str] = None
    contact_id: Optional[str] = None
    description: Optional[str] = None
    expected_close_date: Optional[str] = None
    status: str
    company_id: str  # Include for verification
    owner_id: Optional[str] = None  # For assignment functionality
    owner_name: Optional[str] = None  # Display name of owner

    class Config:
        from_attributes = True


class DealCreateResponse(BaseModel):
    """Response for deal creation - minimal fields"""
    id: str
    title: str
    value: float
    stage_id: str
    pipeline_id: str
    company_id: str
    message: str

    class Config:
        from_attributes = True


@router.get("/", response_model=List[DealResponse])
def get_deals(
    stage: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get deals based on user role - Sales Reps see only their own"""
    context = get_tenant_context(current_user)
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = current_user.get('company_id')
    user_team_id = current_user.get('team_id')
    
    if not company_id:
        # Fallback to owner-based if no company
        query = db.query(DealModel).filter(
            and_(
                DealModel.owner_id == user_id,
                DealModel.is_deleted == False
            )
        )
    elif context.is_super_admin():
        # Super admin sees all companies (but typically filtered by company context)
        query = db.query(DealModel).filter(DealModel.is_deleted == False)
    elif has_permission(current_user, Permission.VIEW_COMPANY_DATA):
        # Company Admin sees all company deals
        query = db.query(DealModel).filter(
            and_(
                DealModel.company_id == company_id,
                DealModel.is_deleted == False
            )
        )
    elif has_permission(current_user, Permission.VIEW_TEAM_DATA) and user_team_id:
        # Sales Manager sees only their team's deals
        team_user_ids = [str(u.id) for u in db.query(User).filter(
            User.team_id == user_team_id,
            User.is_deleted == False
        ).all()]
        query = db.query(DealModel).filter(
            and_(
                DealModel.company_id == company_id,
                DealModel.owner_id.in_([uuid.UUID(uid) for uid in team_user_ids]),
                DealModel.is_deleted == False
            )
        )
    else:
        # Sales Reps see ONLY their own deals
        query = db.query(DealModel).filter(
            and_(
                DealModel.company_id == company_id,
                DealModel.owner_id == user_id,
                DealModel.is_deleted == False
            )
        )
    
    if stage:
        query = query.filter(DealModel.stage_id == uuid.UUID(stage))
    
    deals = query.all()
    
    # Return only necessary fields - no internal timestamps or database metadata
    return [
        DealResponse(
            id=str(deal.id),
            title=deal.title,
            value=deal.value,
            stage_id=str(deal.stage_id),
            pipeline_id=str(deal.pipeline_id),
            company=deal.company,
            contact=f"{deal.contact.first_name} {deal.contact.last_name}" if deal.contact else None,
            contact_id=str(deal.contact_id) if deal.contact_id else None,
            description=deal.description,
            expected_close_date=deal.expected_close_date.isoformat() if deal.expected_close_date else None,
            status=deal.status.value if deal.status else 'open',
            company_id=str(deal.company_id),
            owner_id=str(deal.owner_id) if deal.owner_id else None,
            owner_name=f"{deal.owner.first_name} {deal.owner.last_name}" if deal.owner else None
        )
        for deal in deals
    ]


@router.post("/")
async def create_deal(
    deal: DealCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new deal"""
    import logging
    import traceback as tb
    logger = logging.getLogger(__name__)
    print(f"🚀🚀🚀 CREATE_DEAL FUNCTION CALLED - User: {current_user.get('id')}, Deal: {deal.title}")
    logger.info(f"🚀 CREATE_DEAL ENDPOINT CALLED - User: {current_user.get('id')}, Deal: {deal.title}")
    
    from ..models.deals import Pipeline, PipelineStage
    import traceback
    
    try:
        print("Step 1: Parsing user_id...")
        user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
        print(f"Step 1 complete: user_id={user_id}")
    except Exception as e:
        print(f"Error parsing user_id: {e}")
        print(f"Traceback: {tb.format_exc()}")
        raise HTTPException(status_code=400, detail=f"Invalid user ID: {str(e)}")
    
    # Get default pipeline if pipeline_id not provided or invalid
    try:
        pipeline_id = uuid.UUID(deal.pipeline_id) if deal.pipeline_id else None
    except (ValueError, AttributeError):
        pipeline_id = None
    
    if not pipeline_id:
        # Get default pipeline
        default_pipeline = db.query(Pipeline).filter(Pipeline.is_deleted == False).first()
        if not default_pipeline:
            raise HTTPException(status_code=400, detail="No pipeline found. Please create a pipeline first.")
        pipeline_id = default_pipeline.id
    
    # Handle stage_id - accept either UUID or stage name
    try:
        stage_id = uuid.UUID(deal.stage_id)
    except (ValueError, AttributeError):
        # Try to find stage by name (case-insensitive)
        stage_name_map = {
            'qualification': 'Qualification',
            'proposal': 'Proposal',
            'negotiation': 'Negotiation',
            'closed-won': 'Closed Won',
            'closed-lost': 'Closed Lost'
        }
        stage_name = stage_name_map.get(deal.stage_id.lower(), deal.stage_id)
        stage = db.query(PipelineStage).filter(
            and_(
                PipelineStage.pipeline_id == pipeline_id,
                PipelineStage.name == stage_name,
                PipelineStage.is_deleted == False
            )
        ).first()
        
        if not stage:
            raise HTTPException(status_code=400, detail=f"Stage '{deal.stage_id}' not found")
        stage_id = stage.id
    
    try:
        # Check for duplicate deal with same title for this user
        existing_deal = db.query(DealModel).filter(
            and_(
                DealModel.title == deal.title,
                DealModel.owner_id == user_id,
                DealModel.is_deleted == False
            )
        ).first()
        
        if existing_deal:
            raise HTTPException(
                status_code=400, 
                detail=f"A deal with title '{deal.title}' already exists. Please use a different deal title."
            )
        
        # Parse contact_id if provided
        contact_id = None
        if deal.contact:
            try:
                contact_id = uuid.UUID(deal.contact) if deal.contact else None
            except (ValueError, AttributeError):
                pass  # If it's not a UUID, ignore it
        
        # Parse status
        status_map = {
            'open': DealStatus.OPEN,
            'won': DealStatus.WON,
            'lost': DealStatus.LOST,
            'abandoned': DealStatus.ABANDONED
        }
        deal_status = status_map.get(deal.status.lower() if deal.status else 'open', DealStatus.OPEN)
        
        # Get company_id from current user
        company_id = current_user.get('company_id')
        if not company_id:
            raise HTTPException(status_code=400, detail="User must belong to a company to create deals")
        
        new_deal = DealModel(
            title=deal.title,
            value=deal.value,
            stage_id=stage_id,
            pipeline_id=pipeline_id,
            company=deal.company,
            company_id=uuid.UUID(company_id) if isinstance(company_id, str) else company_id,
            contact_id=contact_id,
            description=deal.description,
            expected_close_date=deal.expected_close_date,
            owner_id=user_id,
            status=deal_status,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        print("Step 2: Adding deal to database...")
        db.add(new_deal)
        db.commit()
        db.refresh(new_deal)
        print(f"Step 2 complete: Deal created with ID={new_deal.id}")
        
        # Trigger workflows for deal_created
        try:
            from ..services.workflow_executor import WorkflowExecutor
            from ..models.workflows import WorkflowTrigger
            from ..core.database import SessionLocal
            import asyncio
            import threading
            
            def run_workflow():
                # Create new DB session for this thread
                workflow_db = SessionLocal()
                try:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    executor = WorkflowExecutor(workflow_db)
                    trigger_data = {
                        "deal_id": str(new_deal.id),
                        "deal_title": new_deal.title,
                        "deal_value": new_deal.value,
                        "contact_id": str(new_deal.contact_id) if new_deal.contact_id else None,
                        "owner_id": str(new_deal.owner_id)
                    }
                    loop.run_until_complete(executor.trigger_workflows(
                        WorkflowTrigger.DEAL_CREATED,
                        trigger_data,
                        user_id
                    ))
                    loop.close()
                except Exception as e:
                    print(f"Workflow execution error: {e}")
                finally:
                    workflow_db.close()
            
            # Run in background thread
            thread = threading.Thread(target=run_workflow, daemon=True)
            thread.start()
        except Exception as workflow_error:
            # Don't fail the deal creation if workflows fail
            print(f"Workflow trigger error: {workflow_error}")
        
        print(f"Step 3: Workflows triggered, now sending notifications...")
        logger.info(f"✅ Deal created successfully: {new_deal.id}, now sending notifications...")
        
        # Send notifications
        try:
            print(f"Step 4: Calling NotificationService...")
            logger.info(f"🔔 Attempting to send deal creation notification for deal: {new_deal.id}")
            
            from ..services.notification_service import NotificationService
            from ..models.users import User
            creator = db.query(User).filter(User.id == user_id).first()
            creator_name = f"{creator.first_name} {creator.last_name}" if creator else "Unknown User"
            
            logger.info(f"🔔 Creator: {creator_name}, Company: {new_deal.company_id}")
            
            NotificationService.notify_deal_created(
                db=db,
                deal_id=new_deal.id,
                deal_title=new_deal.title,
                creator_id=user_id,
                creator_name=creator_name,
                company_id=new_deal.company_id,
                deal_value=new_deal.value
            )
            logger.info(f"🔔 Notification sent successfully for deal: {new_deal.title}")
        except Exception as notification_error:
            # Don't fail the deal creation if notifications fail
            import traceback
            logger.error(f"❌ Notification error: {notification_error}")
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            print(f"Notification error: {notification_error}")
        
        # Broadcast creation to all connected clients in the company for real-time sync
        try:
            from ..services.websocket_manager import broadcast_entity_change
            import asyncio
            # Run in background without blocking
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(broadcast_entity_change(
                    company_id=str(new_deal.company_id),
                    entity_type="deal",
                    action="created",
                    entity_id=str(new_deal.id),
                    data={
                        "id": str(new_deal.id),
                        "title": new_deal.title,
                        "value": new_deal.value,
                        "stage_id": str(new_deal.stage_id),
                        "owner_id": str(new_deal.owner_id)
                    }
                ))
                logger.info(f"📡 WebSocket broadcast sent for deal creation: {new_deal.id}")
        except Exception as ws_error:
            logger.error(f"WebSocket broadcast error: {ws_error}")
        
        # Return minimal response - no internal timestamps or sensitive data
        return DealCreateResponse(
            id=str(new_deal.id),
            title=new_deal.title,
            value=new_deal.value,
            stage_id=str(new_deal.stage_id),
            pipeline_id=str(new_deal.pipeline_id),
            company_id=str(new_deal.company_id),
            message="Deal created successfully"
        )
    except HTTPException:
        # Re-raise HTTPException (like duplicate check) without modification
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error creating deal: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail="Failed to create deal. Please check your input and try again.")


@router.get("/{deal_id}")
def get_deal(
    deal_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific deal"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    deal = db.query(DealModel).filter(
        and_(
            DealModel.id == uuid.UUID(deal_id),
            DealModel.owner_id == user_id,
            DealModel.is_deleted == False
        )
    ).first()
    
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    return {
        "id": str(deal.id),
        "title": deal.title,
        "value": deal.value,
        "stage_id": str(deal.stage_id),
        "pipeline_id": str(deal.pipeline_id),
        "company": deal.company,
        "contact": deal.contact_person,
        "description": deal.description,
        "expected_close_date": deal.expected_close_date.isoformat() if deal.expected_close_date else None,
        "created_at": deal.created_at,
        "updated_at": deal.updated_at
    }


@router.patch("/{deal_id}")
async def update_deal(
    deal_id: str,
    deal_data: dict,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a specific deal"""
    import logging
    logger = logging.getLogger(__name__)
    
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    
    logger.info(f"Update deal request - Deal ID: {deal_id}, User: {user_id}, Company: {company_id}, Data: {deal_data}")
    
    # Super Admin can access deals from any company
    if context.is_super_admin():
        deal = db.query(DealModel).filter(
            and_(
                DealModel.id == uuid.UUID(deal_id),
                DealModel.is_deleted == False
            )
        ).first()
    else:
        # Regular users must belong to a company
        if not company_id:
            raise HTTPException(status_code=403, detail="User must belong to a company")
        
        deal = db.query(DealModel).filter(
            and_(
                DealModel.id == uuid.UUID(deal_id),
                DealModel.company_id == uuid.UUID(company_id) if isinstance(company_id, str) else company_id,
                DealModel.is_deleted == False
            )
        ).first()
    
    if not deal:
        logger.warning(f"Deal not found - ID: {deal_id}, Company: {company_id}, Super Admin: {context.is_super_admin()}")
        raise HTTPException(status_code=404, detail="Deal not found or you don't have access to it")
    
    # Track status changes for workflow triggers
    old_status = deal.status
    old_stage_id = deal.stage_id
    
    # Check permission for deal assignment (owner_id change)
    if 'owner_id' in deal_data and deal_data['owner_id'] != str(deal.owner_id):
        user_team_id = current_user.get('team_id')
        new_owner_id = deal_data['owner_id']
        
        # Get the new owner to check their team
        new_owner = db.query(User).filter(User.id == uuid.UUID(new_owner_id)).first()
        
        if not new_owner:
            raise HTTPException(status_code=404, detail="New owner not found")
        
        # Check assignment permissions based on role
        can_assign = False
        
        if context.is_super_admin():
            # Super Admin can assign anywhere
            can_assign = True
        elif has_permission(current_user, Permission.ASSIGN_COMPANY_LEADS):
            # Company Admin can assign within company
            if str(new_owner.company_id) == company_id:
                can_assign = True
        elif has_permission(current_user, Permission.ASSIGN_TEAM_LEADS):
            # Sales Manager can assign to their team members
            if user_team_id and str(new_owner.team_id) == user_team_id:
                can_assign = True
            # Sales Manager can also assign to themselves
            elif str(new_owner.id) == user_id:
                can_assign = True
        
        # Sales Reps cannot assign deals (no ASSIGN permission)
        
        if not can_assign:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to assign deals to this user. Sales Managers can only assign to their team members."
            )
    
    # Update fields
    for field, value in deal_data.items():
        if field == 'contact':
            # Handle contact - try to parse as UUID for contact_id
            try:
                deal.contact_id = uuid.UUID(value) if value else None
            except (ValueError, AttributeError):
                pass  # Ignore if not a valid UUID
        elif field == 'status':
            # Handle status - convert string to enum
            status_map = {
                'open': DealStatus.OPEN,
                'won': DealStatus.WON,
                'lost': DealStatus.LOST,
                'abandoned': DealStatus.ABANDONED
            }
            deal.status = status_map.get(value.lower() if value else 'open', DealStatus.OPEN)
        elif hasattr(deal, field) and value is not None:
            if field in ['stage_id', 'pipeline_id']:
                setattr(deal, field, uuid.UUID(value))
            else:
                setattr(deal, field, value)
    
    deal.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(deal)
    
    # Broadcast update to all connected clients in the company
    try:
        from app.services.websocket_manager import broadcast_entity_change
        import asyncio
        # Run in background without blocking
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(broadcast_entity_change(
                company_id=company_id,
                entity_type="deal",
                action="updated",
                entity_id=str(deal.id),
                data={
                    "id": str(deal.id),
                    "title": deal.title,
                    "value": deal.value,
                    "status": deal.status.value if deal.status else None
                }
            ))
    except Exception as e:
        print(f"⚠️ Failed to broadcast deal update: {e}")
    
    # Trigger workflows based on status/stage changes
    try:
        from app.services.workflow_executor import WorkflowExecutor
        from app.models.workflows import WorkflowTrigger
        from app.core.database import SessionLocal
        import asyncio
        import threading
        
        trigger_data = {
            "deal_id": str(deal.id),
            "deal_title": deal.title,
            "deal_value": deal.value,
            "contact_id": str(deal.contact_id) if deal.contact_id else None,
            "owner_id": str(deal.owner_id),
            "old_status": old_status.value if old_status else None,
            "new_status": deal.status.value if deal.status else None
        }
        
        def run_workflow(trigger_type, data):
            # Create new DB session for this thread
            workflow_db = SessionLocal()
            try:
                print(f"🔥 Starting workflow trigger for {trigger_type.value}")
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                executor = WorkflowExecutor(workflow_db)
                print(f"🔥 Trigger data: {data}")
                result = loop.run_until_complete(executor.trigger_workflows(
                    trigger_type,
                    data,
                    user_id
                ))
                print(f"🔥 Workflow trigger completed, executions: {len(result) if result else 0}")
                loop.close()
            except Exception as e:
                print(f"❌ Workflow execution error: {e}")
                import traceback
                traceback.print_exc()
            finally:
                workflow_db.close()
        
        # Trigger DEAL_WON if status changed to WON
        if old_status != DealStatus.WON and deal.status == DealStatus.WON:
            thread = threading.Thread(target=run_workflow, args=(WorkflowTrigger.DEAL_WON, trigger_data.copy()), daemon=True)
            thread.start()
        
        # Trigger DEAL_LOST if status changed to LOST
        if old_status != DealStatus.LOST and deal.status == DealStatus.LOST:
            thread = threading.Thread(target=run_workflow, args=(WorkflowTrigger.DEAL_LOST, trigger_data.copy()), daemon=True)
            thread.start()
        
        # Trigger DEAL_STAGE_CHANGED if stage changed
        if old_stage_id != deal.stage_id:
            stage_data = trigger_data.copy()
            stage_data["old_stage_id"] = str(old_stage_id) if old_stage_id else None
            stage_data["new_stage_id"] = str(deal.stage_id) if deal.stage_id else None
            thread = threading.Thread(target=run_workflow, args=(WorkflowTrigger.DEAL_STAGE_CHANGED, stage_data), daemon=True)
            thread.start()
    except Exception as workflow_error:
        # Don't fail the deal update if workflows fail
        print(f"Workflow trigger error: {workflow_error}")
    
    # Send notifications
    try:
        from ..services.notification_service import NotificationService
        from ..models.users import User
        from ..models.deals import PipelineStage
        
        updater = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
        updater_name = f"{updater.first_name} {updater.last_name}" if updater else "Unknown User"
        
        # Notify about stage change
        if old_stage_id != deal.stage_id:
            old_stage = db.query(PipelineStage).filter(PipelineStage.id == old_stage_id).first()
            new_stage = db.query(PipelineStage).filter(PipelineStage.id == deal.stage_id).first()
            
            NotificationService.notify_deal_stage_changed(
                db=db,
                deal_id=deal.id,
                deal_title=deal.title,
                updater_id=uuid.UUID(user_id),
                updater_name=updater_name,
                company_id=deal.company_id,
                old_stage=old_stage.name if old_stage else "Unknown",
                new_stage=new_stage.name if new_stage else "Unknown"
            )
        else:
            # Notify about general update
            changes = ", ".join([f"{k}: {v}" for k, v in deal_data.items() if k not in ['stage_id']])
            if changes:
                NotificationService.notify_deal_updated(
                    db=db,
                    deal_id=deal.id,
                    deal_title=deal.title,
                    updater_id=uuid.UUID(user_id),
                    updater_name=updater_name,
                    company_id=deal.company_id,
                    changes=changes
                )
    except Exception as notification_error:
        # Don't fail the deal update if notifications fail
        print(f"Notification error: {notification_error}")
    
    return {
        "id": str(deal.id),
        "title": deal.title,
        "value": deal.value,
        "stage_id": str(deal.stage_id),
        "pipeline_id": str(deal.pipeline_id),
        "company": deal.company,
        "contact": f"{deal.contact.first_name} {deal.contact.last_name}" if deal.contact else None,
        "description": deal.description,
        "status": deal.status.value if deal.status else 'open',
        "updated_at": deal.updated_at
    }


@router.delete("/{deal_id}")
async def delete_deal(
    deal_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a specific deal - Only Managers and Admins"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must belong to a company"
        )
    
    # Convert deal_id to UUID
    try:
        deal_uuid = uuid.UUID(deal_id)
        company_uuid = uuid.UUID(company_id) if isinstance(company_id, str) else company_id
    except (ValueError, AttributeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ID format: {str(e)}"
        )
    
    deal = db.query(DealModel).filter(
        and_(
            DealModel.id == deal_uuid,
            DealModel.company_id == company_uuid,
            DealModel.is_deleted == False
        )
    ).first()
    
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found"
        )
    
    # CRITICAL: Only Managers and Admins can delete deals
    # Sales Reps CANNOT delete deals per permission matrix
    if context.is_super_admin():
        # Super admin can delete any deal
        pass
    elif has_permission(current_user, Permission.VIEW_COMPANY_DATA):
        # Company admin can delete any deal in their company
        pass
    elif has_permission(current_user, Permission.VIEW_TEAM_DATA):
        # Sales manager can only delete deals from their team
        if user_team_id:
            team_user_ids = [str(u.id) for u in db.query(User).filter(
                User.team_id == user_team_id,
                User.is_deleted == False
            ).all()]
            
            if str(deal.owner_id) not in team_user_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only delete deals from your team members. This deal belongs to someone outside your team."
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to a team. Please contact your administrator."
            )
    else:
        # Sales Reps and regular users CANNOT delete deals
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete deals. Only managers and administrators can delete deals. Please contact your manager if you need to remove a deal."
        )
    
    # Soft delete
    deal.is_deleted = True
    deal.updated_at = datetime.utcnow()
    
    db.commit()
    
    # Send deletion notification
    try:
        from app.services.notification_service import NotificationService
        deleter = db.query(User).filter(User.id == user_id).first()
        deleter_name = f"{deleter.first_name} {deleter.last_name}" if deleter else "Unknown User"
        
        NotificationService.notify_deal_deleted(
            db=db,
            deal_title=deal.title,
            deleter_id=user_id,
            deleter_name=deleter_name,
            company_id=company_id
        )
    except Exception as e:
        print(f"⚠️ Failed to send deal deletion notification: {e}")
    
    # Broadcast deletion to all connected clients in the company
    try:
        from app.services.websocket_manager import broadcast_entity_change
        import asyncio
        # Run in background without blocking
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(broadcast_entity_change(
                company_id=company_id,
                entity_type="deal",
                action="deleted",
                entity_id=deal_id
            ))
    except Exception as e:
        print(f"⚠️ Failed to broadcast deal deletion: {e}")
    
    return {"message": "Deal deleted successfully"}


@router.patch("/{deal_id}/move")
def move_deal_stage(
    deal_id: str,
    stage_data: dict,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Move deal to different stage"""
    from ..models.deals import Pipeline, PipelineStage
    
    context = get_tenant_context(current_user)
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Build query based on role
    query = db.query(DealModel).filter(
        and_(
            DealModel.id == uuid.UUID(deal_id),
            DealModel.is_deleted == False
        )
    )
    
    # Apply role-based filtering
    if context.is_super_admin():
        # Super Admin can move any deal
        pass
    elif has_permission(current_user, Permission.MANAGE_ALL_DEALS):
        # Company Admin can move any deal in their company
        query = query.filter(DealModel.company_id == context.company_id)
    elif has_permission(current_user, Permission.MANAGE_TEAM_DEALS):
        # Sales Manager can move deals owned by their team members
        team_member_ids = db.query(User.id).filter(
            and_(
                User.team_id == context.team_id,
                User.is_active == True
            )
        ).all()
        team_member_ids = [str(uid[0]) for uid in team_member_ids]
        query = query.filter(DealModel.owner_id.in_([uuid.UUID(uid) for uid in team_member_ids]))
    else:
        # Sales Rep can only move their own deals
        query = query.filter(DealModel.owner_id == user_id)
    
    deal = query.first()
    
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found or you don't have permission to move it")
    
    # Handle stage_id - accept either UUID or stage name
    to_stage_id_str = stage_data.get("to_stage_id", str(deal.stage_id))
    try:
        stage_id = uuid.UUID(to_stage_id_str)
    except (ValueError, AttributeError):
        # Try to find stage by name (case-insensitive)
        stage_name_map = {
            'qualification': 'Qualification',
            'proposal': 'Proposal',
            'negotiation': 'Negotiation',
            'closed-won': 'Closed Won',
            'closed-lost': 'Closed Lost'
        }
        stage_name = stage_name_map.get(to_stage_id_str.lower(), to_stage_id_str)
        stage = db.query(PipelineStage).filter(
            and_(
                PipelineStage.pipeline_id == deal.pipeline_id,
                PipelineStage.name == stage_name,
                PipelineStage.is_deleted == False
            )
        ).first()
        
        if not stage:
            raise HTTPException(status_code=400, detail=f"Stage '{to_stage_id_str}' not found")
        stage_id = stage.id
    
    # Track old stage for workflow trigger
    old_stage_id = deal.stage_id
    old_status = deal.status
    
    deal.stage_id = stage_id
    deal.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(deal)
    
    # Trigger workflows for stage change
    try:
        from app.services.workflow_executor import WorkflowExecutor
        from app.models.workflows import WorkflowTrigger
        from app.core.database import SessionLocal
        import asyncio
        import threading
        
        trigger_data = {
            "deal_id": str(deal.id),
            "deal_title": deal.title,
            "deal_value": deal.value,
            "contact_id": str(deal.contact_id) if deal.contact_id else None,
            "owner_id": str(deal.owner_id),
            "old_stage_id": str(old_stage_id) if old_stage_id else None,
            "new_stage_id": str(deal.stage_id) if deal.stage_id else None,
            "old_status": old_status.value if old_status else None,
            "new_status": deal.status.value if deal.status else None
        }
        
        def run_workflow(trigger_type, data):
            workflow_db = SessionLocal()
            try:
                print(f"🔥 Starting workflow trigger for {trigger_type.value}")
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                executor = WorkflowExecutor(workflow_db)
                print(f"🔥 Trigger data: {data}")
                result = loop.run_until_complete(executor.trigger_workflows(
                    trigger_type,
                    data,
                    user_id
                ))
                print(f"🔥 Workflow trigger completed, executions: {len(result) if result else 0}")
                loop.close()
            except Exception as e:
                print(f"❌ Workflow execution error: {e}")
                import traceback
                traceback.print_exc()
            finally:
                workflow_db.close()
        
        # Trigger DEAL_STAGE_CHANGED if stage changed
        if old_stage_id != deal.stage_id:
            thread = threading.Thread(target=run_workflow, args=(WorkflowTrigger.DEAL_STAGE_CHANGED, trigger_data.copy()), daemon=True)
            thread.start()
            print(f"🔥 Workflow thread started for deal_stage_changed")
        
        # Check if stage change also changed status
        if old_status != deal.status:
            if old_status != DealStatus.WON and deal.status == DealStatus.WON:
                thread = threading.Thread(target=run_workflow, args=(WorkflowTrigger.DEAL_WON, trigger_data.copy()), daemon=True)
                thread.start()
                print(f"🔥 Workflow thread started for deal_won")
            elif old_status != DealStatus.LOST and deal.status == DealStatus.LOST:
                thread = threading.Thread(target=run_workflow, args=(WorkflowTrigger.DEAL_LOST, trigger_data.copy()), daemon=True)
                thread.start()
                print(f"🔥 Workflow thread started for deal_lost")
    except Exception as workflow_error:
        print(f"❌ Workflow trigger error: {workflow_error}")
        import traceback
        traceback.print_exc()
    
    # Map stage name to frontend format
    stage_name_map = {
        'Qualification': 'qualification',
        'Proposal': 'proposal',
        'Negotiation': 'negotiation',
        'Closed Won': 'closed-won',
        'Closed Lost': 'closed-lost'
    }
    
    return {
        "id": str(deal.id),
        "title": deal.title,
        "value": deal.value,
        "stage_id": stage_name_map.get(deal.stage.name, deal.stage.name.lower()) if deal.stage else str(deal.stage_id),
        "pipeline_id": str(deal.pipeline_id),
        "company": deal.company,
        "contact": f"{deal.contact.first_name} {deal.contact.last_name}" if deal.contact else None,
        "updated_at": deal.updated_at
    }
