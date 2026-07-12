from fastapi_mail import FastMail, MessageSchema
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

Enter this code in the BizTrack POS app to continue resetting your password.

If you did not request this password reset, you can safely ignore this email.

Regards,
BizTrack POS Team
""",
        subtype="plain"
    )

    fm = FastMail(conf)
    await fm.send_message(message)