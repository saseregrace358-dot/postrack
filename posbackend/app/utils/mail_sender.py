import os
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM")


async def send_reset_email(email: str, code: str):
    msg = EmailMessage()

    msg["Subject"] = "Reset your BizTrack POS Password"
    msg["From"] = MAIL_FROM
    msg["To"] = email

    msg.set_content(f"""
Hello,

We received a request to reset your password.

Your verification code is:

{code}

This code will expire in 10 minutes.

Enter this code in the BizTrack POS app to continue resetting your password.

If you did not request this password reset, you can safely ignore this email.

Regards,
BizTrack POS Team
""")

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(MAIL_USERNAME, MAIL_PASSWORD)
        smtp.send_message(msg)

    print("Email sent successfully!")