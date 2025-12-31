"""Add deleted_for_user_ids to chat tables for per-user deletion

Revision ID: add_chat_deleted_for_user_ids
Revises: add_user_teams_table
Create Date: 2024-12-31

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY


# revision identifiers, used by Alembic.
revision = 'add_chat_deleted_for_user_ids'
down_revision = 'add_user_teams_table'
branch_labels = None
depends_on = None


def upgrade():
    # Add deleted_for_user_ids column to chat_conversations table
    op.add_column('chat_conversations', 
        sa.Column('deleted_for_user_ids', ARRAY(UUID(as_uuid=True)), nullable=True, default=[])
    )
    
    # Add deleted_for_user_ids column to chat_messages table
    op.add_column('chat_messages', 
        sa.Column('deleted_for_user_ids', ARRAY(UUID(as_uuid=True)), nullable=True, default=[])
    )


def downgrade():
    # Remove deleted_for_user_ids column from chat_messages table
    op.drop_column('chat_messages', 'deleted_for_user_ids')
    
    # Remove deleted_for_user_ids column from chat_conversations table
    op.drop_column('chat_conversations', 'deleted_for_user_ids')
