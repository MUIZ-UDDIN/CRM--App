"""
Navigation Search API - Search for pages/sections to navigate to
"""

from fastapi import APIRouter, Depends, Query
from typing import List
from pydantic import BaseModel

from app.core.security import get_current_active_user

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
