"""
Global Search API - Search across all entities (contacts, deals, quotes, files, activities, 
pipelines, workflows, emails, SMS, calls, etc.)
"""

from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
import uuid
import urllib.parse

from app.core.security import get_current_active_user
from app.core.database import get_db
from app.models.contacts import Contact
from app.models.deals import Deal, Pipeline, PipelineStage
from app.models.quotes import Quote
from app.models.activities import Activity
from app.models.documents import Document
from app.models.files import File
from app.models.workflows import Workflow
from app.models.emails import Email, EmailTemplate
from app.models.sms import SMSMessage
from app.models.calls import Call
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
    pipelines: List[GlobalSearchResult]
    workflows: List[GlobalSearchResult]
    emails: List[GlobalSearchResult]
    sms: List[GlobalSearchResult]
    calls: List[GlobalSearchResult]
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
    Global search across all entities - contacts, deals, quotes, files, activities,
    pipelines, workflows, emails, SMS, calls
    """
    query_lower = q.lower().strip()
    search_pattern = f"%{query_lower}%"
    
    context = get_tenant_context(current_user)
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    user_id = uuid.UUID(current_user["id"]) if current_user.get("id") else None
    
    contacts_results = []
    deals_results = []
    quotes_results = []
    files_results = []
    activities_results = []
    pipelines_results = []
    workflows_results = []
    emails_results = []
    sms_results = []
    calls_results = []
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
                Contact.company.ilike(search_pattern)
            )
        ).limit(5)
        
        for contact in contacts_query.all():
            contacts_results.append(GlobalSearchResult(
                id=str(contact.id),
                type="contact",
                title=f"{contact.first_name} {contact.last_name}",
                subtitle=contact.email,
                description=contact.company,
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
                description=deal.status.value if hasattr(deal.status, 'value') else str(deal.status),
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
    
    # Search Files
    try:
        files_query = db.query(File).filter(File.is_deleted == False)
        if not context.is_super_admin() and company_id:
            files_query = files_query.filter(File.company_id == company_id)
        
        files_query = files_query.filter(
            or_(
                File.name.ilike(search_pattern),
                File.original_name.ilike(search_pattern),
                File.description.ilike(search_pattern)
            )
        ).limit(5)
        
        for file in files_query.all():
            files_results.append(GlobalSearchResult(
                id=str(file.id),
                type="file",
                title=file.name,
                subtitle=file.file_type if file.file_type else None,
                description=file.description,
                path=f"/files?highlight={file.id}",
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
                Activity.subject.ilike(search_pattern),
                Activity.description.ilike(search_pattern)
            )
        ).limit(5)
        
        for activity in activities_query.all():
            # Use subject for highlight so the search bar shows the name, not the ID
            highlight_value = urllib.parse.quote(activity.subject or '', safe='')
            activities_results.append(GlobalSearchResult(
                id=str(activity.id),
                type="activity",
                title=activity.subject,
                subtitle=activity.type.value if hasattr(activity.type, 'value') else str(activity.type),
                description=activity.description[:100] if activity.description else None,
                path=f"/activities?highlight={highlight_value}",
                icon="calendar"
            ))
    except Exception as e:
        print(f"Error searching activities: {e}")
    
    # Search Pipelines & Pipeline Stages
    try:
        # Search Pipelines
        pipelines_query = db.query(Pipeline).filter(Pipeline.is_deleted == False)
        if not context.is_super_admin() and company_id:
            pipelines_query = pipelines_query.filter(Pipeline.company_id == company_id)
        
        pipelines_query = pipelines_query.filter(
            or_(
                Pipeline.name.ilike(search_pattern),
                Pipeline.description.ilike(search_pattern)
            )
        ).limit(3)
        
        for pipeline in pipelines_query.all():
            pipelines_results.append(GlobalSearchResult(
                id=str(pipeline.id),
                type="pipeline",
                title=pipeline.name,
                subtitle="Pipeline",
                description=pipeline.description,
                path=f"/pipeline-settings?highlight={pipeline.id}",
                icon="chart"
            ))
        
        # Search Pipeline Stages
        stages_query = db.query(PipelineStage).filter(PipelineStage.is_deleted == False)
        stages_query = stages_query.filter(
            or_(
                PipelineStage.name.ilike(search_pattern),
                PipelineStage.description.ilike(search_pattern)
            )
        ).limit(3)
        
        for stage in stages_query.all():
            pipelines_results.append(GlobalSearchResult(
                id=str(stage.id),
                type="pipeline_stage",
                title=stage.name,
                subtitle=f"Stage - {stage.probability}% probability",
                description=stage.description,
                path=f"/pipeline-settings?highlight={stage.id}",
                icon="chart"
            ))
    except Exception as e:
        print(f"Error searching pipelines: {e}")
    
    # Search Workflows
    try:
        workflows_query = db.query(Workflow).filter(Workflow.is_deleted == False)
        
        # Apply company filter - include company workflows AND global workflows (company_id is NULL)
        if not context.is_super_admin() and company_id:
            workflows_query = workflows_query.filter(
                or_(
                    Workflow.company_id == company_id,
                    Workflow.company_id.is_(None)  # Include global workflows
                )
            )
        # Super admin sees all workflows, no filter needed
        
        # Search by name (and description if not NULL)
        workflows_query = workflows_query.filter(
            or_(
                Workflow.name.ilike(search_pattern),
                and_(
                    Workflow.description.isnot(None),
                    Workflow.description.ilike(search_pattern)
                )
            )
        ).limit(5)
        
        workflows_found = workflows_query.all()
        print(f"Workflows search for '{query_lower}': found {len(workflows_found)} workflows, company_id={company_id}")
        
        for workflow in workflows_found:
            trigger_display = workflow.trigger_type.value if hasattr(workflow.trigger_type, 'value') else str(workflow.trigger_type)
            workflows_results.append(GlobalSearchResult(
                id=str(workflow.id),
                type="workflow",
                title=workflow.name,
                subtitle=f"{workflow.status.value if hasattr(workflow.status, 'value') else str(workflow.status)} - {trigger_display}",
                description=workflow.description[:100] if workflow.description else None,
                path=f"/workflows?highlight={workflow.id}",
                icon="cog"
            ))
    except Exception as e:
        print(f"Error searching workflows: {e}")
        import traceback
        traceback.print_exc()
    
    # Search Emails
    try:
        emails_query = db.query(Email).filter(Email.is_deleted == False)
        if not context.is_super_admin() and company_id:
            emails_query = emails_query.filter(Email.company_id == company_id)
        
        emails_query = emails_query.filter(
            or_(
                Email.subject.ilike(search_pattern),
                Email.to_email.ilike(search_pattern),
                Email.from_email.ilike(search_pattern)
            )
        ).limit(5)
        
        for email in emails_query.all():
            emails_results.append(GlobalSearchResult(
                id=str(email.id),
                type="email",
                title=email.subject,
                subtitle=f"To: {email.to_email}",
                description=f"From: {email.from_email}",
                path=f"/inbox?highlight={email.id}",
                icon="envelope"
            ))
    except Exception as e:
        print(f"Error searching emails: {e}")
    
    # Search SMS Messages
    try:
        sms_query = db.query(SMSMessage).filter(SMSMessage.is_deleted == False)
        if not context.is_super_admin() and company_id:
            sms_query = sms_query.filter(SMSMessage.company_id == company_id)
        
        sms_query = sms_query.filter(
            or_(
                SMSMessage.body.ilike(search_pattern),
                SMSMessage.to_address.ilike(search_pattern),
                SMSMessage.from_address.ilike(search_pattern)
            )
        ).limit(5)
        
        for sms in sms_query.all():
            sms_results.append(GlobalSearchResult(
                id=str(sms.id),
                type="sms",
                title=sms.body[:50] + "..." if len(sms.body) > 50 else sms.body,
                subtitle=f"To: {sms.to_address}",
                description=f"{sms.direction.value} - {sms.status.value}" if hasattr(sms.direction, 'value') else str(sms.direction),
                path=f"/sms?highlight={sms.id}",
                icon="chat"
            ))
    except Exception as e:
        print(f"Error searching SMS: {e}")
    
    # Search Calls
    try:
        calls_query = db.query(Call).filter(Call.is_deleted == False)
        if not context.is_super_admin() and company_id:
            calls_query = calls_query.filter(Call.company_id == company_id)
        
        calls_query = calls_query.filter(
            or_(
                Call.to_address.ilike(search_pattern),
                Call.from_address.ilike(search_pattern)
            )
        ).limit(5)
        
        for call in calls_query.all():
            duration_str = f"{call.duration // 60}m {call.duration % 60}s" if call.duration else "0s"
            calls_results.append(GlobalSearchResult(
                id=str(call.id),
                type="call",
                title=f"Call to {call.to_address}" if call.direction.value == "OUTBOUND" else f"Call from {call.from_address}",
                subtitle=f"Duration: {duration_str}",
                description=f"{call.direction.value} - {call.status.value}" if hasattr(call.direction, 'value') else str(call.direction),
                path=f"/calls?highlight={call.id}",
                icon="phone"
            ))
    except Exception as e:
        print(f"Error searching calls: {e}")
    
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
        len(pipelines_results) +
        len(workflows_results) +
        len(emails_results) +
        len(sms_results) +
        len(calls_results) +
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
        pipelines=pipelines_results,
        workflows=workflows_results,
        emails=emails_results,
        sms=sms_results,
        calls=calls_results,
        pages=pages_results
    )
