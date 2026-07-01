from fastapi_mail import FastMail, MessageSchema
from app.utils.email import conf

async def send_reset_email(email: str, token: str):
    link = f"https://postrack.vercel.app/reset-password/{token}"

    message = MessageSchema(
        subject="Reset your BizTrack POS Password",
        recipients=[email],
        body=f"""
Hello,

We received a request to reset your password.

Click the link below to reset your password:

{link}

If you did not request this, please ignore this email.

Regards,
BizTrack POS Team
""",
        subtype="plain"
    )

    fm = FastMail(conf)
    await fm.send_message(message)