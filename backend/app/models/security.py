"""
Security and Audit Log models
"""

from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from .base import BaseModel
from datetime import datetime
import enum


class AuditAction(str, enum.Enum):
    """Audit action enum"""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    EXPORT = "export"
    IMPORT = "import"


class SecurityEventType(str, enum.Enum):
    """Security event type enum"""
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_CHANGED = "password_changed"
    PASSWORD_RESET = "password_reset"
    ACCOUNT_LOCKED = "account_locked"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    PERMISSION_DENIED = "permission_denied"


class AuditLog(BaseModel):
    """Audit Log model"""
    __tablename__ = 'audit_logs'
    
    # User Information
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), index=True)
    user_email = Column(String(255), index=True)
    
    # Action Information
    action = Column(SQLEnum(AuditAction), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False, index=True)  # e.g., "deal", "contact"
    resource_id = Column(UUID(as_uuid=True), index=True)
    
    # Details
    description = Column(Text)
    changes = Column(JSONB)  # Before/after values for updates
    
    # Request Information
    ip_address = Column(INET)
    user_agent = Column(String(500))
    request_method = Column(String(10))
    request_path = Column(String(500))
    
    # Additional data
    extra_data = Column(JSONB)
    
    # Relationships
    user = relationship('User')
    
    def __repr__(self):
        return f"<AuditLog {self.action} on {self.resource_type} by {self.user_email}>"


class SecurityLog(BaseModel):
    """Security Log model"""
    __tablename__ = 'security_logs'
    
    # Event Information
    event_type = Column(SQLEnum(SecurityEventType), nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True)  # low, medium, high, critical
    
    # User Information
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), index=True)
    user_email = Column(String(255), index=True)
    
    # Details
    description = Column(Text, nullable=False)
    details = Column(JSONB)
    
    # Request Information
    ip_address = Column(INET, index=True)
    user_agent = Column(String(500))
    location = Column(String(255))  # Geo-location if available
    
    # Response
    action_taken = Column(String(255))  # What action was taken in response
    
    # Relationships
    user = relationship('User')
    
    def __repr__(self):
        return f"<SecurityLog {self.event_type} - {self.severity}>"


class Session(BaseModel):
    """User Session model"""
    __tablename__ = 'sessions'
    
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    token = Column(String(500), unique=True, nullable=False, index=True)
    
    # Session Information
    ip_address = Column(INET)
    user_agent = Column(String(500))
    device_type = Column(String(50))  # desktop, mobile, tablet
    browser = Column(String(100))
    os = Column(String(100))
    
    # Dates
    expires_at = Column(DateTime, nullable=False, index=True)
    last_activity_at = Column(DateTime, default=datetime.utcnow)
    
    # Status
    is_revoked = Column(Boolean, default=False)
    revoked_at = Column(DateTime)
    revoked_reason = Column(String(255))
    
    # Relationships
    user = relationship('User')
    
    def __repr__(self):
        return f"<Session for user {self.user_id}>"
