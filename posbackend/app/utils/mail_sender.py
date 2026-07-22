import smtplib

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

from dotenv import load_dotenv
import os

load_dotenv()

print("MAIL_USERNAME:", os.getenv("MAIL_USERNAME"))

print("MAIL_FROM:", os.getenv("MAIL_FROM"))
MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM")



async def send_reset_email(email: str, code: str):
    msg = MIMEMultipart()
    msg["From"] = MAIL_FROM
    msg["To"] = email
    msg["Subject"] = "Reset your BizTrack POS Password"

    msg.attach(
        MIMEText(
            f"Your verification code is: {code}",
            "plain"
        )
    )

    import os
import smtplib
from dotenv import load_dotenv
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

load_dotenv()

MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM")


async def send_reset_email(email: str, code: str):

    msg = MIMEMultipart()

    msg["From"] = f"No Reply <{MAIL_FROM}>"
    msg["To"] = email
    msg["Subject"] = "Reset your BizTrack POS Password"

    msg.attach(
        MIMEText(
            f"""
Hello,

We received a request to reset your BizTrack POS password.

Your verification code is:

{code}

If you did not request this password reset, please ignore this email.

Regards,
BizTrack POS
            """,
            "plain"
        )
    )

    try:
        print("Connecting...")

        server = smtplib.SMTP(
            "smtp-relay.brevo.com",
            587
        )

        server.starttls()

        print("Connected")

        server.login(
            MAIL_USERNAME,
            MAIL_PASSWORD
        )

        print("Logged in")

        server.sendmail(
            MAIL_FROM,
            email,
            msg.as_string()
        )

        print("Email sent successfully")

        server.quit()

    except Exception as e:
        print("EMAIL ERROR:", str(e))
        raise