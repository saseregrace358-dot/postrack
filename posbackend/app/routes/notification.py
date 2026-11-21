
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.notification import Notification
from app.auth.dependencies import get_current_user

from app.services.subscription_service import (
    check_subscription_feature,
)

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


def get_business_id(user):
    business_id = user.get("business_id")

    if not business_id:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a business.",
        )

    return business_id


def enforce_notifications_subscription(
    db: Session,
    business_id: int,
):
    check_subscription_feature(
        db,
        business_id,
        "notifications",
    )


@router.get("/new")
def get_new_notifications(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = get_business_id(user)

    enforce_notifications_subscription(
        db,
        business_id,
    )

    return (
        db.query(Notification)
        .filter(
            Notification.business_id == business_id,
            Notification.read.is_(False),
        )
        .order_by(Notification.created_at.desc())
        .all()
    )


@router.get("/all")
def get_all_notifications(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = get_business_id(user)

    enforce_notifications_subscription(
        db,
        business_id,
    )

    return (
        db.query(Notification)
        .filter(
            Notification.business_id == business_id,
        )
        .order_by(Notification.created_at.desc())
        .all()
    )


@router.patch("/{id}/read")
def mark_read(
    id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = get_business_id(user)

    enforce_notifications_subscription(
        db,
        business_id,
    )

    notification = (
        db.query(Notification)
        .filter(
            Notification.id == id,
            Notification.business_id == business_id,
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found.",
        )

    notification.read = True

    db.commit()
    db.refresh(notification)

    return notification


@router.patch("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = get_business_id(user)

    enforce_notifications_subscription(
        db,
        business_id,
    )

    (
        db.query(Notification)
        .filter(
            Notification.business_id == business_id,
            Notification.read.is_(False),
        )
        .update(
            {"read": True},
            synchronize_session=False,
        )
    )

    db.commit()

    return {
        "message": "All notifications marked as read."
    }
