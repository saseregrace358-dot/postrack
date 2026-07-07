import os
import requests

PAYSTACK_SECRET = os.getenv("PAYSTACK_SECRET_KEY")

headers = {
    "Authorization": f"Bearer {PAYSTACK_SECRET}",
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
    url = "https://api.paystack.co/transaction/initialize"

    payload = {
        "email": email,
        "amount": int(amount * 100),   # Kobo
        "reference": reference,
        "callback_url": callback_url,

        "metadata": {
            "business_id": business_id,
            "plan": plan,
        },
    }

    response = requests.post(
        url,
        json=payload,
        headers=headers,
    )

    print("PAYSTACK RESPONSE:")
    print(response.json())

    return response.json()


def verify_payment(reference: str):

    url = f"https://api.paystack.co/transaction/verify/{reference}"

    response = requests.get(
        url,
        headers=headers,
    )

    return response.json()