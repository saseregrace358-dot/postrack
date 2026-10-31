
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
)
from app.database import Base


class SubscriptionRenewalSettings(Base):
    __tablename__ = "subscription_renewal_settings"

    id = Column(Integer, primary_key=True, index=True)

    business_id = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    payment_method_id = Column(
        Integer,
        ForeignKey("payment_methods.id"),
        nullable=True,
    )

    # Customers must explicitly enable this.
    auto_renew_enabled = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    consent_at = Column(DateTime, nullable=True)

    next_charge_at = Column(DateTime, nullable=True)

    updated_at = Column(DateTime, nullable=True)
