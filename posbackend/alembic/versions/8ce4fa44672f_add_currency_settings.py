
"""add currency settings

Revision ID: 8ce4fa44672f
Revises: 29c115220701
Create Date: 2026-11-03 19:59:47.515966
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8ce4fa44672f'
down_revision: Union[str, Sequence[str], None] = '29c115220701'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add currency settings to business_settings."""

    op.add_column(
        'business_settings',
        sa.Column(
            'base_currency',
            sa.String(length=3),
            nullable=False,
            server_default='NGN'
        )
    )

    op.add_column(
        'business_settings',
        sa.Column(
            'currency',
            sa.String(length=3),
            nullable=False,
            server_default='NGN'
        )
    )

    op.add_column(
        'business_settings',
        sa.Column(
            'exchange_rate',
            sa.Numeric(precision=20, scale=10),
            nullable=False,
            server_default='1'
        )
    )

    op.add_column(
        'business_settings',
        sa.Column(
            'exchange_rate_updated_at',
            sa.DateTime(),
            nullable=True
        )
    )

    op.add_column(
        'business_settings',
        sa.Column(
            'updated_at',
            sa.DateTime(),
            nullable=True
        )
    )

    # Populate updated_at for existing records.
    op.execute(
        """
        UPDATE business_settings
        SET updated_at = CURRENT_TIMESTAMP
        WHERE updated_at IS NULL
        """
    )

    # Make updated_at required after populating existing records.
    op.alter_column(
        'business_settings',
        'updated_at',
        existing_type=sa.DateTime(),
        nullable=False
    )


def downgrade() -> None:
    """Remove currency settings from business_settings."""

    op.drop_column('business_settings', 'updated_at')
    op.drop_column('business_settings', 'exchange_rate_updated_at')
    op.drop_column('business_settings', 'exchange_rate')
    op.drop_column('business_settings', 'currency')
    op.drop_column('business_settings', 'base_currency')
