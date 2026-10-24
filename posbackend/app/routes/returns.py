
from datetime import datetime

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


def serialize_return(record, db):
    items = (
        db.query(ReturnItem)
        .filter(ReturnItem.return_id == record.id)
        .all()
    )

    return {
        "id": record.id,
        "return_id": record.id,
        "sale_id": record.sale_id,
        "order_id": record.order_id,
        "business_id": record.business_id,
        "reason": record.reason,
        "return_reason": record.reason,
        "refund_amount": float(record.refund_amount or 0),
        "refund_status": record.refund_status or "PENDING",
        "created_at": (
            record.created_at.isoformat()
            if record.created_at else None
        ),
        "returned_at": (
            record.created_at.isoformat()
            if record.created_at else None
        ),
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product_name,
                "name": item.product_name,
                "quantity": item.quantity,
                "price": float(item.unit_price or 0),
                "unit_price": float(item.unit_price or 0),
                "refund_amount": float(item.refund_amount or 0),
                "item_condition": item.item_condition,
                "condition": item.item_condition,
                "restocked": bool(item.restocked),
            }
            for item in items
        ],
    }


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
                    detail="Item condition must be Resellable or Damaged",
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
        total_refund = 0.0

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
                float(line.get("price", 0))
                * int(line.get("quantity", 0))
                for line in matching_lines
            )

            if sold_quantity <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid quantity in original sale",
                )

            already_returned = (
                db.query(
                    func.coalesce(func.sum(ReturnItem.quantity), 0)
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
                    "name", "this product"
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

            unit_price = sold_value / sold_quantity
            item_subtotal = unit_price * quantity_to_return

            allocated_tax = 0.0
            if sale.subtotal and sale.subtotal > 0:
                allocated_tax = (
                    float(sale.tax or 0)
                    * item_subtotal
                    / float(sale.subtotal)
                )

            item_refund = round(item_subtotal + allocated_tax, 2)
            restocked = condition == "resellable"

            prepared_items.append({
                "product": product,
                "product_id": product_id,
                "product_name": matching_lines[0].get(
                    "name", product.name
                ),
                "quantity": quantity_to_return,
                "unit_price": round(unit_price, 2),
                "refund_amount": item_refund,
                "condition": condition.title(),
                "restocked": restocked,
            })

            total_refund += item_refund

        # Persist the status selected in the frontend.
        return_record = ReturnRecord(
            sale_id=sale.id,
            order_id=sale.order_id,
            business_id=business_id,
            reason=payload.reason.strip(),
            refund_amount=round(total_refund, 2),
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
                    unit_price=item["unit_price"],
                    refund_amount=item["refund_amount"],
                    item_condition=item["condition"],
                    restocked=item["restocked"],
                )
            )

            # Restock resellable items only, exactly once.
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
            "return": serialize_return(return_record, db),
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


@router.get("")
def get_returns(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    records = (
        db.query(ReturnRecord)
        .filter(
            ReturnRecord.business_id == user["business_id"]
        )
        .order_by(ReturnRecord.created_at.desc())
        .all()
    )

    return [serialize_return(record, db) for record in records]


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

    records = (
        db.query(ReturnRecord)
        .filter(
            ReturnRecord.sale_id == sale_id,
            ReturnRecord.business_id == business_id,
        )
        .order_by(ReturnRecord.created_at.desc())
        .all()
    )

    return [serialize_return(record, db) for record in records]


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

    if record.refund_status == "COMPLETED" and new_status == "PENDING":
        raise HTTPException(
            status_code=400,
            detail="A completed refund cannot be changed back to pending",
        )

    try:
        record.refund_status = new_status

        db.commit()
        db.refresh(record)

        return {
            "message": "Refund status updated successfully",
            "return": serialize_return(record, db),
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update refund status",
        )
