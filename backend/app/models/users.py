"""
User and Role models
"""

from sqlalchemy import Column, String, Boolean, ForeignKey, Table, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from .base import BaseModel


class UserRole(str, enum.Enum):
    """User role types for RBAC"""
    SUPER_ADMIN = "super_admin"
    COMPANY_ADMIN = "company_admin"
    COMPANY_USER = "company_user"
    SALES_MANAGER = "sales_manager"
    SALES_REP = "sales_rep"


class UserStatus(str, enum.Enum):
    """User status"""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING = "pending"


# Association table for many-to-many relationship between users and roles
user_roles = Table(
    'user_roles',
    BaseModel.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id'), primary_key=True),
    Column('role_id', UUID(as_uuid=True), ForeignKey('roles.id'), primary_key=True)
)


class Role(BaseModel):
    """Role model for RBAC"""
    __tablename__ = 'roles'
    
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255))
    permissions = Column(String)  # JSON string of permissions
    
    # Relationships
    users = relationship('User', secondary=user_roles, back_populates='roles')


class User(BaseModel):
    """User model with multi-tenant support"""
    __tablename__ = 'users'
    
    # Multi-tenant fields
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=True, index=True)  # NULL for super_admin
    user_role = Column(String(50), default='company_user', nullable=False, index=True)
    status = Column(String(50), default='active', nullable=False)
    
    # Basic info
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20))
    avatar_url = Column(String(500))
    timezone = Column(String(50), default='UTC')
    language = Column(String(10), default='en')
    
    # Profile fields
    title = Column(String(100))
    department = Column(String(100))
    location = Column(String(100))
    bio = Column(String(500))
    team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id', name='fk_user_team'))
    manager_id = Column(UUID(as_uuid=True), ForeignKey('users.id', name='fk_user_manager'))
    
    # Settings
    email_verified = Column(Boolean, default=False)
    last_login = Column(String)
    role = Column(String(50), default="Regular User")  # Legacy role field (keep for backward compatibility)
    
    # Password reset
    reset_code = Column(String(6))
    reset_code_expires = Column(DateTime)
    
    # Relationships
    company = relationship('Company', back_populates='users', foreign_keys=[company_id])
    roles = relationship('Role', secondary=user_roles, back_populates='users')
    team = relationship('Team', back_populates='members', foreign_keys=[team_id])
    manager = relationship('User', remote_side='User.id', backref='direct_reports')
    
    # Related entities
    contacts = relationship('Contact', back_populates='owner', foreign_keys='Contact.owner_id')
    deals = relationship('Deal', back_populates='owner', foreign_keys='Deal.owner_id')
    activities = relationship('Activity', back_populates='owner', foreign_keys='Activity.owner_id')
    sms_messages = relationship('SMSMessage', back_populates='user', foreign_keys='SMSMessage.user_id')
    calls = relationship('Call', back_populates='user', foreign_keys='Call.user_id')
    twilio_settings = relationship('TwilioSettings', back_populates='user', uselist=False)
    conversations = relationship('UserConversation', back_populates='user')
    
    def is_super_admin(self) -> bool:
        """Check if user is super admin"""
        return self.user_role == UserRole.SUPER_ADMIN
    
    def is_company_admin(self) -> bool:
        """Check if user is company admin"""
        return self.user_role == UserRole.COMPANY_ADMIN
    
    def can_manage_company(self) -> bool:
        """Check if user can manage company settings"""
        return self.user_role in [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN]
    
    def is_sales_manager(self) -> bool:
        """Check if user is a sales manager"""
        return self.user_role == UserRole.SALES_MANAGER
    
    def is_sales_rep(self) -> bool:
        """Check if user is a sales rep"""
        return self.user_role == UserRole.SALES_REP
    
    def can_manage_team(self) -> bool:
        """Check if user can manage team"""
        return self.user_role in [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.SALES_MANAGER]
    
    def __repr__(self):
        return f"<User {self.email}>"


class Team(BaseModel):
    """Team model"""
    __tablename__ = 'teams'
    
    name = Column(String(100), nullable=False, index=True)
    description = Column(String(500))
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False, index=True)
    team_lead_id = Column(UUID(as_uuid=True), ForeignKey('users.id', name='fk_team_lead'))
    
    # Relationships
    members = relationship('User', back_populates='team', foreign_keys='User.team_id')
    team_lead = relationship('User', foreign_keys=[team_lead_id])
    company = relationship('Company', back_populates='teams')
    
    def is_member(self, user_id: str) -> bool:
        """Check if user is a member of this team"""
        for member in self.members:
            if str(member.id) == str(user_id):
                return True
        return False
