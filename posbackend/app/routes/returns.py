
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.auth.dependencies import get_current_user

from app.models.sale import Sale
from app.models.product import Product
from app.models.inventory_log import InventoryLog
from app.models.return_record import ReturnRecord
from app.models.return_item import ReturnItem
from app.models.business_settings import BusinessSettings

from app.schemas.return_schema import (
    ReturnCreate,
    RefundStatusUpdate,
)


router = APIRouter(prefix="/returns", tags=["Returns"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --------------------------------------------------
# CURRENCY HELPERS
# --------------------------------------------------

def decimal_value(value):
    return Decimal(str(value if value is not None else 0))


def currency_digits(currency):
    return 0 if currency == "JPY" else 2


def round_money(amount, currency):
    digits = currency_digits(currency)
    rounding = Decimal("1").scaleb(-digits)

    return decimal_value(amount).quantize(
        rounding,
        rounding=ROUND_HALF_UP,
    )


def get_currency_context(db, business_id):
    """
    Get the actual currency configuration for a business.

    Never assume a default currency.
    Missing or invalid settings must be corrected before
    currency-dependent operations can continue.
    """

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
                "Please configure your business currency in Settings."
            ),
        )

    base_currency = settings.base_currency
    active_currency = settings.currency

    if (
        not isinstance(base_currency, str)
        or len(base_currency.strip()) != 3
        or not base_currency.strip().isalpha()
    ):
        raise HTTPException(
            status_code=409,
            detail="Business base currency is missing or invalid.",
        )

    if (
        not isinstance(active_currency, str)
        or len(active_currency.strip()) != 3
        or not active_currency.strip().isalpha()
    ):
        raise HTTPException(
            status_code=409,
            detail="Business active currency is missing or invalid.",
        )

    base_currency = base_currency.strip().upper()
    active_currency = active_currency.strip().upper()

    rate = decimal_value(settings.exchange_rate)

    if not rate.is_finite() or rate <= 0:
        raise HTTPException(
            status_code=409,
            detail="Business exchange rate is missing or invalid.",
        )

    return {
        "base_currency": base_currency,
        "currency": active_currency,
        "exchange_rate": rate,
    }


def to_active_currency(amount, rate, currency):
    return round_money(
        decimal_value(amount) * rate,
        currency,
    )


# --------------------------------------------------
# RETURN SERIALIZATION
# --------------------------------------------------

def serialize_return(record, db, currency_context=None):

    if currency_context is None:
        currency_context = get_currency_context(
            db,
            record.business_id,
        )

    base_currency = record.base_currency
    active_currency = currency_context["currency"]
    current_rate = currency_context["exchange_rate"]

    # The business base currency must remain unchanged.
    if currency_context["base_currency"] != base_currency:
        raise HTTPException(
            status_code=409,
            detail=(
                "Return base currency does not match "
                "the business base currency."
            ),
        )

    items = (
        db.query(ReturnItem)
        .filter(ReturnItem.return_id == record.id)
        .all()
    )

    converted_items = []

    for item in items:
        base_unit_price = decimal_value(item.unit_price)
        base_refund = decimal_value(item.refund_amount)

        converted_items.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_name": item.product_name,
            "name": item.product_name,
            "quantity": item.quantity,

            # Current active currency amounts.
            "price": float(
                to_active_currency(
                    base_unit_price,
                    current_rate,
                    active_currency,
                )
            ),
            "unit_price": float(
                to_active_currency(
                    base_unit_price,
                    current_rate,
                    active_currency,
                )
            ),
            "refund_amount": float(
                to_active_currency(
                    base_refund,
                    current_rate,
                    active_currency,
                )
            ),

            # Original stored base currency amounts.
            "base_unit_price": float(base_unit_price),
            "base_refund_amount": float(base_refund),

            "item_condition": item.item_condition,
            "condition": item.item_condition,
            "restocked": bool(item.restocked),
        })

    base_refund_amount = decimal_value(record.refund_amount)

    return {
        "id": record.id,
        "return_id": record.id,
        "sale_id": record.sale_id,
        "order_id": record.order_id,
        "business_id": record.business_id,
        "reason": record.reason,
        "return_reason": record.reason,

        # Converted refund for frontend display.
        "refund_amount": float(
            to_active_currency(
                base_refund_amount,
                current_rate,
                active_currency,
            )
        ),

        # Original stored refund.
        "base_refund_amount": float(base_refund_amount),

        # Current display currency.
        "currency": active_currency,
        "current_exchange_rate": float(current_rate),

        # Historical transaction currency snapshot.
        "base_currency": record.base_currency,
        "currency_at_return": record.currency_at_return,
        "exchange_rate_at_return": float(
            record.exchange_rate_at_return
        ),
        "original_amounts": record.original_amounts,

        "refund_status": record.refund_status or "PENDING",

        "created_at": (
            record.created_at.isoformat()
            if record.created_at else None
        ),
        "returned_at": (
            record.created_at.isoformat()
            if record.created_at else None
        ),

        "items": converted_items,
    }


