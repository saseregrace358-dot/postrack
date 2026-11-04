
from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

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
# CURRENCY HELPERS
# ==========================================

def get_currency_settings(db: Session, business_id: str):
    settings = (
        db.query(BusinessSettings)
        .filter(BusinessSettings.business_id == business_id)
        .first()
    )

    if not settings:
        raise HTTPException(
            status_code=409,
            detail=(
                "Business currency settings are missing. "
                "Please configure your business currency in Settings."
            )
        )

    base_currency = str(
        settings.base_currency or ""
    ).strip().upper()

    active_currency = str(
        settings.currency or ""
    ).strip().upper()

    if (
        len(base_currency) != 3
        or not base_currency.isalpha()
        or len(active_currency) != 3
        or not active_currency.isalpha()
    ):
        raise HTTPException(
            status_code=409,
            detail="The business currency configuration is invalid."
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

    if (
        base_currency == active_currency
        and rate != Decimal("1")
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "The exchange rate must be 1 when the base currency "
                "and active currency are the same."
            )
        )

    settings.base_currency = base_currency
    settings.currency = active_currency

    return settings, rate


def currency_digits(currency: str):
    return 0 if currency == "JPY" else 2


def round_money(amount, currency: str):
    try:
        value = Decimal(str(amount))

        if not value.is_finite():
            raise ValueError

        precision = Decimal("1").scaleb(
            -currency_digits(currency)
        )

        return value.quantize(
            precision,
            rounding=ROUND_HALF_UP
        )

    except (
        InvalidOperation,
        TypeError,
        ValueError,
        ArithmeticError
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid monetary amount."
        )


def to_base_currency(
    amount,
    rate: Decimal,
    base_currency: str
):
    try:
        value = Decimal(str(amount))

        if not value.is_finite():
            raise ValueError

        converted = value / rate

        return round_money(
            converted,
            base_currency
        )

    except (
        InvalidOperation,
        TypeError,
        ValueError,
        ArithmeticError
    ):
        raise HTTPException(
            status_code=400,
            detail="Unable to convert amount to base currency."
        )


def to_active_decimal(
    amount,
    rate: Decimal,
    active_currency: str
):
    try:
        value = Decimal(str(amount))

        if not value.is_finite():
            raise ValueError

        converted = value * rate

        return round_money(
            converted,
            active_currency
        )

    except (
        InvalidOperation,
        TypeError,
        ValueError,
        ArithmeticError
    ):
        raise HTTPException(
            status_code=500,
            detail="Unable to convert amount to active currency."
        )


def to_active_currency(
    amount,
    rate: Decimal,
    active_currency: str
):
    return float(
        to_active_decimal(
            amount,
            rate,
            active_currency
        )
    )


# ==========================================
# FORMAT SALE RESPONSE
# ==========================================

