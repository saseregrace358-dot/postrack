
from sqlalchemy.orm import Session

from app.models.subscription_plan import SubscriptionPlan


def seed_subscription_plans(db: Session):

    plans = [
        {
            "name": "Free Trial",
            "price": 0,
            "monthly_price_ngn": 0,
            "monthly_price_usd": 0,
            "yearly_price_ngn": 0,
            "yearly_price_usd": 0,
            "duration_value": 14,
            "duration_unit": "days",
            "description": "14-day full-access free trial",
            "max_employees": -1,
            "max_products": -1,
            
            "max_sales": -1,
            "ai_enabled": True,
            "reports_enabled": True,
            "export_enabled": True,
            "notifications_enabled": True,
            "custom_pricing": False,
            "active": True,
        },
        {
            "name": "Essential",
            "price": 2500,
            "monthly_price_ngn": 2500,
            "monthly_price_usd": 3,
            "yearly_price_ngn": 27600,
            "yearly_price_usd": 36,
            "duration_value": 1,
            "duration_unit": "months",
            "description": "Essential tools for small businesses.",
            "max_employees": 3,
            "max_products": 500,
            
            "max_sales": -1,
            "ai_enabled": False,
            "reports_enabled": True,
            "export_enabled": False,
            "notifications_enabled": True,
            "custom_pricing": False,
            "active": True,
        },
        {
            "name": "Business Plus",
            "price": 5000,
            "monthly_price_ngn": 5000,
            "monthly_price_usd": 4,
            "yearly_price_ngn": 54000,
            "yearly_price_usd": 48,
            "duration_value": 1,
            "duration_unit": "months",
            "description": "Advanced tools for growing businesses.",
            "max_employees": 20,
            "max_products": 5000,
           
            "max_sales": -1,
            "ai_enabled": True,
            "reports_enabled": True,
            "export_enabled": True,
            "notifications_enabled": True,
            "custom_pricing": False,
            "active": True,
        },
        {
            "name": "Enterprise",
            "price": 0,
            "monthly_price_ngn": 0,
            "monthly_price_usd": 0,
            "yearly_price_ngn": 0,
            "yearly_price_usd": 0,
            "duration_value": 1,
            "duration_unit": "months",
            "description": (
                "Custom solutions, usage limits, and pricing "
                "for enterprise businesses. Contact us for a quotation."
            ),
            "max_employees": -1,
            "max_products": -1,
            
            "max_sales": -1,
            "ai_enabled": True,
            "reports_enabled": True,
            "export_enabled": True,
            "notifications_enabled": True,
            "custom_pricing": True,
            "active": True,
        },
    ]

    try:
        for plan_data in plans:
            existing = (
                db.query(SubscriptionPlan)
                .filter(
                    SubscriptionPlan.name.ilike(
                        plan_data["name"]
                    )
                )
                .first()
            )

            if existing:
                for key, value in plan_data.items():
                    setattr(existing, key, value)
            else:
                db.add(
                    SubscriptionPlan(**plan_data)
                )

        # Disable obsolete plans without deleting their records.
        obsolete_plans = ["Starter", "Professional"]

        for obsolete_name in obsolete_plans:
            old_plan = (
                db.query(SubscriptionPlan)
                .filter(
                    SubscriptionPlan.name.ilike(obsolete_name)
                )
                .first()
            )

            if old_plan:
                old_plan.active = False

        db.commit()

    except Exception:
        db.rollback()
        raise
