
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import uuid

from app.database import SessionLocal
from app.models.sale import Sale
from app.models.product import Product
from app.schemas.sale import SaleCreate
from app.models.notification import Notification
from app.models.business_settings import BusinessSettings
from app.auth.dependencies import get_current_user
from app.websocket_manager import manager


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


# ==========================================
# CREATE SALE
# ==========================================

@router.post("")
async def create_sale(
    payload: SaleCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    business_id = user["business_id"]

    order_id = f"ORD-{uuid.uuid4().hex[:10]}"

    # ======================================
    # GET BUSINESS SETTINGS
    # ======================================

    settings = (
        db.query(BusinessSettings)
        .filter(BusinessSettings.business_id == business_id)
        .first()
    )

    # ======================================
    # VALIDATE PRODUCTS AND CALCULATE SUBTOTAL
    # ======================================

    sale_items = []
    products_to_update = {}
    subtotal = 0

    try:
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

            if item.quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Product quantity must be greater than zero."
                )

            # Account for repeated product IDs in the same sale
            already_requested = products_to_update.get(product.id, {}).get(
                "quantity", 0
            )

            total_requested = already_requested + item.quantity

            if product.stock < total_requested:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {product.name}"
                )

            products_to_update[product.id] = {
                "product": product,
                "quantity": total_requested
            }

            # Always use the database product price
            product_price = float(product.price)

            line_total = product_price * item.quantity
            subtotal += line_total

            sale_items.append({
                "product_id": product.id,
                "name": product.name,
                "price": product_price,
                "cost": float(product.cost),
                "quantity": item.quantity
            })

        # ======================================
        # CALCULATE TAX AND TOTAL
        # ======================================

        subtotal = round(subtotal, 2)

        tax = 0

        if (
            settings
            and settings.tax_enabled
            and settings.tax_rate > 0
        ):
            tax = subtotal * (float(settings.tax_rate) / 100)

        tax = round(tax, 2)
        total = round(subtotal + tax, 2)

        # ======================================
        # VALIDATE PAYMENT
        # ======================================

        amount_paid = round(float(payload.amountPaid or 0), 2)

        if amount_paid < 0:
            raise HTTPException(
                status_code=400,
                detail="Payment amount cannot be negative."
            )

        if amount_paid > total:
            raise HTTPException(
                status_code=400,
                detail="Payment amount cannot exceed the sale total."
            )

        balance = round(total - amount_paid, 2)

        # ======================================
        # CHECK TOTAL BUSINESS DEBT
        # ======================================

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

        new_total_debt = float(current_total_debt or 0) + balance

        # ======================================
        # DEBT THRESHOLD CHECK
        # ======================================

        if (
            settings
            and settings.debt_threshold > 0
            and new_total_debt > float(settings.debt_threshold)
        ):

            notification = Notification(
                business_id=business_id,
                title="Debt Limit Exceeded",
                message=(
                    f"Debt limit exceeded.\n"
                    f"Current Debt: ₦{new_total_debt:,.2f}\n"
                    f"Threshold: ₦{float(settings.debt_threshold):,.2f}"
                ),
                type="debt"
            )

            db.add(notification)
            db.commit()
            db.refresh(notification)

            await manager.broadcast(
                business_id,
                {
                    "id": notification.id,
                    "title": notification.title,
                    "message": notification.message,
                    "type": notification.type,
                    "read": False
                }
            )

            raise HTTPException(
                status_code=400,
                detail="Debt limit exceeded, payment not processed."
            )

        # ======================================
        # REDUCE STOCK AFTER ALL VALIDATIONS
        # ======================================

        notifications_to_broadcast = []

        for product_data in products_to_update.values():

            product = product_data["product"]
            quantity = product_data["quantity"]

            product.stock -= quantity

            if product.stock <= 4:

                notification = Notification(
                    business_id=business_id,
                    title="Low Stock Alert",
                    message=(
                        f"{product.name} remaining stock: {product.stock}"
                    ),
                    type="lowStock"
                )

                db.add(notification)
                db.flush()

                notifications_to_broadcast.append(notification)

        # ======================================
        # PAYMENT STATUS
        # ======================================

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

        # ======================================
        # SAVE SALE
        # ======================================

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

        # ======================================
        # BROADCAST LOW STOCK NOTIFICATIONS
        # ======================================

        for notification in notifications_to_broadcast:

            await manager.broadcast(
                business_id,
                {
                    "id": notification.id,
                    "title": notification.title,
                    "message": notification.message,
                    "type": notification.type,
                    "read": False
                }
            )

        return sale

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise


# ==========================================
# GET SALES
# ==========================================

@router.get("")
def get_sales(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return (
        db.query(Sale)
        .filter(
            Sale.business_id == user["business_id"]
        )
        .order_by(Sale.date.desc())
        .all()
    )


# ==========================================
# ADD PAYMENT TO EXISTING SALE
# ==========================================

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
        raise HTTPException(
            status_code=404,
            detail="Sale not found"
        )

    # ======================================
    # VALIDATE PAYMENT AMOUNT
    # ======================================

    try:
        payment_amount = round(float(payment.get("amount", 0)), 2)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Invalid payment amount."
        )

    if payment_amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Payment amount must be greater than zero."
        )

    if payment_amount > float(sale.balance):
        raise HTTPException(
            status_code=400,
            detail="Payment amount cannot exceed the outstanding balance."
        )

    # ======================================
    # UPDATE PAYMENT RECORDS
    # ======================================

    payments = list(sale.payments or [])

    payments.append({
        "amount": payment_amount,
        "date": datetime.utcnow().isoformat(),
        "method": payment.get("method", "Cash"),
        "added_by": user["id"],
        "added_by_name": user.get("name")
    })

    total_paid = round(
        sum(float(p["amount"]) for p in payments),
        2
    )

    sale.payments = payments
    sale.amountPaid = total_paid
    sale.balance = round(
        max(0, float(sale.total) - total_paid),
        2
    )

    # ======================================
    # UPDATE PAYMENT STATUS
    # ======================================

    if sale.balance <= 0:
        sale.balance = 0
        sale.status = "PAID"
    elif total_paid > 0:
        sale.status = "PARTIAL"
    else:
        sale.status = "DEBT"

    # ======================================
    # CREATE PAYMENT NOTIFICATION
    # ======================================

    notification = Notification(
        business_id=user["business_id"],
        title="Payment Received",
        message=f"₦{payment_amount:,.2f} received",
        type="payment"
    )

    db.add(notification)

    try:
        db.commit()
        db.refresh(sale)
        db.refresh(notification)

    except Exception:
        db.rollback()
        raise

    # ======================================
    # BROADCAST NOTIFICATION
    # ======================================

    await manager.broadcast(
        user["business_id"],
        {
            "id": notification.id,
            "title": notification.title,
            "message": notification.message,
            "type": notification.type,
            "read": False
        }
    )

    return sale
