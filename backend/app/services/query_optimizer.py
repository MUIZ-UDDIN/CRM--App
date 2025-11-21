"""
Query Optimization Service
Provides optimized queries with proper indexing and pagination
"""

from sqlalchemy.orm import Session, Query
from sqlalchemy import and_, or_, func
from typing import List, Optional, Type, TypeVar, Generic
import uuid

T = TypeVar('T')


class QueryOptimizer:
    """Service to optimize database queries"""
    
    @staticmethod
    def paginate_query(
        query: Query,
        page: int = 1,
        page_size: int = 50,
        max_page_size: int = 1000
    ) -> tuple[List, dict]:
        """
        Paginate a query with proper limits
        
        Args:
            query: SQLAlchemy query
            page: Page number (1-indexed)
            page_size: Items per page
            max_page_size: Maximum allowed page size
            
        Returns:
            tuple of (results, pagination_info)
        """
        
        # Enforce max page size
        page_size = min(page_size, max_page_size)
        
        # Calculate offset
        offset = (page - 1) * page_size
        
        # Get total count (cached if possible)
        total_count = query.count()
        
        # Get paginated results
        results = query.offset(offset).limit(page_size).all()
        
        # Calculate pagination info
        total_pages = (total_count + page_size - 1) // page_size
        
        pagination_info = {
            "page": page,
            "page_size": page_size,
            "total_count": total_count,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
        
        return results, pagination_info
    
    @staticmethod
    def optimize_team_query(
        query: Query,
        team_id: uuid.UUID,
        model_class: Type[T]
    ) -> Query:
        """
        Optimize query for team-based filtering
        Uses proper indexing hints
        
        Args:
            query: Base query
            team_id: Team ID to filter by
            model_class: Model class being queried
            
        Returns:
            Optimized query
        """
        
        from app.models.users import User
        
        # Get team member IDs efficiently
        team_user_ids = query.session.query(User.id)\
            .filter(
                and_(
                    User.team_id == team_id,
                    User.is_deleted == False
                )
            )\
            .with_hint(User, 'USE INDEX (idx_team_id)')\
            .all()
        
        team_user_ids_list = [uid[0] for uid in team_user_ids]
        
        if not team_user_ids_list:
            # No team members, return empty query
            return query.filter(False)
        
        # Filter by owner_id with index hint
        if hasattr(model_class, 'owner_id'):
            query = query.filter(model_class.owner_id.in_(team_user_ids_list))
        
        return query
    
    @staticmethod
    def optimize_date_range_query(
        query: Query,
        model_class: Type[T],
        date_field: str,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> Query:
        """
        Optimize query with date range filtering
        
        Args:
            query: Base query
            model_class: Model class being queried
            date_field: Name of the date field (e.g., 'created_at')
            date_from: Start date (ISO format)
            date_to: End date (ISO format)
            
        Returns:
            Optimized query
        """
        
        from datetime import datetime, timedelta
        
        if not hasattr(model_class, date_field):
            return query
        
        field = getattr(model_class, date_field)
        
        if date_from:
            query = query.filter(field >= datetime.fromisoformat(date_from))
        
        if date_to:
            # Include entire end date
            end_date = datetime.fromisoformat(date_to) + timedelta(days=1)
            query = query.filter(field < end_date)
        
        return query
    
    @staticmethod
    def optimize_search_query(
        query: Query,
        model_class: Type[T],
        search_term: str,
        search_fields: List[str]
    ) -> Query:
        """
        Optimize full-text search query
        
        Args:
            query: Base query
            model_class: Model class being queried
            search_term: Search term
            search_fields: List of field names to search
            
        Returns:
            Optimized query
        """
        
        if not search_term or not search_fields:
            return query
        
        # Build OR conditions for each field
        conditions = []
        for field_name in search_fields:
            if hasattr(model_class, field_name):
                field = getattr(model_class, field_name)
                # Use ILIKE for case-insensitive search
                conditions.append(field.ilike(f"%{search_term}%"))
        
        if conditions:
            query = query.filter(or_(*conditions))
        
        return query
    
    @staticmethod
    def get_bulk_query_hints() -> dict:
        """
        Get recommended query hints for bulk operations
        
        Returns:
            dict of table -> index hints
        """
        
        return {
            "users": {
                "team_filter": "idx_team_id",
                "company_filter": "idx_company_id",
                "email_lookup": "idx_email"
            },
            "deals": {
                "owner_filter": "idx_owner_id",
                "company_filter": "idx_company_id",
                "status_filter": "idx_status",
                "date_filter": "idx_created_at"
            },
            "contacts": {
                "owner_filter": "idx_owner_id",
                "company_filter": "idx_company_id",
                "email_lookup": "idx_email",
                "date_filter": "idx_created_at"
            },
            "activities": {
                "owner_filter": "idx_owner_id",
                "company_filter": "idx_company_id",
                "date_filter": "idx_created_at",
                "type_filter": "idx_activity_type"
            }
        }
    
    @staticmethod
    def optimize_aggregation_query(
        db: Session,
        model_class: Type[T],
        group_by_field: str,
        aggregate_field: str,
        aggregate_func: str = "count",
        filters: Optional[List] = None
    ) -> List[tuple]:
        """
        Optimize aggregation queries (COUNT, SUM, AVG, etc.)
        
        Args:
            db: Database session
            model_class: Model class being queried
            group_by_field: Field to group by
            aggregate_field: Field to aggregate
            aggregate_func: Aggregation function (count, sum, avg, max, min)
            filters: Optional list of filter conditions
            
        Returns:
            List of (group_value, aggregate_value) tuples
        """
        
        if not hasattr(model_class, group_by_field):
            return []
        
        group_field = getattr(model_class, group_by_field)
        
        # Build aggregation
        if aggregate_func == "count":
            agg = func.count(getattr(model_class, aggregate_field))
        elif aggregate_func == "sum":
            agg = func.sum(getattr(model_class, aggregate_field))
        elif aggregate_func == "avg":
            agg = func.avg(getattr(model_class, aggregate_field))
        elif aggregate_func == "max":
            agg = func.max(getattr(model_class, aggregate_field))
        elif aggregate_func == "min":
            agg = func.min(getattr(model_class, aggregate_field))
        else:
            agg = func.count(getattr(model_class, aggregate_field))
        
        # Build query
        query = db.query(group_field, agg)
        
        # Apply filters
        if filters:
            query = query.filter(and_(*filters))
        
        # Group by
        query = query.group_by(group_field)
        
        return query.all()


class CachedQueryService:
    """Service for caching frequently accessed queries"""
    
    def __init__(self, cache_ttl: int = 300):
        """
        Initialize cache service
        
        Args:
            cache_ttl: Cache time-to-live in seconds (default 5 minutes)
        """
        self.cache_ttl = cache_ttl
        self._cache = {}
    
    def get_or_compute(
        self,
        cache_key: str,
        compute_func,
        *args,
        **kwargs
    ):
        """
        Get cached result or compute and cache
        
        Args:
            cache_key: Unique cache key
            compute_func: Function to compute result if not cached
            *args, **kwargs: Arguments for compute_func
            
        Returns:
            Cached or computed result
        """
        
        import time
        
        # Check cache
        if cache_key in self._cache:
            cached_data, timestamp = self._cache[cache_key]
            if time.time() - timestamp < self.cache_ttl:
                return cached_data
        
        # Compute result
        result = compute_func(*args, **kwargs)
        
        # Cache result
        self._cache[cache_key] = (result, time.time())
        
        return result
    
    def invalidate(self, cache_key: str):
        """Invalidate a specific cache key"""
        if cache_key in self._cache:
            del self._cache[cache_key]
    
    def clear(self):
        """Clear all cache"""
        self._cache.clear()
