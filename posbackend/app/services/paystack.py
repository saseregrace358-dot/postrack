
import os
import requests

from decimal import Decimal, ROUND_HALF_UP


PAYSTACK_URL = "https://api.paystack.co"

SUPPORTED_PAYMENT_CURRENCIES = {
    "NGN",
    "USD",
}


def get_headers():
    secret = os.getenv("PAYSTACK_SECRET_KEY")

    if not secret:
        raise RuntimeError(
            "PAYSTACK_SECRET_KEY is not configured."
        )

    return {
        "Authorization": f"Bearer {secret}",
        "Content-Type": "application/json",
    }


def validate_currency(currency: str) -> str:
    currency = (currency or "").strip().upper()

    if currency not in SUPPORTED_PAYMENT_CURRENCIES:
        raise ValueError(
            f"Unsupported payment currency: {currency}"
        )

    return currency


def convert_to_minor_units(amount: Decimal) -> int:
    """
    Convert a two-decimal currency amount into its
    smallest unit (kobo for NGN, cents for USD).
    """

    amount_decimal = Decimal(str(amount))

    if not amount_decimal.is_finite() or amount_decimal <= 0:
        raise ValueError(
            "Payment amount must be greater than zero."
        )

    return int(
        (amount_decimal * Decimal("100")).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )
    )


def initialize_payment(
    email: str,
    amount: Decimal,
    reference: str,
    callback_url: str,
    business_id: str,
    plan: str,
    currency: str,
):
    currency = validate_currency(currency)

    amount_minor = convert_to_minor_units(amount)

    payload = {
        "email": email,
        "amount": amount_minor,
        "currency": currency,
        "reference": reference,
        "callback_url": callback_url,
        "metadata": {
            "business_id": business_id,
            "plan": plan,
            "payment_currency": currency,
        },
    }

    response = requests.post(
        f"{PAYSTACK_URL}/transaction/initialize",
        json=payload,
        headers=get_headers(),
        timeout=20,
    )

    response.raise_for_status()

    result = response.json()

    if not result.get("status"):
        raise RuntimeError(
            result.get("message", "Paystack initialization failed.")
        )

    return result


def verify_payment(reference: str):
    response = requests.get(
        f"{PAYSTACK_URL}/transaction/verify/{reference}",
        headers=get_headers(),
        timeout=20,
    )

    response.raise_for_status()

    result = response.json()

    if not result.get("status"):
        raise RuntimeError(
            result.get("message", "Paystack verification failed.")
        )

    return result
