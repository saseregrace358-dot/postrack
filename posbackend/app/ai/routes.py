from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.ai.schemas import ChatRequest
from app.ai.service import ask_ai
from app.ai.context import build_context

router = APIRouter(
    prefix="/ai",
    tags=["AI"],
)


@router.post("/chat")
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    print("NEW AI ROUTE HIT")

    context = build_context(
        db,
        user["business_id"],
    )

    answer = ask_ai(payload.message, context)

    return {"reply": answer}