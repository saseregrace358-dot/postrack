
from fastapi import APIRouter, Depends, HTTPException
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


def get_business_id(user):
    business_id = user.get("business_id")

    if not business_id:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a business."
        )

    return business_id


# -------------------------------
# NEW NOTIFICATIONS ONLY
# -------------------------------

@router.get("/new")
def get_new_notifications(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    business_id = get_business_id(user)

    return (
        db.query(Notification)
        .filter(
            Notification.business_id == business_id,
            Notification.read == False
        )
        .order_by(Notification.created_at.desc())
        .all()
    )


# -------------------------------
# ALL NOTIFICATIONS
# -------------------------------

@router.get("/all")
def get_all_notifications(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    business_id = get_business_id(user)

    return (
        db.query(Notification)
        .filter(
            Notification.business_id == business_id
        )
        .order_by(Notification.created_at.desc())
        .all()
    )


# -------------------------------
# MARK ONE AS READ
# -------------------------------

@router.patch("/{id}/read")
def mark_read(
    id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    business_id = get_business_id(user)

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == id,
            Notification.business_id == business_id
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found."
        )

    notification.read = True

    db.commit()
    db.refresh(notification)

    return notification


# -------------------------------
# MARK ALL AS READ
# -------------------------------

@router.patch("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    business_id = get_business_id(user)

    (
        db.query(Notification)
        .filter(
            Notification.business_id == business_id,
            Notification.read == False
        )
        .update(
            {"read": True},
            synchronize_session=False
        )
    )

    db.commit()

    return {
        "message": "All notifications marked as read"
    }
