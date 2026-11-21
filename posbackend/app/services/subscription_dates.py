from datetime import timedelta
from dateutil.relativedelta import relativedelta


def calculate_expiry(start_at, plan, billing_interval=None):
    """
    Calculate subscription expiry.

    Paid billing intervals override the plan duration.
    Otherwise, use the plan's configured duration.
    """

    if start_at is None:
        raise ValueError("Subscription start date is required.")

    if billing_interval == "monthly":
        return start_at + relativedelta(months=1)

    if billing_interval == "yearly":
        return start_at + relativedelta(years=1)

    if billing_interval is not None:
        raise ValueError("Invalid billing interval.")

    duration = plan.duration_value

    if duration is None or duration < 1:
        raise ValueError("Invalid subscription duration.")

    if plan.duration_unit == "days":
        return start_at + timedelta(days=duration)

    if plan.duration_unit == "months":
        return start_at + relativedelta(months=duration)

    if plan.duration_unit == "years":
        return start_at + relativedelta(years=duration)

    raise ValueError("Invalid subscription duration unit.")