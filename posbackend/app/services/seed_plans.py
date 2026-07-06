from sqlalchemy.orm import Session

from app.models.subscription_plan import SubscriptionPlan


def seed_subscription_plans(db: Session):

    plans = [
        {
            "name": "Free",
            "price": 0,
            "duration_days": 36500,
            "max_products": 100,
            "max_employees": 2,
            "max_customers": 100,
            "ai_enabled": False,
            "reports_enabled": False,
            "notifications_enabled": True,
        },
        {
            "name": "Starter",
            "price": 5000,
            "duration_days": 30,
            "max_products": 500,
            "max_employees": 5,
            "max_customers": 1000,
            "ai_enabled": False,
            "reports_enabled": True,
            "notifications_enabled": True,
        },
        {
            "name": "Professional",
            "price": 15000,
            "duration_days": 30,
            "max_products": 5000,
            "max_employees": 20,
            "max_customers": 10000,
            "ai_enabled": True,
            "reports_enabled": True,
            "notifications_enabled": True,
        },
        {
            "name": "Enterprise",
            "price": 30000,
            "duration_days": 30,
            "max_products": 999999,
            "max_employees": 9999,
            "max_customers": 999999,
            "ai_enabled": True,
            "reports_enabled": True,
            "notifications_enabled": True,
        },
    ]

    for plan in plans:
        existing = (
            db.query(SubscriptionPlan)
            .filter(SubscriptionPlan.name == plan["name"])
            .first()
        )

        if not existing:
            db.add(SubscriptionPlan(**plan))

    db.commit()