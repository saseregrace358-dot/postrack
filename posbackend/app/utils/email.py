import os
from dotenv import load_dotenv
from fastapi_mail import ConnectionConfig

load_dotenv()
print("MAIL_USERNAME:", os.getenv("MAIL_USERNAME"))
print("MAIL_FROM:", os.getenv("MAIL_FROM"))
print("MAIL_PASSWORD exists:", os.getenv("MAIL_PASSWORD") is not None)

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),

    MAIL_SERVER="smtp.gmail.com",
    MAIL_PORT=465,

    MAIL_SSL_TLS=True,
    MAIL_STARTTLS=False,

    USE_CREDENTIALS=True,
)