import asyncio
from app.utils.email_service import send_reset_email

async def main():
    await send_reset_email(
        "sseun3568@gmail.com",
        "123456"
    )
    print("Email sent successfully!")

asyncio.run(main())