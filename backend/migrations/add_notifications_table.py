"""
Add notifications table migration
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '0001_add_notifications_table'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Create notifications table"""
    op.create_table(
        'notifications',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('type', sa.String(50), nullable=False, default='info'),
        sa.Column('read', sa.Boolean, nullable=False, default=False, index=True),
        sa.Column('link', sa.String(500), nullable=True),
        sa.Column('extra_data', JSONB, nullable=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('company_id', UUID(as_uuid=True), sa.ForeignKey('companies.id'), nullable=True, index=True),
        sa.Column('created_at', sa.DateTime, nullable=False, default=datetime.utcnow),
        sa.Column('updated_at', sa.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow),
        sa.Column('is_deleted', sa.Boolean, nullable=False, default=False, index=True),
    )
    
    # Create indexes
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_company_id', 'notifications', ['company_id'])
    op.create_index('ix_notifications_read', 'notifications', ['read'])
    op.create_index('ix_notifications_is_deleted', 'notifications', ['is_deleted'])
    op.create_index('ix_notifications_created_at', 'notifications', ['created_at'])


def downgrade():
    """Drop notifications table"""
    op.drop_table('notifications')
