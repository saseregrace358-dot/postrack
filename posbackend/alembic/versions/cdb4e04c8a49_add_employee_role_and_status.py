
"""Add employee role and status

Revision ID: cdb4e04c8a49
Revises: add_plan_currency_prices
Create Date: 2026-11-25 05:05:25.813473
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Revision identifiers
revision: str = "cdb4e04c8a49"
down_revision: Union[str, Sequence[str], None] = "add_plan_currency_prices"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add role, status, and updated_at to employees."""

    op.add_column(
        "employees",
        sa.Column(
            "role",
            sa.String(length=50),
            nullable=False,
            server_default="Employee",
        ),
    )

    op.add_column(
        "employees",
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="active",
        ),
    )

    op.add_column(
        "employees",
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    """Remove employee role, status, and updated_at."""

    op.drop_column("employees", "updated_at")
    op.drop_column("employees", "status")
    op.drop_column("employees", "role")
