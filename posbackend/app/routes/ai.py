from fastapi import APIRouter

router = APIRouter(
    prefix="/ai",
    tags=["AI"]
)

@router.post("/chat")
def chat(payload: dict):

    prompt = payload["message"]

    return {
        "reply": f"You said: {prompt}"
    }