def sale_to_response(
    sale: Sale,
    rate: Decimal,
    active_currency: str
):
    result = {
        column.key: getattr(sale, column.key)
        for column in Sale.__table__.columns
    }

    # Preserve canonical database amounts.
    result["base_subtotal"] = sale.subtotal
    result["base_tax"] = sale.tax
    result["base_total"] = sale.total
    result["base_amountPaid"] = sale.amountPaid
    result["base_balance"] = sale.balance

    # Return financial amounts in the active currency.
    result["subtotal"] = to_active_currency(
        sale.subtotal,
        rate,
        active_currency
    )

    result["tax"] = to_active_currency(
        sale.tax,
        rate,
        active_currency
    )

    result["total"] = to_active_currency(
        sale.total,
        rate,
        active_currency
    )

    result["amountPaid"] = to_active_currency(
        sale.amountPaid,
        rate,
        active_currency
    )

    result["balance"] = to_active_currency(
        sale.balance,
        rate,
        active_currency
    )

    result["currency"] = active_currency

    # Convert sale item prices and costs.
    converted_items = []

    for item in sale.items or []:
        converted_item = dict(item)

        if "price" in converted_item:
            converted_item["base_price"] = converted_item["price"]

            converted_item["price"] = to_active_currency(
                converted_item["price"],
                rate,
                active_currency
            )

        if "cost" in converted_item:
            converted_item["base_cost"] = converted_item["cost"]

            converted_item["cost"] = to_active_currency(
                converted_item["cost"],
                rate,
                active_currency
            )

        converted_item["currency"] = active_currency

        converted_items.append(converted_item)

    result["items"] = converted_items

    # Convert payment records for display.
    converted_payments = []

    for payment in sale.payments or []:
        converted_payment = dict(payment)

        base_amount = payment.get("amount", 0)

        converted_payment["base_amount"] = base_amount

        converted_payment["amount"] = to_active_currency(
            base_amount,
            rate,
            active_currency
        )

        converted_payment["currency"] = active_currency

        converted_payments.append(converted_payment)

    result["payments"] = converted_payments

    return result


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

    if not business_id:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a business."
        )

    settings, rate = get_currency_settings(
        db,
        business_id
    )

    base_currency = settings.base_currency
    active_currency = settings.currency

    order_id = f"ORD-{uuid.uuid4().hex[:10]}"

    try:
        # ======================================
        # VALIDATE PRODUCTS AND CALCULATE SUBTOTAL
        # ======================================

        sale_items = []
        original_items = []
        products_to_update = {}

        subtotal = Decimal("0")

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
                    detail="Product not found."
                )

            if item.quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Product quantity must be greater than zero."
                )

            already_requested = (
                products_to_update
                .get(product.id, {})
                .get("quantity", 0)
            )

            total_requested = (
                already_requested + item.quantity
            )

            if product.stock < total_requested:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for {product.name}."
                )

            products_to_update[product.id] = {
                "product": product,
                "quantity": total_requested
            }

            # Database product prices are in base currency.
            product_price = Decimal(str(product.price))
            product_cost = Decimal(str(product.cost))

            if (
                not product_price.is_finite()
                or not product_cost.is_finite()
                or product_price < 0
                or product_cost < 0
            ):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid price or cost for {product.name}."
                )

            subtotal += (
                product_price * item.quantity
            )

            sale_items.append({
                "product_id": product.id,
                "name": product.name,
                "price": float(product_price),
                "cost": float(product_cost),
                "quantity": item.quantity
            })

            original_items.append({
                "product_id": product.id,
                "name": product.name,
                "price": float(
                    to_active_decimal(
                        product_price,
                        rate,
                        active_currency
                    )
                ),
                "cost": float(
                    to_active_decimal(
                        product_cost,
                        rate,
                        active_currency
                    )
                ),
                "quantity": item.quantity
            })

        subtotal = round_money(
            subtotal,
            base_currency
        )

        # ======================================
        # CALCULATE TAX AND TOTAL
        # IN BASE CURRENCY
        # ======================================

        tax = Decimal("0")

        if (
            settings.tax_enabled
            and settings.tax_rate is not None
            and Decimal(str(settings.tax_rate)) > 0
        ):
            tax = subtotal * (
                Decimal(str(settings.tax_rate))
                / Decimal("100")
            )

        tax = round_money(
            tax,
            base_currency
        )

        total = round_money(
            subtotal + tax,
            base_currency
        )

        # ======================================
        # VALIDATE PAYMENT IN ACTIVE CURRENCY
        # ======================================

        amount_paid_active = round_money(
            payload.amountPaid or 0,
            active_currency
        )

        if amount_paid_active < 0:
            raise HTTPException(
                status_code=400,
                detail="Payment amount cannot be negative."
            )

        # This is the same rounded total displayed to the user.
        total_active = to_active_decimal(
            total,
            rate,
            active_currency
        )

        if amount_paid_active > total_active:
            raise HTTPException(
                status_code=400,
                detail="Payment amount cannot exceed the sale total."
            )

        # If the customer pays the displayed total,
        # use the exact base-currency total.
        if amount_paid_active == total_active:
            amount_paid = total
            amount_paid_active = total_active

        else:
            amount_paid = to_base_currency(
                amount_paid_active,
                rate,
                base_currency
            )

            if amount_paid > total:
                raise HTTPException(
                    status_code=400,
                    detail="Payment amount cannot exceed the sale total."
                )

        # IMPORTANT:
        # Calculate balance before using it anywhere else.
        balance = round_money(
            max(
                Decimal("0"),
                total - amount_paid
            ),
            base_currency
        )

        # ======================================
        # CHECK TOTAL BUSINESS DEBT
        # ======================================

        current_total_debt = (
            db.query(
                func.coalesce(
                    func.sum(Sale.balance),
                    0
                )
            )
            .filter(
                Sale.business_id == business_id,
                Sale.balance > 0
            )
            .scalar()
        )

        current_total_debt = Decimal(
            str(current_total_debt or 0)
        )

        new_total_debt = (
            current_total_debt + balance
        )

        # Debt threshold is configured in active currency.
        if (
            settings.debt_threshold is not None
            and Decimal(str(settings.debt_threshold)) > 0
        ):
            debt_threshold_base = to_base_currency(
                settings.debt_threshold,
                rate,
                base_currency
            )

            if new_total_debt > debt_threshold_base:

                current_debt_active = to_active_decimal(
                    new_total_debt,
                    rate,
                    active_currency
                )

                notification = Notification(
                    business_id=business_id,
                    title="Debt Limit Exceeded",
                    message=(
                        f"Debt limit exceeded.\n"
                        f"Current Debt: {active_currency} "
                        f"{current_debt_active:,.2f}\n"
                        f"Threshold: {active_currency} "
                        f"{float(settings.debt_threshold):,.2f}"
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
        # REDUCE STOCK
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
                        f"{product.name} remaining stock: "
                        f"{product.stock}"
                    ),
                    type="lowStock"
                )

                db.add(notification)
                db.flush()

                notifications_to_broadcast.append(
                    notification
                )

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
                "amount": float(amount_paid),
                "amount_in_currency": float(amount_paid_active),
                "currency": active_currency,
                "exchange_rate": float(rate),
                "date": datetime.utcnow().isoformat(),
                "method": payload.paymentMethod
            })

        # ======================================
        # SAVE ORIGINAL TRANSACTION SNAPSHOT
        # ======================================

        original_amounts = {
            "currency": active_currency,
            "exchange_rate": float(rate),
            "items": original_items,
            "subtotal": float(
                to_active_decimal(
                    subtotal,
                    rate,
                    active_currency
                )
            ),
            "tax": float(
                to_active_decimal(
                    tax,
                    rate,
                    active_currency
                )
            ),
            "total": float(total_active),
            "amountPaid": float(amount_paid_active),
            "balance": float(
                to_active_decimal(
                    balance,
                    rate,
                    active_currency
                )
            )
        }

        # ======================================
        # SAVE SALE
        # ======================================

        sale = Sale(
            order_id=order_id,
            items=sale_items,
            subtotal=float(subtotal),
            tax=float(tax),
            total=float(total),
            amountPaid=float(amount_paid),
            balance=float(balance),
            paymentMethod=payload.paymentMethod,
            payments=payments,
            status=status,
            base_currency=base_currency,
            currency_at_sale=active_currency,
            exchange_rate_at_sale=rate,
            original_amounts=original_amounts,
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

        return sale_to_response(
            sale,
            rate,
            active_currency
        )

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
    business_id = user["business_id"]

    settings, rate = get_currency_settings(
        db,
        business_id
    )

    sales = (
        db.query(Sale)
        .filter(
            Sale.business_id == business_id
        )
        .order_by(Sale.date.desc())
        .all()
    )

    return [
        sale_to_response(
            sale,
            rate,
            settings.currency
        )
        for sale in sales
    ]


# ==========================================
# ADD PAYMENT TO EXISTING SALE
# DEBT AND PARTIAL REPAYMENT
# ==========================================

@router.patch("/{sale_id}/payment")
async def add_payment(
    sale_id: int,
    payment: dict,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    business_id = user["business_id"]

    if not business_id:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a business."
        )

    settings, rate = get_currency_settings(
        db,
        business_id
    )

    base_currency = settings.base_currency
    active_currency = settings.currency

    sale = (
        db.query(Sale)
        .filter(
            Sale.id == sale_id,
            Sale.business_id == business_id
        )
        .with_for_update()
        .first()
    )

    if not sale:
        raise HTTPException(
            status_code=404,
            detail="Sale not found."
        )

    try:
        # ======================================
        # CHECK OUTSTANDING BALANCE
        # ======================================

        outstanding_base = round_money(
            sale.balance or 0,
            base_currency
        )

        if outstanding_base <= 0:
            raise HTTPException(
                status_code=400,
                detail="This sale has no outstanding balance."
            )

        # ======================================
        # VALIDATE PAYMENT AMOUNT
        # ======================================

        payment_amount_active = round_money(
            payment.get("amount", 0),
            active_currency
        )

        if payment_amount_active <= 0:
            raise HTTPException(
                status_code=400,
                detail="Payment amount must be greater than zero."
            )

        # Convert outstanding balance to the same currency
        # used by the payment input.
        outstanding_active = to_active_decimal(
            outstanding_base,
            rate,
            active_currency
        )

        if payment_amount_active > outstanding_active:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Payment amount cannot exceed the "
                    "outstanding balance."
                )
            )

        # If the customer pays the displayed outstanding balance,
        # use the exact remaining base-currency balance.
        if payment_amount_active == outstanding_active:
            payment_amount_base = outstanding_base

        else:
            payment_amount_base = to_base_currency(
                payment_amount_active,
                rate,
                base_currency
            )

            if payment_amount_base > outstanding_base:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Payment amount cannot exceed the "
                        "outstanding balance."
                    )
                )

        if payment_amount_base <= 0:
            raise HTTPException(
                status_code=400,
                detail="Payment amount is too small to record."
            )

        # ======================================
        # UPDATE PAYMENT HISTORY
        # ======================================

        payments = list(sale.payments or [])

        payment_method = (
            payment.get("method")
            or "Cash"
        )

        payments.append({
            "amount": float(payment_amount_base),
            "amount_in_currency": float(payment_amount_active),
            "currency": active_currency,
            "exchange_rate": float(rate),
            "date": datetime.utcnow().isoformat(),
            "method": payment_method,
            "added_by": user["id"],
            "added_by_name": user.get("name")
        })

        # Use sale.amountPaid as the authoritative accumulated
        # payment amount. Do not rebuild it by summing old
        # payment-history records, which may have legacy formats.
        previous_amount_paid = round_money(
            sale.amountPaid or 0,
            base_currency
        )

        new_total_paid = round_money(
            previous_amount_paid + payment_amount_base,
            base_currency
        )

        sale_total = round_money(
            sale.total,
            base_currency
        )

        if new_total_paid > sale_total:
            raise HTTPException(
                status_code=400,
                detail="Payment amount cannot exceed the sale total."
            )

        new_balance = round_money(
            max(
                Decimal("0"),
                sale_total - new_total_paid
            ),
            base_currency
        )

        # ======================================
        # SAVE UPDATED SALE AMOUNTS
        # ======================================

        sale.payments = payments
        sale.amountPaid = float(new_total_paid)
        sale.balance = float(new_balance)

        # ======================================
        # UPDATE PAYMENT STATUS
        # ======================================

        if new_balance <= 0:
            sale.balance = 0
            sale.status = "PAID"

        elif new_total_paid > 0:
            sale.status = "PARTIAL"

        else:
            sale.status = "DEBT"

        # ======================================
        # CREATE PAYMENT NOTIFICATION
        # ======================================

        notification = Notification(
            business_id=business_id,
            title="Payment Received",
            message=(
                f"{active_currency} "
                f"{float(payment_amount_active):,.2f} received "
                f"for order {sale.order_id}"
            ),
            type="payment"
        )

        db.add(notification)

        db.commit()
        db.refresh(sale)
        db.refresh(notification)

        # ======================================
        # BROADCAST NOTIFICATION
        # ======================================

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

        return sale_to_response(
            sale,
            rate,
            active_currency
        )

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise
