
"""Add subscription and payment currency fields

Revision ID: 2b1a8e2fe32b
Revises: 57d0b3bfcfe4
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "2b1a8e2fe32b"
down_revision: Union[str, Sequence[str], None] = "57d0b3bfcfe4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Historical payment values remain nullable because
    # their original currency and interval are not recorded.
    op.add_column(
        "payments",
        sa.Column(
            "billing_interval",
            sa.String(),
            nullable=True,
        ),
    )

    op.add_column(
        "payments",
        sa.Column(
            "payment_currency",
            sa.String(length=3),
            nullable=True,
        ),
    )

    # Add subscription billing information.
    op.add_column(
        "business_subscriptions",
        sa.Column(
            "billing_interval",
            sa.String(),
            nullable=True,
        ),
    )

    op.add_column(
        "business_subscriptions",
        sa.Column(
            "payment_currency",
            sa.String(length=3),
            nullable=True,
        ),
    )

    op.add_column(
        "business_subscriptions",
        sa.Column(
            "amount_paid",
            sa.Numeric(12, 2),
            nullable=True,
        ),
    )

    # Legacy subscriptions use the monthly interval.
    op.execute("""
        UPDATE business_subscriptions
        SET billing_interval = 'monthly'
        WHERE billing_interval IS NULL
    """)

    # Use the latest successful payment amount.
    # Pending payments are deliberately excluded.
    op.execute("""
        UPDATE business_subscriptions AS bs
        SET amount_paid = COALESCE(
            (
                SELECT p.amount::numeric(12, 2)
                FROM payments AS p
                WHERE
                    p.business_id = bs.business_id
                    AND LOWER(p.status) = 'success'
                ORDER BY
                    p.paid_at DESC NULLS LAST,
                    p.id DESC
                LIMIT 1
            ),
            0
        )
    """)

    op.alter_column(
        "business_subscriptions",
        "billing_interval",
        existing_type=sa.String(),
        nullable=False,
    )

    op.alter_column(
        "business_subscriptions",
        "amount_paid",
        existing_type=sa.Numeric(12, 2),
        nullable=False,
    )


def downgrade() -> None:
    op.drop_column(
        "business_subscriptions",
        "amount_paid",
    )

    op.drop_column(
        "business_subscriptions",
        "payment_currency",
    )

    op.drop_column(
        "business_subscriptions",
        "billing_interval",
    )

    op.drop_column(
        "payments",
        "payment_currency",
    )

    op.drop_column(
        "payments",
        "billing_interval",
    )
