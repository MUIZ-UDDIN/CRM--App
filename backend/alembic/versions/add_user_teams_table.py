"""add user_teams table for super admin multi-team support

Revision ID: add_user_teams_001
Revises: 
Create Date: 2025-12-01 00:47:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_user_teams_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create user_teams association table
    op.create_table(
        'user_teams',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('team_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('joined_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'team_id')
    )
    
    # Create index for faster lookups
    op.create_index('idx_user_teams_user_id', 'user_teams', ['user_id'])
    op.create_index('idx_user_teams_team_id', 'user_teams', ['team_id'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_user_teams_team_id', table_name='user_teams')
    op.drop_index('idx_user_teams_user_id', table_name='user_teams')
    
    # Drop table
    op.drop_table('user_teams')
