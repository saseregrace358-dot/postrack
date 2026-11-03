
from datetime import datetime
from decimal import Decimal, InvalidOperation
import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product
from app.models.business_settings import BusinessSettings
from app.models.business_subscription import BusinessSubscription
from app.models.subscription_plan import SubscriptionPlan
from app.schemas.product import ProductOut, ProductUpdate, ProductCreate
from app.auth.dependencies import get_current_user


router = APIRouter(prefix="/products", tags=["Products"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class StockUpdate(BaseModel):
    stock: int


# =========================
# GET BUSINESS CURRENCY SETTINGS
# =========================
def get_currency_settings(db: Session, business_id: str):
    settings = (
        db.query(BusinessSettings)
        .filter(BusinessSettings.business_id == business_id)
        .first()
    )

    # Create default settings for older businesses
    # that do not yet have a settings record.
    if not settings:
        settings = BusinessSettings(
            business_id=business_id,
            base_currency="NGN",
            currency="NGN",
            exchange_rate=1,
        )

        db.add(settings)
        db.commit()
        db.refresh(settings)

    try:
        rate = Decimal(str(settings.exchange_rate))

    except (InvalidOperation, TypeError, ValueError):
        raise HTTPException(
            status_code=500,
            detail="The business exchange rate is invalid.",
        )

    if not rate.is_finite() or rate <= 0:
        raise HTTPException(
            status_code=500,
            detail="The business exchange rate must be greater than zero.",
        )

    return settings, rate


# =========================
# CONVERT ACTIVE CURRENCY TO BASE CURRENCY
# =========================
def to_base_currency(amount: float, exchange_rate: Decimal) -> float:
    try:
        value = Decimal(str(amount))

        if not value.is_finite():
            raise ValueError

        converted = value / exchange_rate

        return float(converted)

    except (InvalidOperation, TypeError, ValueError, ArithmeticError):
        raise HTTPException(
            status_code=400,
            detail="Invalid monetary amount supplied.",
        )


# =========================
# CONVERT BASE CURRENCY TO ACTIVE CURRENCY
# =========================
def to_active_currency(amount: float, exchange_rate: Decimal) -> float:
    try:
        value = Decimal(str(amount))

        if not value.is_finite():
            raise ValueError

        converted = value * exchange_rate

        return float(converted)

    except (InvalidOperation, TypeError, ValueError, ArithmeticError):
        raise HTTPException(
            status_code=500,
            detail="Unable to convert product amount.",
        )


# =========================
# FORMAT PRODUCT RESPONSE
# =========================
def product_to_response(product: Product, exchange_rate: Decimal):
    # Build a response without changing the SQLAlchemy object.
    result = {
        column.key: getattr(product, column.key)
        for column in Product.__table__.columns
    }

    # Database values remain in base currency.
    # Only the returned response uses active currency.
    result["cost"] = to_active_currency(
        product.cost,
        exchange_rate,
    )

    result["price"] = to_active_currency(
        product.price,
        exchange_rate,
    )

    return result


# =========================
# CHECK PRODUCT SUBSCRIPTION LIMIT
# =========================
def check_product_limit(db: Session, business_id: str):
    subscription = (
        db.query(BusinessSubscription)
        .filter(BusinessSubscription.business_id == business_id)
        .first()
    )

    if not subscription or subscription.status != "active":
        raise HTTPException(
            status_code=403,
            detail="An active subscription is required to add products.",
        )

    now = datetime.utcnow()

    if not subscription.expires_at or subscription.expires_at <= now:
        subscription.status = "expired"
        db.commit()

        raise HTTPException(
            status_code=403,
            detail="Your subscription has expired. Please renew to add products.",
        )

    plan = (
        db.query(SubscriptionPlan)
        .filter(SubscriptionPlan.id == subscription.plan_id)
        .first()
    )

    if not plan or plan.max_products is None:
        raise HTTPException(
            status_code=403,
            detail="The product limit for your plan is not configured.",
        )

    product_count = (
        db.query(Product)
        .filter(Product.business_id == business_id)
        .count()
    )

    # -1 means unlimited.
    if plan.max_products != -1 and product_count >= plan.max_products:
        raise HTTPException(
            status_code=403,
            detail=(
                f"You have reached your plan's product limit "
                f"of {plan.max_products}."
            ),
        )


# =========================
# GET PRODUCTS
# =========================
@router.get("", response_model=list[ProductOut])
def get_products(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = user["business_id"]

    _, exchange_rate = get_currency_settings(db, business_id)

    products = (
        db.query(Product)
        .filter(Product.business_id == business_id)
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        product_to_response(product, exchange_rate)
        for product in products
    ]


# =========================
# CREATE PRODUCT
# =========================
@router.post("", response_model=ProductOut)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = user.get("business_id")

    if not business_id:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a business.",
        )

    _, exchange_rate = get_currency_settings(db, business_id)

    # Convert entered active-currency amounts
    # back to the original business currency.
    base_cost = to_base_currency(product.cost, exchange_rate)
    base_price = to_base_currency(product.price, exchange_rate)

    normalized_name = product.name.strip().lower()

    existing = (
        db.query(Product)
        .filter(
            Product.business_id == business_id,
            func.lower(func.trim(Product.name)) == normalized_name,
        )
        .first()
    )

    # Existing products receive additional stock
    # without consuming another product slot.
    if existing:
        existing.stock += product.stock
        existing.cost = base_cost
        existing.price = base_price
        existing.category = product.category
        existing.barcode = product.barcode
        existing.image = product.image

        db.commit()
        db.refresh(existing)

        return product_to_response(existing, exchange_rate)

    # Check subscription only when creating a new product.
    check_product_limit(db, business_id)

    new_product = Product(
        name=product.name,
        cost=base_cost,
        price=base_price,
        category=product.category,
        stock=product.stock,
        barcode=product.barcode,
        image=product.image,
        business_id=business_id,
        created_by=user["id"],
        created_by_name=user.get("name"),
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    return product_to_response(new_product, exchange_rate)


# =========================
# DELETE PRODUCT
# =========================
@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.business_id == user["business_id"],
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    db.delete(product)
    db.commit()

    return {"message": "Product deleted successfully"}


# =========================
# UPDATE PRODUCT
# =========================
@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    updated: ProductUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = user["business_id"]

    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.business_id == business_id,
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    _, exchange_rate = get_currency_settings(db, business_id)

    update_data = updated.model_dump(exclude_unset=True)

    # Convert only monetary fields supplied by the frontend.
    if "cost" in update_data and update_data["cost"] is not None:
        update_data["cost"] = to_base_currency(
            update_data["cost"],
            exchange_rate,
        )

    if "price" in update_data and update_data["price"] is not None:
        update_data["price"] = to_base_currency(
            update_data["price"],
            exchange_rate,
        )

    for key, value in update_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)

    return product_to_response(product, exchange_rate)
