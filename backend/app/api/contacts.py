from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from pydantic import BaseModel
import pandas as pd
import io
from datetime import datetime
import uuid

from app.core.database import get_db
from app.models.contacts import Contact as ContactModel, ContactStatus
from app.api.auth import get_current_active_user

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
    pass

class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None

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
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all contacts with optional search, filters and pagination"""
    query = db.query(ContactModel).filter(ContactModel.is_deleted == False)
    
    if search:
        query = query.filter(
            (ContactModel.first_name.ilike(f"%{search}%")) |
            (ContactModel.last_name.ilike(f"%{search}%")) |
            (ContactModel.email.ilike(f"%{search}%")) |
            (ContactModel.company.ilike(f"%{search}%"))
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
    existing_contact = db.query(ContactModel).filter(
        and_(
            ContactModel.email == contact.email,
            ContactModel.is_deleted == False
        )
    ).first()
    
    if existing_contact:
        raise HTTPException(status_code=400, detail="Contact with this email already exists")
    
    try:
        user_id = current_user["id"]
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        
        db_contact = ContactModel(
            **contact.dict(),
            owner_id=user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(db_contact)
        db.commit()
        db.refresh(db_contact)
        return db_contact
    except Exception as e:
        db.rollback()
        print(f"Error creating contact: {e}")
        raise HTTPException(status_code=500, detail="Failed to create contact. Please check your input and try again.")

@router.get("/{contact_id}", response_model=Contact)
async def get_contact(
    contact_id: uuid.UUID,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific contact by ID"""
    contact = db.query(ContactModel).filter(
        and_(
            ContactModel.id == contact_id,
            ContactModel.is_deleted == False
        )
    ).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

@router.put("/{contact_id}", response_model=Contact)
async def update_contact(
    contact_id: uuid.UUID,
    contact_update: ContactUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a specific contact"""
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
        existing_contact = db.query(ContactModel).filter(
            and_(
                ContactModel.email == update_data["email"],
                ContactModel.id != contact_id,
                ContactModel.is_deleted == False
            )
        ).first()
        
        if existing_contact:
            raise HTTPException(status_code=400, detail="Contact with this email already exists")
    
    try:
        for field, value in update_data.items():
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
    """Soft delete a specific contact"""
    contact = db.query(ContactModel).filter(
        and_(
            ContactModel.id == contact_id,
            ContactModel.is_deleted == False
        )
    ).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
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