# --------------------------------------------------
# CREATE RETURN
# --------------------------------------------------

@router.post("")
def create_return(
    payload: ReturnCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = user["business_id"]

    try:
        sale = (
            db.query(Sale)
            .filter(
                Sale.id == payload.sale_id,
                Sale.business_id == business_id,
            )
            .with_for_update()
            .first()
        )

        if not sale:
            raise HTTPException(
                status_code=404,
                detail="Original sale not found",
            )

        currency_context = get_currency_context(
            db,
            business_id,
        )

        base_currency = currency_context["base_currency"]
        active_currency = currency_context["currency"]
        exchange_rate = currency_context["exchange_rate"]

        if sale.base_currency != base_currency:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Sale base currency does not match "
                    "the business base currency."
                ),
            )

        sale_items = sale.items or []

        if not isinstance(sale_items, list):
            raise HTTPException(
                status_code=400,
                detail="Original sale items have an invalid format",
            )

        requested = {}

        for item in payload.items:
            product_id = item.product_id
            condition = item.item_condition.strip().lower()

            if condition not in {"resellable", "damaged"}:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Item condition must be "
                        "Resellable or Damaged"
                    ),
                )

            if product_id in requested:
                if requested[product_id]["condition"] != condition:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Submit the same product separately "
                            "when its items have different conditions"
                        ),
                    )

                requested[product_id]["quantity"] += item.quantity

            else:
                requested[product_id] = {
                    "quantity": item.quantity,
                    "condition": condition,
                }

        prepared_items = []
        total_refund = Decimal("0")

        for product_id, requested_item in requested.items():

            quantity_to_return = requested_item["quantity"]
            condition = requested_item["condition"]

            matching_lines = [
                line
                for line in sale_items
                if isinstance(line, dict)
                and line.get("product_id") is not None
                and str(line.get("product_id")) == str(product_id)
            ]

            if not matching_lines:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Product ID {product_id} was not found "
                        "in the original sale"
                    ),
                )

            sold_quantity = sum(
                int(line.get("quantity", 0))
                for line in matching_lines
            )

            sold_value = sum(
                (
                    decimal_value(line.get("price"))
                    * int(line.get("quantity", 0))
                )
                for line in matching_lines
            )

            if sold_quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid quantity in original sale",
                )

            already_returned = (
                db.query(
                    func.coalesce(
                        func.sum(ReturnItem.quantity),
                        0,
                    )
                )
                .join(
                    ReturnRecord,
                    ReturnRecord.id == ReturnItem.return_id,
                )
                .filter(
                    ReturnRecord.sale_id == sale.id,
                    ReturnRecord.business_id == business_id,
                    ReturnItem.product_id == product_id,
                )
                .scalar()
            )

            remaining_quantity = (
                sold_quantity - int(already_returned or 0)
            )

            if quantity_to_return > remaining_quantity:
                product_name = matching_lines[0].get(
                    "name",
                    "this product",
                )

                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Only {remaining_quantity} unit(s) of "
                        f"{product_name} remain eligible for return"
                    ),
                )

            product = (
                db.query(Product)
                .filter(
                    Product.id == product_id,
                    Product.business_id == business_id,
                )
                .with_for_update()
                .first()
            )

            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"Inventory product {product_id} not found",
                )

            unit_price = sold_value / Decimal(sold_quantity)

            item_subtotal = (
                unit_price * Decimal(quantity_to_return)
            )

            allocated_tax = Decimal("0")

            if decimal_value(sale.subtotal) > 0:
                allocated_tax = (
                    decimal_value(sale.tax)
                    * item_subtotal
                    / decimal_value(sale.subtotal)
                )

            # Store refund amounts in the business base currency.
            unit_price = round_money(
                unit_price,
                base_currency,
            )

            item_refund = round_money(
                item_subtotal + allocated_tax,
                base_currency,
            )

            restocked = condition == "resellable"

            prepared_items.append({
                "product": product,
                "product_id": product_id,
                "product_name": matching_lines[0].get(
                    "name",
                    product.name,
                ),
                "quantity": quantity_to_return,
                "unit_price": unit_price,
                "refund_amount": item_refund,
                "condition": condition.title(),
                "restocked": restocked,
            })

            total_refund += item_refund

        total_refund = round_money(
            total_refund,
            base_currency,
        )

        # Preserve the currency and rate used when the return occurred.
        original_amounts = {
            "currency": active_currency,
            "base_currency": base_currency,
            "exchange_rate": float(exchange_rate),
            "refund_amount": float(
                to_active_currency(
                    total_refund,
                    exchange_rate,
                    active_currency,
                )
            ),
            "items": [
                {
                    "product_id": item["product_id"],
                    "product_name": item["product_name"],
                    "quantity": item["quantity"],
                    "unit_price": float(
                        to_active_currency(
                            item["unit_price"],
                            exchange_rate,
                            active_currency,
                        )
                    ),
                    "refund_amount": float(
                        to_active_currency(
                            item["refund_amount"],
                            exchange_rate,
                            active_currency,
                        )
                    ),
                }
                for item in prepared_items
            ],
        }

        return_record = ReturnRecord(
            sale_id=sale.id,
            order_id=sale.order_id,
            business_id=business_id,
            reason=payload.reason.strip(),

            # Canonical amount stored in base currency.
            refund_amount=float(total_refund),

            base_currency=base_currency,
            currency_at_return=active_currency,
            exchange_rate_at_return=exchange_rate,
            original_amounts=original_amounts,

            refund_status=payload.refund_status,
            created_by=user["id"],
            created_by_name=user.get("name"),
        )

        db.add(return_record)
        db.flush()

        for item in prepared_items:

            db.add(
                ReturnItem(
                    return_id=return_record.id,
                    product_id=item["product_id"],
                    product_name=item["product_name"],
                    quantity=item["quantity"],
                    unit_price=float(item["unit_price"]),
                    refund_amount=float(item["refund_amount"]),
                    item_condition=item["condition"],
                    restocked=item["restocked"],
                )
            )

            # Restock resellable items only.
            if item["restocked"]:
                item["product"].stock += item["quantity"]

                db.add(
                    InventoryLog(
                        product_id=item["product_id"],
                        change_type="returned",
                        quantity=item["quantity"],
                        timestamp=datetime.utcnow(),
                    )
                )

        db.commit()
        db.refresh(return_record)

        return {
            "message": "Return recorded successfully",
            "return": serialize_return(
                return_record,
                db,
                currency_context,
            ),
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to record return. No changes were saved.",
        )


