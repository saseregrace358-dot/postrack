"""Add return currency history

Revision ID: 57d0b3bfcfe4
Revises: 3580773c75be
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "57d0b3bfcfe4"
down_revision: Union[str, Sequence[str], None] = "3580773c75be"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add currency columns as nullable first.
    op.add_column(
        "return_records",
        sa.Column("base_currency", sa.String(length=3), nullable=True),
    )

    op.add_column(
        "return_records",
        sa.Column("currency_at_return", sa.String(length=3), nullable=True),
    )

    op.add_column(
        "return_records",
        sa.Column(
            "exchange_rate_at_return",
            sa.Numeric(precision=20, scale=10),
            nullable=True,
        ),
    )

    op.add_column(
        "return_records",
        sa.Column("original_amounts", sa.JSON(), nullable=True),
    )

    # Backfill existing records using their linked sale.
    op.execute("""
        UPDATE return_records AS r
        SET
            base_currency = COALESCE(s.base_currency, 'NGN'),
            currency_at_return = COALESCE(
                s.currency_at_sale,
                s.base_currency,
                'NGN'
            ),
            exchange_rate_at_return = COALESCE(
                s.exchange_rate_at_sale,
                1
            )
        FROM sales AS s
        WHERE r.sale_id = s.id
    """)

    # Fallback for any return record without a matching sale.
    op.execute("""
        UPDATE return_records
        SET
            base_currency = COALESCE(base_currency, 'NGN'),
            currency_at_return = COALESCE(currency_at_return, 'NGN'),
            exchange_rate_at_return = COALESCE(
                exchange_rate_at_return,
                1
            )
        WHERE
            base_currency IS NULL
            OR currency_at_return IS NULL
            OR exchange_rate_at_return IS NULL
    """)

    # Make the required currency fields non-nullable.
    op.alter_column(
        "return_records",
        "base_currency",
        existing_type=sa.String(length=3),
        nullable=False,
    )

    op.alter_column(
        "return_records",
        "currency_at_return",
        existing_type=sa.String(length=3),
        nullable=False,
    )

    op.alter_column(
        "return_records",
        "exchange_rate_at_return",
        existing_type=sa.Numeric(precision=20, scale=10),
        nullable=False,
    )


def downgrade() -> None:
    op.drop_column("return_records", "original_amounts")
    op.drop_column("return_records", "exchange_rate_at_return")
    op.drop_column("return_records", "currency_at_return")
    op.drop_column("return_records", "base_currency")