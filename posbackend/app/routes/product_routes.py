
from datetime import datetime
import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product
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
    if (
        plan.max_products != -1
        and product_count >= plan.max_products
    ):
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
    return (
        db.query(Product)
        .filter(Product.business_id == user["business_id"])
        .offset(skip)
        .limit(limit)
        .all()
    )


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

    normalized_name = product.name.strip().lower()

    existing = (
        db.query(Product)
        .filter(
            Product.business_id == business_id,
            func.lower(func.trim(Product.name)) == normalized_name,
        )
        .first()
    )

    # Existing products can receive additional stock without
    # consuming another product slot.
    if existing:
        existing.stock += product.stock
        existing.cost = product.cost
        existing.price = product.price
        existing.category = product.category
        existing.barcode = product.barcode
        existing.image = product.image

        db.commit()
        db.refresh(existing)
        return existing

    # Check the subscription only when creating a new product.
    check_product_limit(db, business_id)

    new_product = Product(
        name=product.name,
        cost=product.cost,
        price=product.price,
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

    return new_product


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

    for key, value in updated.model_dump(exclude_unset=True).items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)

    return product
