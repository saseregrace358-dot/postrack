
"""add policy acceptance fields to users

Revision ID: 29c115220701
Revises: 57046e390904
Create Date: 2026-11-01 23:10:29.871110
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '29c115220701'
down_revision: Union[str, Sequence[str], None] = '57046e390904'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.add_column(
        'users',
        sa.Column('terms_accepted_at', sa.DateTime(), nullable=True)
    )

    op.add_column(
        'users',
        sa.Column('terms_version', sa.String(), nullable=True)
    )

    op.add_column(
        'users',
        sa.Column('privacy_policy_accepted_at', sa.DateTime(), nullable=True)
    )

    op.add_column(
        'users',
        sa.Column('privacy_policy_version', sa.String(), nullable=True)
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_column('users', 'privacy_policy_version')
    op.drop_column('users', 'privacy_policy_accepted_at')
    op.drop_column('users', 'terms_version')
    op.drop_column('users', 'terms_accepted_at')
