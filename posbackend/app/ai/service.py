import os

from openai import OpenAI

from app.ai.prompts import SYSTEM_PROMPT

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


def ask_ai(message: str, context: str):

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "system",
                "content": context,
            },
            {
                "role": "user",
                "content": message,
            },
        ],
    )

    return response.choices[0].message.content