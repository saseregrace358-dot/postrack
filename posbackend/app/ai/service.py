from openai import OpenAI
from dotenv import load_dotenv
import os
import traceback
from app.ai.prompts import SYSTEM_PROMPT

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
)


def ask_ai(message: str, context: str = ""):

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        }
    ]

    if context.strip():
        messages.append(
            {
                "role": "system",
                "content": f"Business Context:\n{context}",
            }
        )

    messages.append(
        {
            "role": "user",
            "content": message,
        }
    )

    try:
        response = client.chat.completions.create(
            model="google/gemini-2.5-flash-lite",
            messages=messages,
            max_tokens=400,
            temperature=0.7,
        )

        return response.choices[0].message.content

    except Exception:
        traceback.print_exc()
        raise