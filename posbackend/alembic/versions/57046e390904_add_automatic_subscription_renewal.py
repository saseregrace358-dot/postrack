
"""add automatic subscription renewal

Revision ID: 57046e390904
Revises: 1ab5d8a022fd
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '57046e390904'
down_revision: Union[str, Sequence[str], None] = '1ab5d8a022fd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    # 1. Create saved payment methods table
    op.create_table(
        'payment_methods',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('business_id', sa.String(), nullable=False),
        sa.Column('authorization_code', sa.String(), nullable=False),
        sa.Column('authorization_signature', sa.String(), nullable=True),
        sa.Column('customer_email', sa.String(), nullable=False),
        sa.Column('card_type', sa.String(), nullable=True),
        sa.Column('last4', sa.String(), nullable=True),
        sa.Column('exp_month', sa.String(), nullable=True),
        sa.Column('exp_year', sa.String(), nullable=True),
        sa.Column('reusable', sa.Boolean(), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_index(
        'ix_payment_methods_business_id',
        'payment_methods',
        ['business_id'],
        unique=False
    )

    op.create_index(
        'ix_payment_methods_id',
        'payment_methods',
        ['id'],
        unique=False
    )

    # 2. Create automatic renewal settings table
    op.create_table(
        'subscription_renewal_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('business_id', sa.String(), nullable=False),
        sa.Column('payment_method_id', sa.Integer(), nullable=True),
        sa.Column('auto_renew_enabled', sa.Boolean(), nullable=False),
        sa.Column('consent_at', sa.DateTime(), nullable=True),
        sa.Column('next_charge_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),

        sa.ForeignKeyConstraint(
            ['payment_method_id'],
            ['payment_methods.id']
        ),

        sa.PrimaryKeyConstraint('id')
    )

    op.create_index(
        'ix_subscription_renewal_settings_business_id',
        'subscription_renewal_settings',
        ['business_id'],
        unique=True
    )

    op.create_index(
        'ix_subscription_renewal_settings_id',
        'subscription_renewal_settings',
        ['id'],
        unique=False
    )

    # 3. Add payment tracking fields.
    # Existing payments will be classified as initial payments.
    op.add_column(
        'payments',
        sa.Column(
            'payment_type',
            sa.String(),
            nullable=False,
            server_default='initial'
        )
    )

    # Remove the temporary database default.
    op.alter_column(
        'payments',
        'payment_type',
        server_default=None
    )

    op.add_column(
        'payments',
        sa.Column('renewal_key', sa.String(), nullable=True)
    )

    # Keep existing Payment model's required fields consistent.
    op.alter_column(
        'payments',
        'business_id',
        existing_type=sa.VARCHAR(),
        nullable=False
    )

    op.alter_column(
        'payments',
        'plan_id',
        existing_type=sa.INTEGER(),
        nullable=False
    )

    op.alter_column(
        'payments',
        'amount',
        existing_type=sa.DOUBLE_PRECISION(precision=53),
        nullable=False
    )

    op.alter_column(
        'payments',
        'provider',
        existing_type=sa.VARCHAR(),
        nullable=False
    )

    op.alter_column(
        'payments',
        'reference',
        existing_type=sa.VARCHAR(),
        nullable=False
    )

    op.alter_column(
        'payments',
        'status',
        existing_type=sa.VARCHAR(),
        nullable=False
    )

    op.create_index(
        'ix_payments_reference',
        'payments',
        ['reference'],
        unique=True
    )

    op.create_unique_constraint(
        'uq_payments_renewal_key',
        'payments',
        ['renewal_key']
    )

    # 4. Preserve existing subscription durations.
    op.add_column(
        'subscription_plans',
        sa.Column('duration_value', sa.Integer(), nullable=True)
    )

    op.add_column(
        'subscription_plans',
        sa.Column('duration_unit', sa.String(), nullable=True)
    )

    op.execute("""
        UPDATE subscription_plans
        SET duration_value = COALESCE(duration_days, 30),
            duration_unit = 'days'
    """)

    op.alter_column(
        'subscription_plans',
        'duration_value',
        nullable=False
    )

    op.alter_column(
        'subscription_plans',
        'duration_unit',
        nullable=False
    )

    op.drop_column('subscription_plans', 'duration_days')

    # max_customers is no longer used by the application.
    op.drop_column('subscription_plans', 'max_customers')


def downgrade() -> None:

    # Restore old subscription duration column.
    op.add_column(
        'subscription_plans',
        sa.Column('duration_days', sa.Integer(), nullable=True)
    )

    # Approximate conversion for any plans created after this migration.
    op.execute("""
        UPDATE subscription_plans
        SET duration_days = CASE
            WHEN duration_unit = 'days'
                THEN duration_value
            WHEN duration_unit = 'months'
                THEN duration_value * 30
            WHEN duration_unit = 'years'
                THEN duration_value * 365
            ELSE 30
        END
    """)

    op.alter_column(
        'subscription_plans',
        'duration_days',
        nullable=False
    )

    op.add_column(
        'subscription_plans',
        sa.Column('max_customers', sa.Integer(), nullable=True)
    )

    op.drop_column('subscription_plans', 'duration_unit')
    op.drop_column('subscription_plans', 'duration_value')

    op.drop_constraint(
        'uq_payments_renewal_key',
        'payments',
        type_='unique'
    )

    op.drop_index('ix_payments_reference', table_name='payments')

    op.drop_column('payments', 'renewal_key')
    op.drop_column('payments', 'payment_type')

    op.drop_table('subscription_renewal_settings')
    op.drop_table('payment_methods')
