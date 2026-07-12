import asyncio
from app.utils.mail_sender import send_reset_email

async def main():
    await send_reset_email(
        "sseun3568@gmail.com",
        "123456"
    )

asyncio.run(main())