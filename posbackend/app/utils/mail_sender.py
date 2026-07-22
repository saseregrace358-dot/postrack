import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

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

    try:
        print("Connecting...")

        server = smtplib.SMTP(
            "smtp-relay.brevo.com",
            587,
            timeout=30
        )

        server.ehlo()

        server.starttls()

        server.ehlo()

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
        print("EMAIL ERROR:", e)
        raise