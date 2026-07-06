from sqlalchemy import Column, Integer, String, DateTime
from app.database import Base


class BusinessSubscription(Base):
    __tablename__ = "business_subscriptions"

    id = Column(Integer, primary_key=True, index=True)

    business_id = Column(String, unique=True, index=True)

    plan_id = Column(Integer, nullable=False)

    status = Column(String, default="active")

    started_at = Column(DateTime)

    expires_at = Column(DateTime)