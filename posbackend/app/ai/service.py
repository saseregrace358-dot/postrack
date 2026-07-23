import os
import traceback

from google import genai
from dotenv import load_dotenv

from app.ai.prompts import SYSTEM_PROMPT

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

def ask_ai(message: str, context: str = ""):
    prompt = f"""
{SYSTEM_PROMPT}

{context}

User:
{message}
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        print("Gemini Response:", response)

        return response.text

    except Exception as e:
        print("========== GEMINI ERROR ==========")
        traceback.print_exc()
        print("==================================")
        raise