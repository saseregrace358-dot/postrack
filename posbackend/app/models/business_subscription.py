from sqlalchemy import Column, Integer, String, DateTime,  ForeignKey

from sqlalchemy.orm import relationship
from app.database import Base


class BusinessSubscription(Base):
    __tablename__ = "business_subscriptions"

    id = Column(Integer, primary_key=True, index=True)

    business_id = Column(String, unique=True, index=True)

    plan_id = Column(
        Integer,
        ForeignKey("subscription_plans.id"),
        nullable=False,
    )
    status = Column(String, default="active")
    plan = relationship("SubscriptionPlan")
    started_at = Column(DateTime)

    expires_at = Column(DateTime)