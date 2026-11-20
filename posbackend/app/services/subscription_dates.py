
from datetime import timedelta
from dateutil.relativedelta import relativedelta


def calculate_expiry(start_at, plan, billing_interval=None):
    """
    Calculate subscription expiry.

    Monthly and yearly billing intervals override the
    plan's default duration for paid subscriptions.

    If no billing interval is supplied, use the plan's
    configured duration. This supports free trials and
    other custom-duration plans.
    """

    if billing_interval == "monthly":
        return start_at + relativedelta(months=1)

    if billing_interval == "yearly":
        return start_at + relativedelta(years=1)

    if plan.duration_unit == "days":
        return start_at + timedelta(days=plan.duration_value)

    if plan.duration_unit == "months":
        return start_at + relativedelta(months=plan.duration_value)

    if plan.duration_unit == "years":
        return start_at + relativedelta(years=plan.duration_value)

    raise ValueError("Invalid subscription duration unit")
