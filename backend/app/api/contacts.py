"""
Contacts API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
from ..core.security import get_current_active_user

router = APIRouter()


class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    notes: Optional[str] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    notes: Optional[str] = None


class Contact(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# Mock data for testing
MOCK_CONTACTS = [
    {
        "id": 1,
        "name": "John Smith",
        "email": "john.smith@example.com",
        "phone": "+1-555-0123",
        "company": "Tech Corp",
        "position": "CTO",
        "notes": "Interested in enterprise solutions",
        "created_at": "2024-01-01T10:00:00",
        "updated_at": "2024-01-15T14:30:00"
    },
    {
        "id": 2,
        "name": "Sarah Johnson",
        "email": "sarah.johnson@marketing.com",
        "phone": "+1-555-0456",
        "company": "Marketing Pro",
        "position": "Marketing Director",
        "notes": "Looking for consulting services",
        "created_at": "2024-01-05T09:15:00",
        "updated_at": "2024-01-20T11:45:00"
    },
    {
        "id": 3,
        "name": "Mike Wilson",
        "email": "mike@startup.io",
        "phone": "+1-555-0789",
        "company": "Startup Inc",
        "position": "Founder",
        "notes": "Needs website redesign",
        "created_at": "2024-01-10T08:30:00",
        "updated_at": "2024-01-22T16:20:00"
    }
]


@router.get("/", response_model=List[Contact])
async def get_contacts(
    search: Optional[str] = None,
    company: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user)
):
    """Get all contacts, optionally filtered by search term or company"""
    contacts = MOCK_CONTACTS.copy()
    
    if search:
        search_lower = search.lower()
        contacts = [
            contact for contact in contacts
            if search_lower in contact["name"].lower() 
            or search_lower in contact["email"].lower()
            or (contact["company"] and search_lower in contact["company"].lower())
        ]
    
    if company:
        contacts = [contact for contact in contacts if contact.get("company") == company]
    
    return contacts


@router.post("/", response_model=Contact)
async def create_contact(
    contact: ContactCreate,
    current_user: dict = Depends(get_current_active_user)
):
    """Create a new contact"""
    # Check if email already exists
    if any(c["email"] == contact.email for c in MOCK_CONTACTS):
        raise HTTPException(status_code=400, detail="Contact with this email already exists")
    
    new_contact = {
        "id": len(MOCK_CONTACTS) + 1,
        **contact.dict(),
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    MOCK_CONTACTS.append(new_contact)
    return new_contact


@router.get("/{contact_id}", response_model=Contact)
async def get_contact(
    contact_id: int,
    current_user: dict = Depends(get_current_active_user)
):
    """Get a specific contact by ID"""
    contact = next((c for c in MOCK_CONTACTS if c["id"] == contact_id), None)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.put("/{contact_id}", response_model=Contact)
async def update_contact(
    contact_id: int,
    contact_update: ContactUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """Update a specific contact"""
    contact = next((c for c in MOCK_CONTACTS if c["id"] == contact_id), None)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Check if email is being updated and already exists
    update_data = contact_update.dict(exclude_unset=True)
    if "email" in update_data:
        if any(c["email"] == update_data["email"] and c["id"] != contact_id for c in MOCK_CONTACTS):
            raise HTTPException(status_code=400, detail="Contact with this email already exists")
    
    for field, value in update_data.items():
        contact[field] = value
    contact["updated_at"] = datetime.now()
    
    return contact


@router.delete("/{contact_id}")
async def delete_contact(
    contact_id: int,
    current_user: dict = Depends(get_current_active_user)
):
    """Delete a specific contact"""
    contact_index = next((i for i, c in enumerate(MOCK_CONTACTS) if c["id"] == contact_id), None)
    if contact_index is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    MOCK_CONTACTS.pop(contact_index)
    return {"message": "Contact deleted successfully"}


@router.get("/stats/summary")
async def get_contacts_stats(current_user: dict = Depends(get_current_active_user)):
    """Get contacts statistics"""
    total_contacts = len(MOCK_CONTACTS)
    
    companies = {}
    for contact in MOCK_CONTACTS:
        if contact["company"]:
            companies[contact["company"]] = companies.get(contact["company"], 0) + 1
    
    return {
        "total_contacts": total_contacts,
        "total_companies": len(companies),
        "companies_breakdown": companies
    }