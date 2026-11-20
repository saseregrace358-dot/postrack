
from decimal import (
    Decimal,
    InvalidOperation,
    ROUND_HALF_UP,
)
import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product
from app.models.business_settings import BusinessSettings
from app.schemas.product import (
    ProductOut,
    ProductUpdate,
    ProductCreate,
)
from app.auth.dependencies import get_current_user

from app.services.subscription_service import (
    get_valid_subscription,
    check_subscription_feature,
    check_creation_limit,
)

router = APIRouter(
    prefix="/products",
    tags=["Products"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class StockUpdate(BaseModel):
    stock: int


# ============================================================
# CURRENCY HELPERS
# ============================================================

def currency_digits(currency: str) -> int:
    return 0 if currency.upper() == "JPY" else 2


def round_money(amount, currency: str) -> Decimal:
    try:
        value = Decimal(str(amount))

        if not value.is_finite():
            raise ValueError

        precision = Decimal("1").scaleb(
            -currency_digits(currency)
        )

        return value.quantize(
            precision,
            rounding=ROUND_HALF_UP,
        )

    except (
        InvalidOperation,
        TypeError,
        ValueError,
        ArithmeticError,
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid monetary amount.",
        )


# ============================================================
# GET BUSINESS CURRENCY SETTINGS
# ============================================================

def get_currency_settings(
    db: Session,
    business_id: str,
):
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
            detail="The business currency configuration is invalid.",
        )

    try:
        exchange_rate = Decimal(
            str(settings.exchange_rate)
        )

    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ):
        raise HTTPException(
            status_code=409,
            detail="The business exchange rate is invalid.",
        )

    if (
        not exchange_rate.is_finite()
        or exchange_rate <= 0
    ):
        raise HTTPException(
            status_code=409,
            detail="The business exchange rate must be greater than zero.",
        )

    if (
        base_currency == active_currency
        and exchange_rate != Decimal("1")
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "The exchange rate must be 1 when the base currency "
                "and active currency are the same."
            ),
        )

    settings.base_currency = base_currency
    settings.currency = active_currency

    return settings, exchange_rate


# ============================================================
# CONVERT ACTIVE CURRENCY TO BASE CURRENCY
# ============================================================

def to_base_currency(
    amount,
    exchange_rate: Decimal,
    base_currency: str,
) -> Decimal:
    try:
        value = Decimal(str(amount))

        if not value.is_finite():
            raise ValueError

        converted = value / exchange_rate

        return round_money(
            converted,
            base_currency,
        )

    except (
        InvalidOperation,
        TypeError,
        ValueError,
        ArithmeticError,
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid monetary amount supplied.",
        )


# ============================================================
# CONVERT BASE CURRENCY TO ACTIVE CURRENCY
# ============================================================

def to_active_currency(
    amount,
    exchange_rate: Decimal,
    active_currency: str,
) -> Decimal:
    try:
        value = Decimal(str(amount))

        if not value.is_finite():
            raise ValueError

        converted = value * exchange_rate

        return round_money(
            converted,
            active_currency,
        )

    except (
        InvalidOperation,
        TypeError,
        ValueError,
        ArithmeticError,
    ):
        raise HTTPException(
            status_code=500,
            detail="Unable to convert product amount.",
        )


# ============================================================
# FORMAT PRODUCT RESPONSE
# ============================================================

def product_to_response(
    product: Product,
    exchange_rate: Decimal,
    active_currency: str,
):
    result = {
        column.key: getattr(product, column.key)
        for column in Product.__table__.columns
    }

    result["base_cost"] = float(
        Decimal(str(product.cost or 0))
    )

    result["base_price"] = float(
        Decimal(str(product.price or 0))
    )

    result["cost"] = float(
        to_active_currency(
            product.cost or 0,
            exchange_rate,
            active_currency,
        )
    )

    result["price"] = float(
        to_active_currency(
            product.price or 0,
            exchange_rate,
            active_currency,
        )
    )

    result["currency"] = active_currency

    return result


# ============================================================
# GET PRODUCTS
# ============================================================

@router.get(
    "",
    response_model=list[ProductOut],
)
def get_products(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = user.get("business_id")

    if not business_id:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a business.",
        )

    settings, exchange_rate = get_currency_settings(
        db,
        business_id,
    )

    products = (
        db.query(Product)
        .filter(
            Product.business_id == business_id
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        product_to_response(
            product,
            exchange_rate,
            settings.currency,
        )
        for product in products
    ]


# ============================================================
# CREATE PRODUCT OR ADD STOCK TO EXISTING PRODUCT
# ============================================================

@router.post(
    "",
    response_model=ProductOut,
)
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

    # Check subscription before either creating a product
    # or adding stock to an existing product.
    get_valid_subscription(
        db,
        business_id,
    )

    settings, exchange_rate = get_currency_settings(
        db,
        business_id,
    )

    base_cost = to_base_currency(
        product.cost,
        exchange_rate,
        settings.base_currency,
    )

    base_price = to_base_currency(
        product.price,
        exchange_rate,
        settings.base_currency,
    )

    normalized_name = product.name.strip().lower()

    existing = (
        db.query(Product)
        .filter(
            Product.business_id == business_id,
            func.lower(
                func.trim(Product.name)
            ) == normalized_name,
        )
        .first()
    )

    # Existing products do not consume another product slot.
    if existing:
        existing.stock += product.stock
        existing.cost = float(base_cost)
        existing.price = float(base_price)
        existing.category = product.category
        existing.barcode = product.barcode
        existing.image = product.image

        db.commit()
        db.refresh(existing)

        return product_to_response(
            existing,
            exchange_rate,
            settings.currency,
        )

    # Only a genuinely new product consumes a product slot.
    check_creation_limit(
        db,
        business_id,
        "products",
    )

    new_product = Product(
        name=product.name,
        cost=float(base_cost),
        price=float(base_price),
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

    return product_to_response(
        new_product,
        exchange_rate,
        settings.currency,
    )


# ============================================================
# DELETE PRODUCT
# ============================================================

@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = user.get("business_id")

    if not business_id:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a business.",
        )

    get_valid_subscription(
        db,
        business_id,
    )

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
            detail="Product not found.",
        )

    db.delete(product)
    db.commit()

    return {
        "message": "Product deleted successfully"
    }


# ============================================================
# UPDATE PRODUCT
# ============================================================

@router.put(
    "/{product_id}",
    response_model=ProductOut,
)
def update_product(
    product_id: int,
    updated: ProductUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    business_id = user.get("business_id")

    if not business_id:
        raise HTTPException(
            status_code=403,
            detail="Your account is not linked to a business.",
        )

    get_valid_subscription(
        db,
        business_id,
    )

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
            detail="Product not found.",
        )

    settings, exchange_rate = get_currency_settings(
        db,
        business_id,
    )

    update_data = updated.model_dump(
        exclude_unset=True
    )

    if (
        "cost" in update_data
        and update_data["cost"] is not None
    ):
        update_data["cost"] = float(
            to_base_currency(
                update_data["cost"],
                exchange_rate,
                settings.base_currency,
            )
        )

    if (
        "price" in update_data
        and update_data["price"] is not None
    ):
        update_data["price"] = float(
            to_base_currency(
                update_data["price"],
                exchange_rate,
                settings.base_currency,
            )
        )

    for key, value in update_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)

    return product_to_response(
        product,
        exchange_rate,
        settings.currency,
    )
