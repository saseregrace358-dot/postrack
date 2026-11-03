
"""add historical sale currency fields

Revision ID: 3580773c75be
Revises: 8ce4fa44672f
Create Date: 2026-11-03 20:46:59.688685
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3580773c75be'
down_revision: Union[str, Sequence[str], None] = '8ce4fa44672f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns as nullable first so existing sales are preserved.
    op.add_column(
        'sales',
        sa.Column('base_currency', sa.String(length=3), nullable=True)
    )

    op.add_column(
        'sales',
        sa.Column('currency_at_sale', sa.String(length=3), nullable=True)
    )

    op.add_column(
        'sales',
        sa.Column(
            'exchange_rate_at_sale',
            sa.Numeric(precision=20, scale=10),
            nullable=True
        )
    )

    op.add_column(
        'sales',
        sa.Column('original_amounts', sa.JSON(), nullable=True)
    )

    # Backfill existing sales using their business's original currency.
    # These sales predate currency conversion, so their historical
    # exchange rate is initialized to 1.
    op.execute("""
        UPDATE sales
        SET
            base_currency = COALESCE(
                (
                    SELECT bs.base_currency
                    FROM business_settings bs
                    WHERE bs.business_id = sales.business_id
                ),
                'NGN'
            ),
            currency_at_sale = COALESCE(
                (
                    SELECT bs.base_currency
                    FROM business_settings bs
                    WHERE bs.business_id = sales.business_id
                ),
                'NGN'
            ),
            exchange_rate_at_sale = 1
    """)

    # Enforce required fields after backfilling existing records.
    op.alter_column(
        'sales',
        'base_currency',
        existing_type=sa.String(length=3),
        nullable=False
    )

    op.alter_column(
        'sales',
        'currency_at_sale',
        existing_type=sa.String(length=3),
        nullable=False
    )

    op.alter_column(
        'sales',
        'exchange_rate_at_sale',
        existing_type=sa.Numeric(precision=20, scale=10),
        nullable=False
    )


def downgrade() -> None:
    op.drop_column('sales', 'original_amounts')
    op.drop_column('sales', 'exchange_rate_at_sale')
    op.drop_column('sales', 'currency_at_sale')
    op.drop_column('sales', 'base_currency')
