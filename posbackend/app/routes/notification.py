from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.notification import Notification
from app.auth.dependencies import get_current_user

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def get_notifications(
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    return (
        db.query(Notification)
        .filter(
            Notification.business_id ==
            user["business_id"]
        )
        .order_by(Notification.created_at.desc())
        .all()
    )

@router.patch("/{id}/read")
def mark_read(
    id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == id,
            Notification.business_id ==
            user["business_id"]
        )
        .first()
    )

    notification.read = True

    db.commit()

    return notification