
"""Add currency pricing to subscription plans.

Revision ID: add_plan_currency_prices
Revises: 2b1a8e2fe32b
"""

from alembic import op
import sqlalchemy as sa


revision = "add_plan_currency_prices"
down_revision = "2b1a8e2fe32b"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "subscription_plans",
        sa.Column(
            "monthly_price_ngn",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),
    )

    op.add_column(
        "subscription_plans",
        sa.Column(
            "monthly_price_usd",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),
    )

    op.add_column(
        "subscription_plans",
        sa.Column(
            "yearly_price_ngn",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),
    )

    op.add_column(
        "subscription_plans",
        sa.Column(
            "yearly_price_usd",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),
    )

    op.add_column(
        "subscription_plans",
        sa.Column(
            "custom_pricing",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade():
    op.drop_column("subscription_plans", "custom_pricing")
    op.drop_column("subscription_plans", "yearly_price_usd")
    op.drop_column("subscription_plans", "yearly_price_ngn")
    op.drop_column("subscription_plans", "monthly_price_usd")
    op.drop_column("subscription_plans", "monthly_price_ngn")
