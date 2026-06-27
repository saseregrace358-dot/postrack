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


@router.post("/")
def create_sale(
    payload: SaleCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    order_id = f"ORD-{uuid.uuid4().hex[:10]}"
    sale_items = []

    for item in payload.items:

        product = db.query(Product).filter(
            Product.id == item.product_id,
            Product.business_id == user["business_id"]
        ).first()

        if not product:
            raise HTTPException(404, "Product not found")

        if product.stock < item.quantity:
            raise HTTPException(
                400,
                f"Insufficient stock for {product.name}"
            )

        product.stock -= item.quantity

        sale_items.append({
            "product_id": product.id,
            "name": product.name,
            "price": item.price,
            "quantity": item.quantity
        })

        # Low stock notification
        if product.stock <= 5:
            db.add(
                Notification(
                    business_id=user["business_id"],
                    title="Low Stock Alert",
                    message=f"{product.name} remaining stock: {product.stock}",
                    type="lowStock"
                )
            )

    balance = payload.total - payload.amountPaid

    status = (
        "PAID"
        if balance <= 0
        else "PARTIAL"
        if payload.amountPaid > 0
        else "DEBT"
    )

    payments = []

    if payload.amountPaid > 0:
        payments.append({
            "amount": payload.amountPaid,
            "date": datetime.utcnow().isoformat(),
            "method": payload.paymentMethod
        })

    sale = Sale(
        order_id=order_id,
        items=sale_items,
        subtotal=payload.subtotal,
        tax=payload.tax,
        total=payload.total,
        amountPaid=payload.amountPaid,
        balance=balance,
        paymentMethod=payload.paymentMethod,
        payments=payments,
        status=status,
        business_id=user["business_id"],
        created_by=user["id"],
        created_by_name=user.get("name")
    )

    db.add(sale)

    db.add(
        Notification(
            business_id=user["business_id"],
            title="New Sale",
            message=f"Sale {order_id} created",
            type="sale"
        )
    )

    db.commit()
    db.refresh(sale)

    return sale

@router.get("/")
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
def add_payment(
                sale_id: int,
                payment: dict,
                db: Session = Depends(get_db),
                user = Depends(get_current_user)
            ):
                sale = (
                    db.query(Sale)
                    .filter(
                        Sale.id == sale_id,
                        Sale.business_id == user["business_id"]   # 🔥 IMPORTANT
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

                    # 🔥 AUDIT INFO
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

                notification = Notification(
                business_id=user["business_id"],
                title="Payment Received",
                message=f"₦{payment['amount']} received",
                type="payment"
            )
                db.add(notification)

                db.commit()
                db.refresh(sale)

                return sale