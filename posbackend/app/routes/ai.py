from fastapi import APIRouter
from openai import OpenAI
import os

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
) 
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