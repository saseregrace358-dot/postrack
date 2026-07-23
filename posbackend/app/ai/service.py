import os

from google import genai
from app.ai.prompts import SYSTEM_PROMPT

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY ")
)


def ask_ai(message: str, context: str):

    prompt = f"""
{SYSTEM_PROMPT}

Business Context:
{context}

User:
{message}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    return response.text