# --------------------------------------------------
# GET ALL RETURNS
# --------------------------------------------------

@router.get("")
def get_returns(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = user["business_id"]

    currency_context = get_currency_context(
        db,
        business_id,
    )

    records = (
        db.query(ReturnRecord)
        .filter(
            ReturnRecord.business_id == business_id
        )
        .order_by(ReturnRecord.created_at.desc())
        .all()
    )

    return [
        serialize_return(
            record,
            db,
            currency_context,
        )
        for record in records
    ]


# --------------------------------------------------
# GET RETURNS FOR A SALE
# --------------------------------------------------

@router.get("/sale/{sale_id}")
def get_returns_for_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = user["business_id"]

    sale = (
        db.query(Sale)
        .filter(
            Sale.id == sale_id,
            Sale.business_id == business_id,
        )
        .first()
    )

    if not sale:
        raise HTTPException(
            status_code=404,
            detail="Original sale not found",
        )

    currency_context = get_currency_context(
        db,
        business_id,
    )

    if sale.base_currency != currency_context["base_currency"]:
        raise HTTPException(
            status_code=409,
            detail=(
                "Sale base currency does not match "
                "the business base currency."
            ),
        )

    records = (
        db.query(ReturnRecord)
        .filter(
            ReturnRecord.sale_id == sale_id,
            ReturnRecord.business_id == business_id,
        )
        .order_by(ReturnRecord.created_at.desc())
        .all()
    )

    return [
        serialize_return(
            record,
            db,
            currency_context,
        )
        for record in records
    ]


# --------------------------------------------------
# UPDATE REFUND STATUS
# --------------------------------------------------

@router.patch("/{return_id}/status")
def update_return_status(
    return_id: int,
    payload: RefundStatusUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    record = (
        db.query(ReturnRecord)
        .filter(
            ReturnRecord.id == return_id,
            ReturnRecord.business_id == user["business_id"],
        )
        .with_for_update()
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Return record not found",
        )

    new_status = payload.refund_status

    if (
        record.refund_status == "COMPLETED"
        and new_status == "PENDING"
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "A completed refund cannot be changed back to pending"
            ),
        )

    try:
        currency_context = get_currency_context(
            db,
            record.business_id,
        )

        if currency_context["base_currency"] != record.base_currency:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Return base currency does not match "
                    "the business base currency."
                ),
            )

        record.refund_status = new_status

        db.commit()
        db.refresh(record)

        return {
            "message": "Refund status updated successfully",
            "return": serialize_return(
                record,
                db,
                currency_context,
            ),
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update refund status",
        )
