"""
Global Search API - Search across all entities (contacts, deals, quotes, files, activities, etc.)
"""

from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
import uuid

from app.core.security import get_current_active_user
from app.core.database import get_db
from app.models.contacts import Contact
from app.models.deals import Deal
from app.models.quotes import Quote
from app.models.activities import Activity
from app.models.documents import Document
from app.middleware.tenant import get_tenant_context

router = APIRouter(tags=["Search"])


class NavigationResult(BaseModel):
    name: str
    description: str
    path: str
    icon: str
    category: str


class NavigationSearchResponse(BaseModel):
    query: str
    results: List[NavigationResult]


# Global Search Models
class GlobalSearchResult(BaseModel):
    id: str
    type: str  # contact, deal, quote, file, activity
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    path: str
    icon: str


class GlobalSearchResponse(BaseModel):
    query: str
    total_count: int
    contacts: List[GlobalSearchResult]
    deals: List[GlobalSearchResult]
    quotes: List[GlobalSearchResult]
    files: List[GlobalSearchResult]
    activities: List[GlobalSearchResult]
    pages: List[NavigationResult]


# Define all available pages/sections
NAVIGATION_ITEMS = [
    # Dashboard
    {"name": "Dashboard", "description": "View your dashboard and KPIs", "path": "/dashboard", "icon": "home", "category": "Main"},
    
    # Sales
    {"name": "Deals", "description": "Manage your deals and pipeline", "path": "/deals", "icon": "currency", "category": "Sales"},
    {"name": "Pipeline", "description": "Configure your sales pipeline", "path": "/pipeline-settings", "icon": "chart", "category": "Sales"},
    {"name": "Quotes", "description": "Create and manage quotes", "path": "/quotes", "icon": "document", "category": "Sales"},
    {"name": "Analytics", "description": "View sales analytics and reports", "path": "/analytics", "icon": "chart-bar", "category": "Sales"},
    
    # Communications
    {"name": "Contacts", "description": "Manage your contacts", "path": "/contacts", "icon": "users", "category": "Communications"},
    {"name": "Email", "description": "Email inbox and messages", "path": "/inbox", "icon": "envelope", "category": "Communications"},
    {"name": "SMS", "description": "Send and manage SMS messages", "path": "/sms", "icon": "chat", "category": "Communications"},
    {"name": "Messages", "description": "SMS messaging center", "path": "/sms", "icon": "chat", "category": "Communications"},
    {"name": "Calls", "description": "Call logs and recordings", "path": "/calls", "icon": "phone", "category": "Communications"},
    {"name": "Phone Numbers", "description": "Manage Twilio phone numbers", "path": "/phone-numbers", "icon": "phone", "category": "Communications"},
    
    # More
    {"name": "Activities", "description": "Tasks, meetings, and activities", "path": "/activities", "icon": "calendar", "category": "More"},
    {"name": "Files", "description": "Document management", "path": "/files", "icon": "folder", "category": "More"},
    {"name": "Workflows", "description": "Automation workflows", "path": "/workflows", "icon": "cog", "category": "More"},
    {"name": "Settings", "description": "System settings and preferences", "path": "/settings", "icon": "cog", "category": "More"},
    
    # SMS Sub-pages
    {"name": "SMS Templates", "description": "Manage SMS templates", "path": "/sms-templates", "icon": "document", "category": "SMS"},
    {"name": "SMS Analytics", "description": "SMS performance analytics", "path": "/sms-analytics", "icon": "chart", "category": "SMS"},
    {"name": "Scheduled SMS", "description": "View scheduled messages", "path": "/sms-scheduled", "icon": "clock", "category": "SMS"},
    
    # User
    {"name": "Profile", "description": "Your user profile", "path": "/profile", "icon": "user", "category": "User"},
    {"name": "Notifications", "description": "View notifications", "path": "/notifications", "icon": "bell", "category": "User"},
    {"name": "Team", "description": "Team management", "path": "/team", "icon": "users", "category": "User"},
]


