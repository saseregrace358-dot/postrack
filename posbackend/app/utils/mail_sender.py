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

    print("Connecting...")

    server = smtplib.SMTP_SSL("smtp-relay.brevo.com", 465)

    print("Connected")

    server.login(MAIL_USERNAME, MAIL_PASSWORD)

    print("Logged in")

    server.sendmail(MAIL_FROM, email, msg.as_string())

    print("Sent")

    server.quit()