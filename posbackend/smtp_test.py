import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM")

TO_EMAIL = "email"

msg = MIMEMultipart()
msg["From"] = MAIL_FROM
msg["To"] = TO_EMAIL
msg["Subject"] = "Brevo SMTP Test"

msg.attach(MIMEText("Hello! This email was sent successfully using Brevo SMTP.", "plain"))

server = smtplib.SMTP_SSL("smtp-relay.brevo.com", 465)
server.login(MAIL_USERNAME, MAIL_PASSWORD)
server.sendmail(MAIL_FROM, TO_EMAIL, msg.as_string())
server.quit()

print("EMAIL SENT SUCCESSFULLY")