from fastapi_mail import FastMail, MessageSchema, MessageType
from app.utils.email import conf

async def send_reset_email(email: str, code: str):
    message = MessageSchema(
        subject="Reset your BizTrack POS Password",
        recipients=[email],
        body=f"""
Hello,

We received a request to reset your password.

Your verification code is:

{code}

This code will expire in 10 minutes.

Regards,
BizTrack POS Team
""",
        subtype=MessageType.plain,
    )

    fm = FastMail(conf)
    await fm.send_message(message)

    print("Email sent successfully!")