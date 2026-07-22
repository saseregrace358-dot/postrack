import os
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

configuration = sib_api_v3_sdk.Configuration()
configuration.api_key["api-key"] = os.getenv("BREVO_API_KEY")

api = sib_api_v3_sdk.TransactionalEmailsApi(
    sib_api_v3_sdk.ApiClient(configuration)
)

async def send_email(
    to_email: str,
    subject: str,
    html: str,
):
    email_data = sib_api_v3_sdk.SendSmtpEmail(
        sender={
            "name": "DGTrack POS",
            "email": os.getenv("MAIL_FROM"),
        },
        to=[
            {
                "email": to_email
            }
        ],
        subject=subject,
        html_content=html,
    )

    try:
        api.send_transac_email(email_data)
        print(f"{subject} sent successfully")

    except ApiException as e:
        print("Brevo Error:", e)
        raise

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
        api.send_transac_email(email_data)
        print("Email sent successfully")

    except ApiException as e:
        print("Brevo Error:", e)
        raise

# --------------------------------------------------
# Welcome Email
# --------------------------------------------------

async def send_welcome_email(
    email: str,
    name: str,
    business: str,
):

    html = f"""
    <h2>Welcome to DGTrack POS 🎉</h2>

    <p>Hello <b>{name}</b>,</p>

    <p>Your business <b>{business}</b> has been created successfully.</p>

    <p>Thank you for choosing DGTrack POS.</p>

    <hr>

    <p>DGTrack Team</p>
    """

    await send_email(
        email,
        "Welcome to DGTrack POS",
        html,
    )


# --------------------------------------------------
# Employee Login
# --------------------------------------------------

async def send_employee_login_email(
    owner_email: str,
    employee_name: str,
    business_name: str,
):

    html = f"""
    <h2>Employee Login</h2>

    <p><b>{employee_name}</b> has logged into</p>

    <h3>{business_name}</h3>
    """

    await send_email(
        owner_email,
        "Employee Logged In",
        html,
    )


# --------------------------------------------------
# Daily Sales Report
# --------------------------------------------------

async def send_daily_sales_report(
    owner_email: str,
    business_name: str,
    total_sales: float,
    total_transactions: int,
    total_debt: float,
):

    html = f"""
    <h2>Daily Sales Report</h2>

    <h3>{business_name}</h3>

    <table border="1" cellpadding="10">

        <tr>
            <td>Total Sales</td>
            <td>₦{total_sales:,.2f}</td>
        </tr>

        <tr>
            <td>Transactions</td>
            <td>{total_transactions}</td>
        </tr>

        <tr>
            <td>Outstanding Debt</td>
            <td>₦{total_debt:,.2f}</td>
        </tr>

    </table>
    """

    await send_email(
        owner_email,
        "Daily Sales Report",
        html,
    )


# --------------------------------------------------
# Low Stock
# --------------------------------------------------

async def send_low_stock_email(
    owner_email: str,
    product: str,
    qty: int,
):

    html = f"""
    <h2>Low Stock Alert</h2>

    <p>{product} is running low.</p>

    <h3>Remaining Quantity: {qty}</h3>
    """

    await send_email(
        owner_email,
        "Low Stock Alert",
        html,
    )