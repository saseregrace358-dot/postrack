from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.auth.dependencies import get_current_user
from app.models.business_settings import BusinessSettings
from app.schemas.business_settings import BusinessSettingsSchema

router = APIRouter(
    prefix="/settings",
    tags=["Settings"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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

    settings.tax_enabled = payload.tax_enabled
    settings.tax_rate = payload.tax_rate
    settings.debt_threshold = payload.debt_threshold

    db.commit()
    db.refresh(settings)

    return settings