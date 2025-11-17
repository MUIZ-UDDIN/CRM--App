from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from pydantic import BaseModel, UUID4
import pandas as pd
import io
from datetime import datetime
import uuid

from app.core.database import get_db
from app.models.contacts import Contact as ContactModel, ContactStatus
from app.core.security import get_current_active_user
from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

# Pydantic schemas
class ContactBase(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    type: Optional[str] = None

class ContactCreate(ContactBase):
    owner_id: Optional[str] = None

class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    owner_id: Optional[str] = None

class Contact(ContactBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    status: str
    created_at: datetime
    updated_at: datetime
    is_deleted: bool = False

    class Config:
        from_attributes = True

router = APIRouter()

@router.get("/", response_model=List[Contact])
async def get_contacts(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    owner_id: Optional[str] = None,
    team_id: Optional[UUID4] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get contacts based on role-based permissions"""
    context = get_tenant_context(current_user)
    company_id = current_user.get('company_id')
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    # Start with base query for non-deleted contacts
    query = db.query(ContactModel).filter(ContactModel.is_deleted == False)
    
    # Apply filters based on role permissions
    if context.is_super_admin():
        # Super admin can see all contacts or filter by company
        if company_id:
            query = query.filter(ContactModel.company_id == company_id)
    elif has_permission(current_user, Permission.VIEW_COMPANY_DATA):
        # Company admin can see all contacts in their company
        query = query.filter(ContactModel.company_id == company_id)
    elif has_permission(current_user, Permission.VIEW_TEAM_DATA):
        # Sales manager can see contacts owned by anyone in their team
        if user_team_id:
            # Get all users in the team
            from app.models.users import User
            team_user_ids = [str(u.id) for u in db.query(User).filter(
                User.team_id == user_team_id,
                User.is_deleted == False
            ).all()]
            
            # Filter contacts owned by team members
            if team_user_ids:
                query = query.filter(
                    ContactModel.company_id == company_id,
                    ContactModel.owner_id.in_([uuid.UUID(id) for id in team_user_ids])
                )
            else:
                # Team exists but has no members, show own contacts
                query = query.filter(
                    ContactModel.company_id == company_id,
                    ContactModel.owner_id == uuid.UUID(user_id) if isinstance(user_id, str) else user_id
                )
        else:
            # No team assigned, show own contacts
            query = query.filter(
                ContactModel.company_id == company_id,
                ContactModel.owner_id == uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            )
    elif has_permission(current_user, Permission.VIEW_OWN_DATA):
        # Regular users can only see their own contacts
        query = query.filter(
            ContactModel.company_id == company_id,
            ContactModel.owner_id == uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        )
    else:
        # No permission to view contacts
        return []
    
    if search:
        # Search only from start of first name or last name
        query = query.filter(
            (ContactModel.first_name.ilike(f"{search}%")) |
            (ContactModel.last_name.ilike(f"{search}%"))
        )
    
    if type:
        query = query.filter(ContactModel.type == type)
    
    if status:
        # Filter by status string directly (uppercase to match database)
        query = query.filter(ContactModel.status == status.upper())
    
    if owner_id:
        query = query.filter(ContactModel.owner_id == uuid.UUID(owner_id))
    
    contacts = query.offset(skip).limit(limit).all()
    return contacts

@router.post("/", response_model=Contact)
async def create_contact(
    contact: ContactCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new contact"""
    # Get company_id from current user first
    company_id = current_user.get('company_id')
    if not company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
    
    # Check for existing contact with same email in the SAME company
    existing_contact = db.query(ContactModel).filter(
        and_(
            ContactModel.email == contact.email,
            ContactModel.company_id == company_id,
            ContactModel.is_deleted == False
        )
    ).first()
    
    if existing_contact:
        raise HTTPException(status_code=400, detail="Contact with this email already exists in your company")
    
    try:
        # Use provided owner_id or default to current user
        if contact.owner_id:
            owner_id = uuid.UUID(contact.owner_id)
        else:
            user_id = current_user["id"]
            owner_id = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        
        # Create contact dict without owner_id to avoid duplication
        contact_data = contact.dict(exclude={'owner_id'})
        
        db_contact = ContactModel(
            **contact_data,
            owner_id=owner_id,
            company_id=uuid.UUID(company_id) if isinstance(company_id, str) else company_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(db_contact)
        db.commit()
        db.refresh(db_contact)
        
        # Trigger workflows for contact_created
        try:
            from app.services.workflow_executor import WorkflowExecutor
            from app.models.workflows import WorkflowTrigger
            from app.core.database import SessionLocal
            import asyncio
            import threading
            
            def run_workflow():
                # Create new DB session for this thread
                workflow_db = SessionLocal()
                try:
                    print(f"🔥 Starting workflow trigger for contact_created")
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    executor = WorkflowExecutor(workflow_db)
                    trigger_data = {
                        "contact_id": str(db_contact.id),
                        "contact_name": f"{db_contact.first_name} {db_contact.last_name}",
                        "contact_email": db_contact.email,
                        "contact_company": db_contact.company,
                        "owner_id": str(db_contact.owner_id)
                    }
                    print(f"🔥 Trigger data: {trigger_data}")
                    result = loop.run_until_complete(executor.trigger_workflows(
                        WorkflowTrigger.CONTACT_CREATED,
                        trigger_data,
                        owner_id
                    ))
                    print(f"🔥 Workflow trigger completed, executions: {len(result) if result else 0}")
                    loop.close()
                except Exception as e:
                    print(f"❌ Workflow execution error: {e}")
                    import traceback
                    traceback.print_exc()
                finally:
                    workflow_db.close()
            
            # Run in background thread
            thread = threading.Thread(target=run_workflow, daemon=True)
            thread.start()
        except Exception as workflow_error:
            # Don't fail the contact creation if workflows fail
            print(f"Workflow trigger error: {workflow_error}")
        
        return db_contact
    except Exception as e:
        db.rollback()
        print(f"Error creating contact: {e}")
        
        # Check if it's a duplicate email error
        error_str = str(e)
        if "duplicate key value violates unique constraint" in error_str and "ix_contacts_email" in error_str:
            raise HTTPException(status_code=400, detail=f"A contact with email '{contact.email}' already exists")
        
        # Generic error
        raise HTTPException(status_code=500, detail="Failed to create contact. Please check your input and try again.")

@router.get("/{contact_id}", response_model=Contact)
async def get_contact(
    contact_id: uuid.UUID,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific contact by ID with role-based permissions"""
    context = get_tenant_context(current_user)
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    contact = db.query(ContactModel).filter(
        and_(
            ContactModel.id == contact_id,
            ContactModel.is_deleted == False
        )
    ).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Check permissions
    if context.is_super_admin():
        # Super admin can access any contact
        return contact
    
    # Check if contact belongs to user's company
    if str(contact.company_id) != str(context.company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this contact"
        )
    
    # Company admin can view any contact in their company
    if has_permission(current_user, Permission.VIEW_COMPANY_DATA):
        return contact
    
    # Sales manager can view contacts owned by anyone in their team
    if has_permission(current_user, Permission.VIEW_TEAM_DATA):
        if user_team_id:
            # Get all users in the team
            from app.models.users import User
            team_user_ids = [str(u.id) for u in db.query(User).filter(
                User.team_id == user_team_id,
                User.is_deleted == False
            ).all()]
            
            if team_user_ids and str(contact.owner_id) in team_user_ids:
                return contact
            elif not team_user_ids and str(contact.owner_id) == str(user_id):
                # Team exists but no members, allow own contacts
                return contact
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this contact"
                )
        else:
            # No team assigned, allow own contacts
            if str(contact.owner_id) == str(user_id):
                return contact
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this contact"
                )
    
    # Regular users can only view their own contacts
    if has_permission(current_user, Permission.VIEW_OWN_DATA):
        if str(contact.owner_id) == str(user_id):
            return contact
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this contact"
            )
    
    # No permission to view contacts
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have permission to view contacts"
    )

@router.put("/{contact_id}", response_model=Contact)
async def update_contact(
    contact_id: uuid.UUID,
    contact_update: ContactUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a specific contact with role-based permissions"""
    context = get_tenant_context(current_user)
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    company_id = current_user.get('company_id')
    
    contact = db.query(ContactModel).filter(
        and_(
            ContactModel.id == contact_id,
            ContactModel.is_deleted == False
        )
    ).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    update_data = contact_update.dict(exclude_unset=True)
    if "email" in update_data:
        # Check for duplicate email in the SAME company (excluding soft-deleted contacts)
        existing_contact = db.query(ContactModel).filter(
            and_(
                ContactModel.email == update_data["email"],
                ContactModel.company_id == company_id,
                ContactModel.id != contact_id,
                ContactModel.is_deleted == False
            )
        ).first()
        
        if existing_contact:
            raise HTTPException(status_code=400, detail="Contact with this email already exists in your company")
    
    try:
        for field, value in update_data.items():
            if field == 'owner_id' and value:
                # Convert owner_id string to UUID
                setattr(contact, field, uuid.UUID(value))
            else:
                setattr(contact, field, value)
        contact.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(contact)
        return contact
    except Exception as e:
        db.rollback()
        print(f"Error updating contact: {e}")
        raise HTTPException(status_code=500, detail="Failed to update contact. Please check your input and try again.")

@router.patch("/{contact_id}", response_model=Contact)
async def patch_contact(
    contact_id: uuid.UUID,
    contact_update: ContactUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update specific fields of a contact"""
    return await update_contact(contact_id, contact_update, current_user, db)

@router.delete("/{contact_id}")
async def delete_contact(
    contact_id: uuid.UUID,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Soft delete a specific contact with role-based permissions"""
    context = get_tenant_context(current_user)
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    contact = db.query(ContactModel).filter(
        and_(
            ContactModel.id == contact_id,
            ContactModel.is_deleted == False
        )
    ).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Check permissions
    if context.is_super_admin():
        # Super admin can delete any contact
        pass
    elif str(contact.company_id) != str(context.company_id):
        # Contact must belong to user's company
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this contact"
        )
    elif has_permission(current_user, Permission.VIEW_COMPANY_DATA):
        # Company admin can delete any contact in their company
        pass
    elif has_permission(current_user, Permission.VIEW_TEAM_DATA):
        # Sales manager can delete contacts owned by anyone in their team
        if user_team_id:
            from app.models.users import User
            team_user_ids = [str(u.id) for u in db.query(User).filter(
                User.team_id == user_team_id,
                User.is_deleted == False
            ).all()]
            
            if team_user_ids:
                if str(contact.owner_id) not in team_user_ids:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied to this contact"
                    )
            else:
                # Team exists but no members, allow own contacts only
                if str(contact.owner_id) != str(user_id):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied to this contact"
                    )
        else:
            # No team assigned, allow own contacts only
            if str(contact.owner_id) != str(user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this contact"
                )
    else:
        # CRITICAL: Sales Reps and regular users CANNOT delete contacts
        # Only Managers and Admins can delete contacts per permission matrix
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete contacts. Only managers and administrators can delete contacts. Please contact your administrator if you need to remove a contact."
        )
    
    try:
        contact.is_deleted = True
        contact.updated_at = datetime.utcnow()
        db.commit()
        return {"message": "Contact deleted successfully"}
    except Exception as e:
        db.rollback()
        print(f"Error deleting contact: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete contact. Please try again.")

@router.get("/stats/summary")
async def get_contacts_stats(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get contacts statistics"""
    contacts = db.query(ContactModel).filter(ContactModel.is_deleted == False).all()
    total_contacts = len(contacts)
    
    companies = {}
    for contact in contacts:
        if contact.company:
            companies[contact.company] = companies.get(contact.company, 0) + 1
    
    return {
        "total_contacts": total_contacts,
        "total_companies": len(companies),
        "companies_breakdown": companies
    }

@router.post("/upload-csv")
async def upload_csv_contacts(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload contacts from CSV file with Type and Owner support"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV file")
    
    try:
        content = await file.read()
        content_str = content.decode('utf-8')
        
        if '\t' in content_str and content_str.count('\t') > content_str.count(','):
            delimiter = '\t'
        else:
            delimiter = ','
        
        df = pd.read_csv(io.StringIO(content_str), delimiter=delimiter)
        
        user_id = current_user["id"]
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        
        successful_imports = 0
        failed_imports = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Clean and validate email
                email = str(row.get('email', '')).strip().lower()
                if not email or '@' not in email:
                    errors.append(f"Row {index + 1}: Invalid or missing email")
                    failed_imports += 1
                    continue
                
                # Check for existing non-deleted contact with same email (case-insensitive)
                existing_contact = db.query(ContactModel).filter(
                    and_(
                        ContactModel.email.ilike(email),
                        ContactModel.is_deleted == False
                    )
                ).first()
                
                if existing_contact:
                    errors.append(f"Row {index + 1}: Contact with email {email} already exists")
                    failed_imports += 1
                    continue
                
                # Delete any soft-deleted contacts with same email to avoid unique constraint violation
                deleted_contacts = db.query(ContactModel).filter(
                    and_(
                        ContactModel.email.ilike(email),
                        ContactModel.is_deleted == True
                    )
                ).all()
                
                for deleted_contact in deleted_contacts:
                    db.delete(deleted_contact)
                db.commit()
                
                # Handle owner_id from CSV or use current user
                owner_id = user_id
                if 'owner_id' in row and pd.notna(row.get('owner_id')):
                    try:
                        owner_id = uuid.UUID(str(row.get('owner_id')))
                    except (ValueError, AttributeError):
                        owner_id = user_id
                
                # Handle type field with null check and trim whitespace
                contact_type = str(row.get('type', 'Lead')).strip() if pd.notna(row.get('type')) else 'Lead'
                
                contact_data = {
                    'first_name': str(row.get('first_name', '')).strip(),
                    'last_name': str(row.get('last_name', '')).strip(),
                    'email': email,
                    'phone': str(row.get('phone', '')).strip() if pd.notna(row.get('phone')) else '',
                    'company': str(row.get('company', '')).strip() if pd.notna(row.get('company')) else '',
                    'title': str(row.get('title', '')).strip() if pd.notna(row.get('title')) else '',
                    'type': contact_type.strip(),
                    'status': ContactStatus.NEW,
                    'owner_id': owner_id,
                    'created_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow()
                }
                
                db_contact = ContactModel(**contact_data)
                db.add(db_contact)
                db.commit()  # Commit each row individually
                successful_imports += 1
                
            except Exception as e:
                db.rollback()  # Rollback failed row
                errors.append(f"Row {index + 1}: {str(e)}")
                failed_imports += 1
        
        return {
            "message": "CSV upload completed",
            "created_count": successful_imports,
            "failed_count": failed_imports,
            "errors": errors[:10]  # Limit errors to first 10
        }
        
    except Exception as e:
        db.rollback()
        print(f"Error processing CSV file: {e}")
        raise HTTPException(status_code=400, detail="Failed to process CSV file. Please check the file format and try again.")

@router.post("/upload-excel")
async def upload_excel_contacts(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload contacts from Excel file with Type and Owner support"""
    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx or .xls)")
    
    try:
        content = await file.read()
        df = pd.read_excel(io.BytesIO(content))
        
        user_id = current_user["id"]
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        
        successful_imports = 0
        failed_imports = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Clean and validate email
                email = str(row.get('email', '')).strip().lower()
                if not email or '@' not in email:
                    errors.append(f"Row {index + 1}: Invalid or missing email")
                    failed_imports += 1
                    continue
                
                # Check for existing non-deleted contact with same email (case-insensitive)
                existing_contact = db.query(ContactModel).filter(
                    and_(
                        ContactModel.email.ilike(email),
                        ContactModel.is_deleted == False
                    )
                ).first()
                
                if existing_contact:
                    errors.append(f"Row {index + 1}: Contact with email {email} already exists")
                    failed_imports += 1
                    continue
                
                # Delete any soft-deleted contacts with same email to avoid unique constraint violation
                deleted_contacts = db.query(ContactModel).filter(
                    and_(
                        ContactModel.email.ilike(email),
                        ContactModel.is_deleted == True
                    )
                ).all()
                
                for deleted_contact in deleted_contacts:
                    db.delete(deleted_contact)
                db.commit()
                
                # Handle owner_id from Excel or use current user
                owner_id = user_id
                if 'owner_id' in row and pd.notna(row.get('owner_id')):
                    try:
                        owner_id = uuid.UUID(str(row.get('owner_id')))
                    except (ValueError, AttributeError):
                        owner_id = user_id
                
                # Handle type field with null check and trim whitespace
                contact_type = str(row.get('type', 'Lead')).strip() if pd.notna(row.get('type')) else 'Lead'
                
                contact_data = {
                    'first_name': str(row.get('first_name', '')).strip(),
                    'last_name': str(row.get('last_name', '')).strip(),
                    'email': email,
                    'phone': str(row.get('phone', '')).strip() if pd.notna(row.get('phone')) else '',
                    'company': str(row.get('company', '')).strip() if pd.notna(row.get('company')) else '',
                    'title': str(row.get('title', '')).strip() if pd.notna(row.get('title')) else '',
                    'type': contact_type.strip(),
                    'status': ContactStatus.NEW,
                    'owner_id': owner_id,
                    'created_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow()
                }
                
                db_contact = ContactModel(**contact_data)
                db.add(db_contact)
                db.commit()  # Commit each row individually
                successful_imports += 1
                
            except Exception as e:
                db.rollback()  # Rollback failed row
                errors.append(f"Row {index + 1}: {str(e)}")
                failed_imports += 1
        
        return {
            "message": "Excel upload completed",
            "created_count": successful_imports,
            "failed_count": failed_imports,
            "errors": errors[:10]  # Limit errors to first 10
        }
        
    except Exception as e:
        db.rollback()
        print(f"Error processing Excel file: {e}")
        raise HTTPException(status_code=400, detail="Failed to process Excel file. Please check the file format and try again.")


