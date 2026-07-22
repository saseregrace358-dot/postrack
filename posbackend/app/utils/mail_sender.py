import os
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

configuration = sib_api_v3_sdk.Configuration()
configuration.api_key["api-key"] = os.getenv("BREVO_API_KEY")

api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
    sib_api_v3_sdk.ApiClient(configuration)
)


async def send_reset_email(email: str, code: str):

    reset_link = (
        f"https://postrack.vercel.app/reset-password"
        f"?email={email}&code={code}"
    )

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
        <div style="font-family:Arial,sans-serif;padding:20px">

            <h2>Reset Your Password</h2>

            <p>We received a request to reset your DGTrack POS password.</p>

            <p>
                Click the button below to continue.
            </p>

            <a
                href="{reset_link}"
                style="
                    background:#2563eb;
                    color:white;
                    padding:12px 25px;
                    text-decoration:none;
                    border-radius:6px;
                    display:inline-block;
                    font-weight:bold;
                "
            >
                Reset Password
            </a>

            <br><br>

            <p>
                Or enter this verification code manually:
            </p>

            <h1 style="letter-spacing:6px;">
                {code}
            </h1>

            <p>
                This link and code expire in 10 minutes.
            </p>

            <p>
                If you didn't request this change, you can safely ignore this email.
            </p>

        </div>
        """
    )

    try:
        api_instance.send_transac_email(email_data)
        print("Email sent successfully")

    except ApiException as e:
        print("Brevo Error:", e)
        raise