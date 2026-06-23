import random
import string


def generate_business_id(business_name: str) -> str:
    prefix = (
        business_name
        .replace(" ", "")
        .upper()
        [:10]
    )

    suffix = ''.join(
        random.choices(string.ascii_uppercase + string.digits, k=5)
    )

    return f"{prefix}-{suffix}"