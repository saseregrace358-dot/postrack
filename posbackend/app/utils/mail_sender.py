import os
import ssl
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM")


async def send_reset_email(email: str, code: str):
    print("MAIL STEP 1: Building message")

    msg = EmailMessage()
    msg["Subject"] = "Reset your BizTrack POS Password"
    msg["From"] = MAIL_FROM
    msg["To"] = email

    msg.set_content(
        f"""
Hello,

Your verification code is:

{code}

This code expires in 10 minutes.

Regards,
BizTrack POS Team
"""
    )

    print("MAIL_USERNAME:", MAIL_USERNAME)
    print("MAIL_PASSWORD exists:", MAIL_PASSWORD is not None)
    print("MAIL_FROM:", MAIL_FROM)

    print("Connecting...")

    context = ssl.create_default_context()

    with smtplib.SMTP_SSL(
        "smtp-relay.brevo.com",
        465,
        context=context,
        timeout=30,
    ) as smtp:

        print("Connected")

        smtp.login(MAIL_USERNAME, MAIL_PASSWORD)

        print("Logged in")

        smtp.send_message(msg)

        print("Email sent successfully")