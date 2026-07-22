import os
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

configuration = sib_api_v3_sdk.Configuration()
configuration.api_key["api-key"] = os.getenv("BREVO_API_KEY")

api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
    sib_api_v3_sdk.ApiClient(configuration)
)


async def send_reset_email(email: str, code: str):
    email_data = sib_api_v3_sdk.SendSmtpEmail(
        sender={
            "name": "DGTrack POS",
            "email": os.getenv("MAIL_FROM")
        },
        to=[
            {
                "email": email
            }
        ],
        subject="Reset your DGTrack POS Password",
        html_content=f"""
        <h2>Reset Password</h2>

        <p>Your verification code is:</p>

        <h1>{code}</h1>

        <p>This code expires in 10 minutes.</p>
        """
    )

    try:
        api_instance.send_transac_email(email_data)
        print("Email sent successfully")

    except ApiException as e:
        print("Brevo Error:", e)
        raise