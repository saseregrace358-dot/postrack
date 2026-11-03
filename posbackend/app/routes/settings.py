
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from datetime import datetime, timezone
import httpx

from app.database import SessionLocal
from app.auth.dependencies import get_current_user
from app.models.business_settings import BusinessSettings
from app.schemas.business_settings import BusinessSettingsSchema


router = APIRouter(
    prefix="/settings",
    tags=["Settings"]
)


SUPPORTED_CURRENCIES = {
    "NGN", "USD", "GBP", "EUR", "CAD", "AUD",
    "GHS", "KES", "ZAR", "INR", "JPY", "CHF"
}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_currency_digits(currency: str):
    return 0 if currency == "JPY" else 2


def round_currency(amount, currency: str):
    precision = Decimal("1").scaleb(
        -get_currency_digits(currency)
    )

    return Decimal(str(amount)).quantize(
        precision,
        rounding=ROUND_HALF_UP
    )


def fetch_exchange_rate(base_currency: str, target_currency: str):
    """Fetch conversion rate from original currency to active currency."""

    if base_currency == target_currency:
        return Decimal("1"), None

    url = f"https://open.er-api.com/v6/latest/{base_currency}"

    try:
        response = httpx.get(url, timeout=15)
        response.raise_for_status()

        data = response.json()

        if data.get("result") != "success":
            raise HTTPException(
                status_code=502,
                detail="Exchange rate provider could not provide rates."
            )

        if data.get("base_code") != base_currency:
            raise HTTPException(
                status_code=502,
                detail="Unexpected exchange rate base currency."
            )

        rate = data.get("rates", {}).get(target_currency)

        if rate is None:
            raise HTTPException(
                status_code=400,
                detail="Exchange rate is unavailable for the selected currency."
            )

        rate = Decimal(str(rate))

        if not rate.is_finite() or rate <= 0:
            raise HTTPException(
                status_code=502,
                detail="Invalid exchange rate received."
            )

        updated_timestamp = data.get("time_last_update_unix")

        rate_updated_at = (
            datetime.fromtimestamp(
                updated_timestamp,
                tz=timezone.utc
            ).replace(tzinfo=None)
            if updated_timestamp
            else None
        )

        return rate, rate_updated_at

    except HTTPException:
        raise

    except (httpx.HTTPError, ValueError, TypeError, ArithmeticError):
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve exchange rates. Please try again."
        )


def get_existing_settings(db: Session, business_id: str):
    settings = (
        db.query(BusinessSettings)
        .filter(
            BusinessSettings.business_id == business_id
        )
        .first()
    )

    if not settings:
        raise HTTPException(
            status_code=409,
            detail=(
                "Business currency settings are missing. "
                "Please configure your business currency before continuing."
            )
        )

    return settings


def validate_settings(settings: BusinessSettings):
    base_currency = str(settings.base_currency or "").strip().upper()
    active_currency = str(settings.currency or "").strip().upper()

    if base_currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(
            status_code=409,
            detail="The business base currency is invalid."
        )

    if active_currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(
            status_code=409,
            detail="The active business currency is invalid."
        )

    try:
        rate = Decimal(str(settings.exchange_rate))

    except (InvalidOperation, TypeError, ValueError):
        raise HTTPException(
            status_code=409,
            detail="The business exchange rate is invalid."
        )

    if not rate.is_finite() or rate <= 0:
        raise HTTPException(
            status_code=409,
            detail="The business exchange rate must be greater than zero."
        )

    if base_currency == active_currency and rate != Decimal("1"):
        raise HTTPException(
            status_code=409,
            detail="The exchange rate must be 1 when both currencies match."
        )

    return base_currency, active_currency, rate


@router.get("")
def get_settings(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    settings = get_existing_settings(
        db,
        user["business_id"]
    )

    validate_settings(settings)

    return settings


@router.post("")
def save_settings(
    payload: BusinessSettingsSchema,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    settings = get_existing_settings(
        db,
        user["business_id"]
    )

    base_currency, old_currency, old_rate = validate_settings(settings)

    # Validate tax and debt values.
    try:
        tax_rate = Decimal(str(payload.tax_rate))
        debt_threshold = Decimal(str(payload.debt_threshold))

        if (
            not tax_rate.is_finite()
            or not debt_threshold.is_finite()
            or tax_rate < 0
            or debt_threshold < 0
        ):
            raise ValueError

    except (InvalidOperation, TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Tax rate and debt threshold must be valid non-negative numbers."
        )

    selected_currency = old_currency

    if payload.currency is not None:
        selected_currency = payload.currency.strip().upper()

        if selected_currency not in SUPPORTED_CURRENCIES:
            raise HTTPException(
                status_code=400,
                detail="Unsupported currency selected."
            )

    # Preserve the existing debt threshold's value when changing currency.
    if selected_currency != old_currency:

        # Convert the existing threshold back to base currency.
        threshold_in_base = (
            Decimal(str(settings.debt_threshold or 0)) / old_rate
        )

        # Get the new base-to-active exchange rate.
        new_rate, updated_at = fetch_exchange_rate(
            base_currency,
            selected_currency
        )

        # Convert the threshold into the newly selected currency.
        new_threshold = threshold_in_base * new_rate

        settings.currency = selected_currency
        settings.exchange_rate = new_rate
        settings.exchange_rate_updated_at = updated_at

        settings.debt_threshold = float(
            round_currency(
                new_threshold,
                selected_currency
            )
        )

    else:
        # No currency change: the submitted threshold is already
        # expressed in the current active currency.
        settings.debt_threshold = float(
            round_currency(
                debt_threshold,
                old_currency
            )
        )

    settings.tax_enabled = payload.tax_enabled
    settings.tax_rate = float(tax_rate)

    try:
        db.commit()
        db.refresh(settings)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save business settings."
        )

    return settings
