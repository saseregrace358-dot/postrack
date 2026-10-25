
import os
import requests

PAYSTACK_URL = "https://api.paystack.co"


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


def initialize_payment(
    email: str,
    amount: float,
    reference: str,
    callback_url: str,
    business_id: str,
    plan: str,
):
    payload = {
        "email": email,
        "amount": round(amount * 100),
        "currency": "NGN",
        "reference": reference,
        "callback_url": callback_url,
        "metadata": {
            "business_id": business_id,
            "plan": plan,
        },
    }

    response = requests.post(
        f"{PAYSTACK_URL}/transaction/initialize",
        json=payload,
        headers=get_headers(),
        timeout=20,
    )

    response.raise_for_status()
    return response.json()


def verify_payment(reference: str):
    response = requests.get(
        f"{PAYSTACK_URL}/transaction/verify/{reference}",
        headers=get_headers(),
        timeout=20,
    )

    response.raise_for_status()
    return response.json()
