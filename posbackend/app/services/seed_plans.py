from sqlalchemy.orm import Session

from app.models.subscription_plan import SubscriptionPlan


def seed_subscription_plans(db: Session):

    plans = [
    {
        "name": "Free",
        "price": 0,
        "duration_days": 14,
        "description": """
• Basic POS
• Inventory
• 1 Employees
• 100 Products
""",
        "max_employees": 1,
        "max_products": 100,
        "max_customers": 100,
        "max_sales": 100,
        "ai_enabled": False,
        "reports_enabled": False,
        "Export_enable": False,
        "notifications_enabled": False,
    },

    {
        "name": "Starter",
        "price": 5000,
        "duration_days": 30,
        "description": """POS
• POS
• Inventory
• Reports
• 3 Employees
• 500 Products
""",
        "max_employees": 3,
        "max_products": 500,
        "max_customers": 1000,
        "max_sales": 1000,
        "ai_enabled": False,
        "reports_enabled": True,
        "Export_enable": False,
        "notifications_enabled": True,
    },

    {
        "name": "Professional",
        "price": 15000,
        "duration_days": 30,
        "description": """Everything in Starter
AI
Advanced Reports
20 Employees
5000 Products
10000 Customers""",
        "max_employees": 20,
        "max_products": 5000,
        "max_customers": 10000,
        "max_sales": 10000,
        "ai_enabled": True,
        "reports_enabled": True,
        "Export_enable": True,
        "notifications_enabled": True,
    },

    {
        "name": "Enterprise",
        "price": 30000,
        "duration_days": 30,
        "description": """Unlimited Products
Unlimited Employees
Priority Support
Unlimited Sales
Export and backup files""",
        "max_employees": 9999,
        "max_products": 999999,
        "max_customers": 999999,
        "max_sales": 999999,
        "ai_enabled": True,
        "reports_enabled": True,
        "Export_enable": True,
        "notifications_enabled": True,
    }
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