
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.ai.schemas import ChatRequest
from app.ai.service import ask_ai
from app.ai.context import build_context

from app.services.subscription_service import (
    get_valid_subscription,
    check_subscription_feature,
    
)

router = APIRouter(
    prefix="/ai",
    tags=["AI"],
)


BUSINESS_KEYWORDS = [
    "sale",
    "sales",
    "product",
    "products",
    "inventory",
    "stock",
    "employee",
    "employees",
    "customer",
    "customers",
    "profit",
    "profits",
    "loss",
    "expense",
    "expenses",
    "invoice",
    "order",
    "orders",
    "revenue",
    "business",
    "report",
    "reports",
]


QUICK_REPLIES = {
    "hi": "Hello! 👋 How are you today?",
    "hello": "Hello! 👋 How are you today?",
    "hey": "Hey! 😊 How can I help you today?",
    "good morning": "Good morning! ☀️ How can I help you today?",
    "good afternoon": "Good afternoon! 😊 How can I help you today?",
    "good evening": "Good evening! 🌙 How can I help you today?",
    "how are you": "I'm doing great, thanks for asking! 😊 How are you?",
    "thanks": "You're very welcome! 😊",
    "thank you": "You're very welcome! 😊",
    "bye": "Goodbye! 👋 Have a wonderful day!",
    "goodbye": "Take care! 👋",
}


@router.post("/chat")
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = user.get("business_id")

    if not business_id:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a business.",
        )

    # Check AI access before quick replies or AI processing.
    check_subscription_feature(
        db,
        business_id,
        "ai",
    )

    message = payload.message.strip()
    lower = message.lower()

    # Instant replies (no AI call).
    if lower in QUICK_REPLIES:
        return {"reply": QUICK_REPLIES[lower]}

    # Only build business context when the question needs it.
    needs_context = any(
        word in lower
        for word in BUSINESS_KEYWORDS
    )

    context = ""

    if needs_context:
        context = build_context(
            db,
            business_id,
        )

    answer = ask_ai(
        message,
        context,
    )

    return {"reply": answer}
