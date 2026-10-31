
from datetime import timedelta
from dateutil.relativedelta import relativedelta


def calculate_expiry(start_at, plan):
    if plan.duration_unit == "days":
        return start_at + timedelta(days=plan.duration_value)

    elif plan.duration_unit == "months":
        return start_at + relativedelta(months=plan.duration_value)

    elif plan.duration_unit == "years":
        return start_at + relativedelta(years=plan.duration_value)

    raise ValueError("Invalid subscription duration unit")
