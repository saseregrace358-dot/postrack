from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.sale import Sale
from app.models.product import Product
from datetime import datetime
from app.database import SessionLocal
from app.models.sale import Sale
from app.models.product import Product
from app.schemas.sale import SaleCreate
from app.models.notification import Notification
import uuid
from app.auth.dependencies import get_current_user
from app.websocket_manager import manager
from app.models.business_settings import BusinessSettings
from sqlalchemy import func



router = APIRouter(
    prefix="/sales",
    tags=["Sales"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# CREATE SALE


@router.post("")
async def create_sale(
    payload: SaleCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    business_id = user["business_id"]

    order_id = f"ORD-{uuid.uuid4().hex[:10]}"
    sale_items = []

    settings = (
        db.query(BusinessSettings)
        .filter(BusinessSettings.business_id == business_id)
        .first()
    )

    subtotal = 0

    # ===============================
    # Validate products & reduce stock
    # ===============================
    for item in payload.items:

        product = (
            db.query(Product)
            .filter(
                Product.id == item.product_id,
                Product.business_id == business_id
            )
            .first()
        )

        if not product:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        if product.stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.name}"
            )

        product.stock -= item.quantity

        line_total = item.price * item.quantity
        subtotal += line_total

        sale_items.append({
            "product_id": product.id,
            "name": product.name,
            "price": item.price,
            "quantity": item.quantity
        })

        if product.stock <= 4:

            notification = Notification(
                business_id=business_id,
                title="Low Stock Alert",
                message=f"{product.name} remaining stock: {product.stock}",
                type="lowStock"
            )

            db.add(notification)
            db.flush()

            await manager.broadcast({
                "id": notification.id,
                "title": notification.title,
                "message": notification.message,
                "type": notification.type,
                "read": False
            })

    # ===============================
    # TAX
    # ===============================

    tax = 0

    if (
        settings
        and settings.tax_enabled
        and settings.tax_rate > 0
    ):
        tax = subtotal * (settings.tax_rate / 100)

    total = subtotal + tax

    amount_paid = payload.amountPaid or 0

    balance = total - amount_paid

    # ===============================
    # TOTAL BUSINESS DEBT
    # ===============================

    current_total_debt = (
        db.query(
            func.coalesce(func.sum(Sale.balance), 0)
        )
        .filter(
            Sale.business_id == business_id,
            Sale.balance > 0
        )
        .scalar()
    )

    new_total_debt = current_total_debt + balance

    # ===============================
    # Debt Threshold Check
    # ===============================

    if (
        settings
        and settings.debt_threshold > 0
        and new_total_debt > settings.debt_threshold
    ):

        notification = Notification(
            business_id=business_id,
            title="Debt Limit Exceeded",
            message=(
                f"Debt limit exceeded.\n"
                f"Current Debt: ₦{new_total_debt:,.2f}\n"
                f"Threshold: ₦{settings.debt_threshold:,.2f}"
            ),
            type="debt"
        )

        db.add(notification)
        db.flush()

        await manager.broadcast({
            "id": notification.id,
            "title": notification.title,
            "message": notification.message,
            "type": notification.type,
            "read": False
        })

        db.commit()

        raise HTTPException(
            status_code=400,
            detail="Debt limit exceeded, payment not processed."
        )

    # ===============================
    # Payment Status
    # ===============================

    if balance <= 0:
        status = "PAID"
    elif amount_paid > 0:
        status = "PARTIAL"
    else:
        status = "DEBT"

    payments = []

    if amount_paid > 0:
        payments.append({
            "amount": amount_paid,
            "date": datetime.utcnow().isoformat(),
            "method": payload.paymentMethod
        })

    # ===============================
    # Save Sale
    # ===============================

    sale = Sale(
        order_id=order_id,
        items=sale_items,
        subtotal=subtotal,
        tax=tax,
        total=total,
        amountPaid=amount_paid,
        balance=balance,
        paymentMethod=payload.paymentMethod,
        payments=payments,
        status=status,
        business_id=business_id,
        created_by=user["id"],
        created_by_name=user.get("name")
    )

    db.add(sale)

    
    db.commit()

    db.refresh(sale)
    

    return sale

@router.get("")
def get_sales(
                db: Session = Depends(get_db),
                user = Depends(get_current_user)
            ):
                return (
                    db.query(Sale)
                    .filter(Sale.business_id == user["business_id"])
                    .order_by(Sale.date.desc())
                    .all()
                )

@router.patch("/{sale_id}/payment")
async def add_payment(
    sale_id: int,
    payment: dict,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    sale = (
        db.query(Sale)
        .filter(
            Sale.id == sale_id,
            Sale.business_id == user["business_id"]
        )
        .first()
    )

    if not sale:
        raise HTTPException(404, "Sale not found")

    payments = sale.payments or []

    payments.append({
        "amount": payment["amount"],
        "date": datetime.utcnow().isoformat(),
        "method": payment.get("method", "Cash"),
        "added_by": user["id"],
        "added_by_name": user.get("name")
    })

    total_paid = sum(p["amount"] for p in payments)

    sale.payments = payments
    sale.amountPaid = total_paid
    sale.balance = sale.total - total_paid

    if sale.balance <= 0:
        sale.balance = 0
        sale.status = "PAID"
    else:
        sale.status = "DEBT"

    # Create notification
    notification = Notification(
        business_id=user["business_id"],
        title="Payment Received",
        message=f"₦{payment['amount']} received",
        type="payment"
    )

    db.add(notification)
    db.flush()

    await manager.broadcast({
        "id": notification.id,
        "title": notification.title,
        "message": notification.message,
        "type": notification.type,
        "read": False
    })

    db.commit()
    db.refresh(sale)

    return sale