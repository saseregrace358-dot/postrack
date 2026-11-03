
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
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
                detail="Exchange rate provider could not provide rates"
            )

        if data.get("base_code") != base_currency:
            raise HTTPException(
                status_code=502,
                detail="Unexpected exchange rate base currency"
            )

        rate = data.get("rates", {}).get(target_currency)

        if rate is None:
            raise HTTPException(
                status_code=400,
                detail="Exchange rate is unavailable for the selected currency"
            )

        rate = Decimal(str(rate))

        if not rate.is_finite() or rate <= 0:
            raise HTTPException(
                status_code=502,
                detail="Invalid exchange rate received"
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


@router.get("")
def get_settings(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    settings = (
        db.query(BusinessSettings)
        .filter(
            BusinessSettings.business_id == user["business_id"]
        )
        .first()
    )

    if not settings:
        settings = BusinessSettings(
            business_id=user["business_id"]
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


@router.post("")
def save_settings(
    payload: BusinessSettingsSchema,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    settings = (
        db.query(BusinessSettings)
        .filter(
            BusinessSettings.business_id == user["business_id"]
        )
        .first()
    )

    if not settings:
        settings = BusinessSettings(
            business_id=user["business_id"]
        )
        db.add(settings)
        db.flush()

    # Keep the original currency unchanged.
    base_currency = settings.base_currency

    # Only change the active currency when one is supplied.
    if payload.currency is not None:
        selected_currency = payload.currency.strip().upper()

        if selected_currency not in SUPPORTED_CURRENCIES:
            raise HTTPException(
                status_code=400,
                detail="Unsupported currency selected"
            )

        if base_currency not in SUPPORTED_CURRENCIES:
            raise HTTPException(
                status_code=400,
                detail="Business original currency is unsupported"
            )

        if selected_currency != settings.currency:
            rate, updated_at = fetch_exchange_rate(
                base_currency,
                selected_currency
            )

            settings.currency = selected_currency
            settings.exchange_rate = rate
            settings.exchange_rate_updated_at = updated_at

    # Preserve existing tax settings functionality.
    settings.tax_enabled = payload.tax_enabled
    settings.tax_rate = payload.tax_rate
    settings.debt_threshold = payload.debt_threshold

    try:
        db.commit()
        db.refresh(settings)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save business settings"
        )

    return settings
