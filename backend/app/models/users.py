"""
User and Role models
"""

from sqlalchemy import Column, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import BaseModel


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
    """User model"""
    __tablename__ = 'users'
    
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
    team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id', name='fk_user_team'))
    manager_id = Column(UUID(as_uuid=True), ForeignKey('users.id', name='fk_user_manager'))
    
    # Settings
    email_verified = Column(String, default=False)
    last_login = Column(String)
    role = Column(String(50), default="Regular User")  # User role
    
    # Relationships
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
    
    def __repr__(self):
        return f"<User {self.email}>"


class Team(BaseModel):
    """Team model"""
    __tablename__ = 'teams'
    
    name = Column(String(100), nullable=False, index=True)
    description = Column(String(500))
    team_lead_id = Column(UUID(as_uuid=True), ForeignKey('users.id', name='fk_team_lead'))
    
    # Relationships
    members = relationship('User', back_populates='team', foreign_keys='User.team_id')
    team_lead = relationship('User', foreign_keys=[team_lead_id])
