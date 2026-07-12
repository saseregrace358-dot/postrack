from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.business_subscription import BusinessSubscription
from app.models.subscription_plan import SubscriptionPlan
from app.models.sale import Sale
from app.models.product import Product
from app.models.employee import Employee


async def check_permission(
    db: Session,
    business_id: str,
    feature: str,
):
    # Get active subscription
    subscription = (
        db.query(BusinessSubscription)
        .filter(
            BusinessSubscription.business_id == business_id,
            BusinessSubscription.status == "active",
        )
        .first()
    )

    if not subscription:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "no_subscription",
                "message": "No active subscription found."
            },
        )

    # Check expiry
    if (
        subscription.expires_at
        and subscription.expires_at < datetime.utcnow()
    ):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "subscription_expired",
                "message": "Your subscription has expired."
            },
        )

    # Load plan
    plan = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.id == subscription.plan_id
        )
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="Subscription plan not found.",
        )

    # Feature permissions
    feature_flags = {
        "reports": plan.reports_enabled,
        "export": plan.Export_enable,
        "ai": plan.ai_enabled,
        "notifications": plan.notifications_enabled,
    }

    if feature in feature_flags:
        if not feature_flags[feature]:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "feature_locked",
                    "feature": feature,
                    "plan": plan.name,
                },
            )

    # Sales limit
    if feature == "sales":
        sales_count = (
            db.query(Sale)
            .filter(Sale.business_id == business_id)
            .count()
        )

        if (
            plan.max_sales is not None
            and sales_count >= plan.max_sales
        ):
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "sales_limit_reached",
                    "current": sales_count,
                    "limit": plan.max_sales,
                    "plan": plan.name,
                },
            )

    # Product limit
    elif feature == "products":
        product_count = (
            db.query(Product)
            .filter(Product.business_id == business_id)
            .count()
        )

        if (
            plan.max_products is not None
            and product_count >= plan.max_products
        ):
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "product_limit_reached",
                    "current": product_count,
                    "limit": plan.max_products,
                    "plan": plan.name,
                },
            )

    # Employee limit
    elif feature == "employees":
        employee_count = (
            db.query(Employee)
            .filter(Employee.business_id == business_id)
            .count()
        )

        if (
            plan.max_employees is not None
            and employee_count >= plan.max_employees
        ):
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "employee_limit_reached",
                    "current": employee_count,
                    "limit": plan.max_employees,
                    "plan": plan.name,
                },
            )

    return True