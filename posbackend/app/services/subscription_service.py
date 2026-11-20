
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.business_subscription import BusinessSubscription
from app.models.subscription_plan import SubscriptionPlan
from app.models.product import Product
from app.models.employee import Employee


# Subscriptions that can retain access until their expiry date.
VALID_SUBSCRIPTION_STATUSES = {
    "active",
    "cancelled",
    "trialing",
}


FEATURE_FLAGS = {
    "reports": "reports_enabled",
    "export": "export_enabled",
    "ai": "ai_enabled",
    "notifications": "notifications_enabled",
}


def get_valid_subscription(
    db: Session,
    business_id: str,
):
    """
    Return the business's valid subscription and plan.

    Expired subscriptions are marked expired.
    Missing expiry dates fail closed instead of granting
    indefinite access.
    """

    if not business_id:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a business.",
        )

    subscription = (
        db.query(BusinessSubscription)
        .filter(
            BusinessSubscription.business_id == business_id
        )
        .first()
    )

    if not subscription:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "no_subscription",
                "message": "No subscription was found for this business.",
            },
        )

    status = (subscription.status or "").strip().lower()

    if status not in VALID_SUBSCRIPTION_STATUSES:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "subscription_inactive",
                "message": "Your subscription is not active.",
            },
        )

    expiry = subscription.expires_at

    if expiry is None:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "subscription_expiry_missing",
                "message": (
                    "Your subscription expiry date is missing. "
                    "Please contact support."
                ),
            },
        )

    # Support both timezone-aware and naive database datetimes.
    if expiry.tzinfo is not None:
        now = datetime.now(timezone.utc)
        expiry_comparison = expiry
    else:
        now = datetime.utcnow()
        expiry_comparison = expiry

    if expiry_comparison <= now:
        subscription.status = "expired"
        db.commit()

        raise HTTPException(
            status_code=403,
            detail={
                "error": "subscription_expired",
                "message": "Your subscription has expired. Please renew to continue.",
            },
        )

    plan = (
        db.query(SubscriptionPlan)
        .filter(
            SubscriptionPlan.id == subscription.plan_id
        )
        .first()
    )

    if not plan:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "subscription_plan_missing",
                "message": "Your subscription plan could not be found.",
            },
        )

    return subscription, plan


def check_subscription_feature(
    db: Session,
    business_id: str,
    feature: str,
):
    """
    Validate subscription access and check a plan feature.

    Supported features:
    reports, export, ai, notifications.
    """

    subscription, plan = get_valid_subscription(
        db,
        business_id,
    )

    flag_name = FEATURE_FLAGS.get(feature)

    if flag_name is None:
        raise ValueError(
            f"Unknown subscription feature: {feature}"
        )

    enabled = bool(
        getattr(plan, flag_name, False)
    )

    if not enabled:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "feature_locked",
                "feature": feature,
                "plan": plan.name,
                "message": (
                    f"The {feature} feature is not included "
                    f"in your {plan.name} plan."
                ),
            },
        )

    return subscription, plan


def check_creation_limit(
    db: Session,
    business_id: str,
    resource: str,
):
    """
    Check product or employee limits before creating a new record.

    A limit of -1 means unlimited.
    Sales are deliberately not limited here.
    """

    subscription, plan = get_valid_subscription(
        db,
        business_id,
    )

    if resource == "products":
        limit = plan.max_products

        current_count = (
            db.query(func.count(Product.id))
            .filter(
                Product.business_id == business_id
            )
            .scalar()
            or 0
        )

    elif resource == "employees":
        limit = plan.max_employees

        current_count = (
            db.query(func.count(Employee.id))
            .filter(
                Employee.business_id == business_id
            )
            .scalar()
            or 0
        )

    else:
        raise ValueError(
            f"Unsupported subscription limit: {resource}"
        )

    # Preserve the existing convention:
    # -1 means unlimited; None also means no configured limit.
    if limit is not None and limit >= 0:
        if current_count >= limit:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "limit_reached",
                    "resource": resource,
                    "limit": limit,
                    "current_count": current_count,
                    "plan": plan.name,
                    "message": (
                        f"You have reached the {resource} limit "
                        f"for your {plan.name} plan."
                    ),
                },
            )

    return True


def check_permission(
    db: Session,
    business_id: str,
    feature: str,
):
    """
    Backward-compatible permission entry point.

    For new code, use check_subscription_feature() for features
    and check_creation_limit() only when creating records.
    """

    if feature in FEATURE_FLAGS:
        check_subscription_feature(
            db,
            business_id,
            feature,
        )
        return True

    if feature in {"products", "employees"}:
        check_creation_limit(
            db,
            business_id,
            feature,
        )
        return True

    if feature == "sales":
        get_valid_subscription(
            db,
            business_id,
        )
        return True

    raise ValueError(
        f"Unknown permission: {feature}"
    )
