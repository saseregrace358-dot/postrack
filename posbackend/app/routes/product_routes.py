from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.product import Product
from app.schemas.product import (
    ProductOut,
    ProductUpdate,
    ProductCreate
)
from app.auth.dependencies import get_current_user
from pydantic import BaseModel
import os
from sqlalchemy import func

router = APIRouter(prefix="/products", tags=["Products"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
class StockUpdate(BaseModel):
    stock: int

# =========================
# GET PRODUCTS
# =========================
@router.get("", response_model=list[ProductOut])
def get_products(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    return (
        db.query(Product)
        .filter(Product.business_id == user["business_id"])
        .offset(skip)
        .limit(limit)
        .all()
    )

# =========================
# CREATE PRODUCT (FIXED)
# =========================
@router.post("", response_model=ProductOut)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    
    existing = (
        db.query(Product)
        .filter(
            Product.business_id == user["business_id"],
            func.lower(Product.name) == product.name.lower()
        )
        .first()
    )

    if existing:
        # Update existing product
        existing.stock += product.stock
        existing.cost = product.cost
        existing.price = product.price
        existing.category = product.category
        existing.barcode = product.barcode
        existing.image = product.image

        db.commit()
        db.refresh(existing)

        return existing

    new_product = Product(
        name=product.name,
        cost=product.cost,
        price=product.price,
        category=product.category,
        stock=product.stock,
        barcode=product.barcode,
        image=product.image,

        # 🔥 ownership
        business_id=user["business_id"],
        created_by=user["id"],
        created_by_name=user.get("name")
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    return new_product
# =========================
# UPDATE PRODUCT
# =========================

# =========================
# DELETE PRODUCT
# =========================
@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(product)
    db.commit()

    return {"message": "Product deleted successfully"}

# ✅ PATCH endpoint
@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    updated: ProductUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.business_id == user["business_id"]
        )
        .first()
    )

    if not product:
        raise HTTPException(404, detail="Product not found")

    for key, value in updated.model_dump(exclude_unset=True).items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)

    return product