@router.get("/", response_model=NavigationSearchResponse)
async def navigation_search(
    q: str = Query(..., min_length=1, description="Search query"),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Search for pages and sections to navigate to
    """
    query_lower = q.lower().strip()
    
    # Filter navigation items based on query
    results = []
    for item in NAVIGATION_ITEMS:
        # Check if query matches name, description, or category
        if (query_lower in item["name"].lower() or 
            query_lower in item["description"].lower() or
            query_lower in item["category"].lower()):
            results.append(NavigationResult(
                name=item["name"],
                description=item["description"],
                path=item["path"],
                icon=item["icon"],
                category=item["category"]
            ))
    
    # Sort by relevance (exact name match first, then starts with, then contains)
    def sort_key(item):
        name_lower = item.name.lower()
        if name_lower == query_lower:
            return 0  # Exact match
        elif name_lower.startswith(query_lower):
            return 1  # Starts with
        else:
            return 2  # Contains
    
    results.sort(key=sort_key)
    
    return NavigationSearchResponse(
        query=q,
        results=results[:10]  # Limit to top 10 results
    )


@router.get("/global", response_model=GlobalSearchResponse)
async def global_search(
    q: str = Query(..., min_length=1, description="Search query"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Global search across all entities - contacts, deals, quotes, files, activities
    """
    query_lower = q.lower().strip()
    search_pattern = f"%{query_lower}%"
    
    context = get_tenant_context(current_user)
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    contacts_results = []
    deals_results = []
    quotes_results = []
    files_results = []
    activities_results = []
    pages_results = []
    
    # Search Contacts
    try:
        contacts_query = db.query(Contact).filter(Contact.is_deleted == False)
        if not context.is_super_admin() and company_id:
            contacts_query = contacts_query.filter(Contact.company_id == company_id)
        
        contacts_query = contacts_query.filter(
            or_(
                Contact.first_name.ilike(search_pattern),
                Contact.last_name.ilike(search_pattern),
                Contact.email.ilike(search_pattern),
                Contact.phone.ilike(search_pattern),
                Contact.company_name.ilike(search_pattern)
            )
        ).limit(5)
        
        for contact in contacts_query.all():
            contacts_results.append(GlobalSearchResult(
                id=str(contact.id),
                type="contact",
                title=f"{contact.first_name} {contact.last_name}",
                subtitle=contact.email,
                description=contact.company_name,
                path=f"/contacts?highlight={contact.id}",
                icon="users"
            ))
    except Exception as e:
        print(f"Error searching contacts: {e}")
    
    # Search Deals
    try:
        deals_query = db.query(Deal).filter(Deal.is_deleted == False)
        if not context.is_super_admin() and company_id:
            deals_query = deals_query.filter(Deal.company_id == company_id)
        
        deals_query = deals_query.filter(
            or_(
                Deal.title.ilike(search_pattern),
                Deal.description.ilike(search_pattern)
            )
        ).limit(5)
        
        for deal in deals_query.all():
            deals_results.append(GlobalSearchResult(
                id=str(deal.id),
                type="deal",
                title=deal.title,
                subtitle=f"${deal.value:,.2f}" if deal.value else None,
                description=deal.stage if hasattr(deal, 'stage') else None,
                path=f"/deals?highlight={deal.id}",
                icon="currency"
            ))
    except Exception as e:
        print(f"Error searching deals: {e}")
    
    # Search Quotes
    try:
        quotes_query = db.query(Quote).filter(Quote.is_deleted == False)
        if not context.is_super_admin() and company_id:
            quotes_query = quotes_query.filter(Quote.company_id == company_id)
        
        quotes_query = quotes_query.filter(
            or_(
                Quote.title.ilike(search_pattern),
                Quote.quote_number.ilike(search_pattern),
                Quote.description.ilike(search_pattern)
            )
        ).limit(5)
        
        for quote in quotes_query.all():
            quotes_results.append(GlobalSearchResult(
                id=str(quote.id),
                type="quote",
                title=quote.title,
                subtitle=f"${float(quote.amount):,.2f}" if quote.amount else None,
                description=f"#{quote.quote_number} - {quote.status.value if hasattr(quote.status, 'value') else quote.status}",
                path=f"/quotes?highlight={quote.id}",
                icon="document"
            ))
    except Exception as e:
        print(f"Error searching quotes: {e}")
    
    # Search Files/Documents
    try:
        files_query = db.query(Document).filter(Document.is_deleted == False)
        if not context.is_super_admin() and company_id:
            files_query = files_query.filter(Document.company_id == company_id)
        
        files_query = files_query.filter(
            or_(
                Document.name.ilike(search_pattern),
                Document.description.ilike(search_pattern)
            )
        ).limit(5)
        
        for doc in files_query.all():
            files_results.append(GlobalSearchResult(
                id=str(doc.id),
                type="file",
                title=doc.name,
                subtitle=doc.file_type if hasattr(doc, 'file_type') else None,
                description=doc.description,
                path=f"/files?highlight={doc.id}",
                icon="folder"
            ))
    except Exception as e:
        print(f"Error searching files: {e}")
    
    # Search Activities
    try:
        activities_query = db.query(Activity).filter(Activity.is_deleted == False)
        if not context.is_super_admin() and company_id:
            activities_query = activities_query.filter(Activity.company_id == company_id)
        
        activities_query = activities_query.filter(
            or_(
                Activity.title.ilike(search_pattern),
                Activity.description.ilike(search_pattern)
            )
        ).limit(5)
        
        for activity in activities_query.all():
            activities_results.append(GlobalSearchResult(
                id=str(activity.id),
                type="activity",
                title=activity.title,
                subtitle=activity.activity_type.value if hasattr(activity.activity_type, 'value') else str(activity.activity_type),
                description=activity.description[:100] if activity.description else None,
                path=f"/activities?highlight={activity.id}",
                icon="calendar"
            ))
    except Exception as e:
        print(f"Error searching activities: {e}")
    
    # Search Pages (navigation)
    for item in NAVIGATION_ITEMS:
        if (query_lower in item["name"].lower() or 
            query_lower in item["description"].lower()):
            pages_results.append(NavigationResult(
                name=item["name"],
                description=item["description"],
                path=item["path"],
                icon=item["icon"],
                category=item["category"]
            ))
    pages_results = pages_results[:5]
    
    total_count = (
        len(contacts_results) + 
        len(deals_results) + 
        len(quotes_results) + 
        len(files_results) + 
        len(activities_results) + 
        len(pages_results)
    )
    
    return GlobalSearchResponse(
        query=q,
        total_count=total_count,
        contacts=contacts_results,
        deals=deals_results,
        quotes=quotes_results,
        files=files_results,
        activities=activities_results,
        pages=pages_results
    )
