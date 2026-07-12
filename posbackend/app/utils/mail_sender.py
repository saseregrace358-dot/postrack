import os
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

    msg.set_content(f"""
Hello,

Your verification code is:

{code}

This code expires in 10 minutes.

Regards,
BizTrack POS Team
""")

    print("MAIL STEP 2: Connecting to Brevo")

    smtp = smtplib.SMTP("smtp-relay.brevo.com", 465, timeout=30)

    print("MAIL STEP 3: Connected")

    smtp.starttls()

    print("MAIL STEP 4: TLS started")

    smtp.login(MAIL_USERNAME, MAIL_PASSWORD)

    print("MAIL STEP 5: Logged in")

    smtp.send_message(msg)

    print("MAIL STEP 6: Email sent")

    smtp.quit()