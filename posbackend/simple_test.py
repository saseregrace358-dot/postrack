import asyncio
from fastapi import FastAPI
from app.utils.mail_sender import send_reset_email

app = FastAPI()

@app.get("")
async def test():
    await send_reset_email(
        "YOUR_EMAIL@gmail.com",
        "123456"
    )
    return {"success": True}