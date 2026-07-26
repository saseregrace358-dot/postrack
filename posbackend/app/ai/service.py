from openai import OpenAI
from dotenv import load_dotenv
import os
import traceback
from app.ai.prompts import SYSTEM_PROMPT
load_dotenv()   # <-- Load the .env file

print("OPENROUTER_API_KEY =", os.getenv("OPENROUTER_API_KEY"))

client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
)

def ask_ai(message: str, context: str = ""):
    print("ASK_AI CALLED")

    try:
        response = client.chat.completions.create(
            model="deepseek/deepseek-chat",
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": f"{context}\n\n{message}",
                },
            ],
        )

        print("OpenRouter Response:", response)

        return response.choices[0].message.content

    except Exception:
        print("========== OPENROUTER ERROR ==========")
        traceback.print_exc()
        print("======================================")
        raise