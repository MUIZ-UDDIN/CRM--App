"""
Global Search API endpoints
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List, Optional
from pydantic import BaseModel
import uuid

from app.core.security import get_current_active_user
from app.core.database import get_db
from app.models.deals import Deal
from app.models.contacts import Contact
from app.models.activities import Activity
from app.models.documents import Document
from app.models.quotes import Quote

router = APIRouter(tags=["Search"])


class SearchResult(BaseModel):
    id: str
    type: str  # deal, contact, activity, file, quote
    title: str
    description: Optional[str] = None
    value: Optional[str] = None
    link: str
    
    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    query: str
    total_results: int
    deals: List[SearchResult]
    contacts: List[SearchResult]
    activities: List[SearchResult]
    files: List[SearchResult]
    quotes: List[SearchResult]


@router.get("/", response_model=SearchResponse)
async def global_search(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, description="Max results per category"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Global search across deals, contacts, activities, files, and quotes
    """
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    search_term = f"%{q.lower()}%"
    
    # Search Deals
    deals_query = db.query(Deal).filter(
        and_(
            Deal.is_deleted == False,
            Deal.company_id == company_id,
            or_(
                func.lower(Deal.title).like(search_term),
                func.lower(Deal.company).like(search_term),
                func.lower(Deal.description).like(search_term)
            )
        )
    ).limit(limit)
    
    deals = [
        SearchResult(
            id=str(d.id),
            type="deal",
            title=d.title,
            description=d.company or "",
            value=f"${d.value:,.2f}" if d.value else None,
            link=f"/deals?id={d.id}"
        )
        for d in deals_query.all()
    ]
    
    # Search Contacts
    contacts_query = db.query(Contact).filter(
        and_(
            Contact.is_deleted == False,
            Contact.company_id == company_id,
            or_(
                func.lower(Contact.first_name).like(search_term),
                func.lower(Contact.last_name).like(search_term),
                func.lower(Contact.email).like(search_term),
                func.lower(Contact.company).like(search_term),
                func.lower(Contact.phone).like(search_term)
            )
        )
    ).limit(limit)
    
    contacts = [
        SearchResult(
            id=str(c.id),
            type="contact",
            title=f"{c.first_name} {c.last_name}",
            description=c.company or c.email or "",
            value=c.phone,
            link=f"/contacts?id={c.id}"
        )
        for c in contacts_query.all()
    ]
    
    # Search Activities
    activities_query = db.query(Activity).filter(
        and_(
            Activity.is_deleted == False,
            Activity.company_id == company_id,
            or_(
                func.lower(Activity.title).like(search_term),
                func.lower(Activity.description).like(search_term),
                func.lower(Activity.type).like(search_term)
            )
        )
    ).limit(limit)
    
    activities = [
        SearchResult(
            id=str(a.id),
            type="activity",
            title=a.title,
            description=a.type or "",
            value=a.due_date.strftime("%Y-%m-%d") if a.due_date else None,
            link=f"/activities?id={a.id}"
        )
        for a in activities_query.all()
    ]
    
    # Search Files/Documents
    files_query = db.query(Document).filter(
        and_(
            Document.is_deleted == False,
            Document.company_id == company_id,
            or_(
                func.lower(Document.name).like(search_term),
                func.lower(Document.description).like(search_term)
            )
        )
    ).limit(limit)
    
    files = [
        SearchResult(
            id=str(f.id),
            type="file",
            title=f.name,
            description=f.description or "",
            value=f.file_type,
            link=f"/files?id={f.id}"
        )
        for f in files_query.all()
    ]
    
    # Search Quotes
    quotes_query = db.query(Quote).filter(
        and_(
            Quote.is_deleted == False,
            Quote.company_id == company_id,
            or_(
                func.lower(Quote.title).like(search_term),
                func.lower(Quote.description).like(search_term)
            )
        )
    ).limit(limit)
    
    quotes = [
        SearchResult(
            id=str(q.id),
            type="quote",
            title=q.title,
            description=q.description or "",
            value=f"${q.total_amount:,.2f}" if q.total_amount else None,
            link=f"/quotes?id={q.id}"
        )
        for q in quotes_query.all()
    ]
    
    total_results = len(deals) + len(contacts) + len(activities) + len(files) + len(quotes)
    
    return SearchResponse(
        query=q,
        total_results=total_results,
        deals=deals,
        contacts=contacts,
        activities=activities,
        files=files,
        quotes=quotes
    )
