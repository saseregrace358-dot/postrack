from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.product import Product
from app.schemas.product import (
    ProductOut,
    ProductUpdate,
    ProductCreate
)
from pydantic import BaseModel
import os


router = APIRouter(prefix="/products", tags=["Products"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
class StockUpdate(BaseModel):
    stock: int

# =========================
# GET PRODUCTS
# =========================
@router.get("", response_model=list[ProductOut])
def get_products(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.query(Product).offset(skip).limit(limit).all()


# =========================
# CREATE PRODUCT (FIXED)
# =========================
@router.post("", response_model=ProductOut)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db)
):
    new_product = Product(
        name=product.name,
        cost=product.cost,
        price=product.price,
        category=product.category,
        stock=product.stock,
        barcode=product.barcode,
        image=product.image
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    return new_product

# =========================
# UPDATE PRODUCT
# =========================
@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    updated: ProductUpdate,
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for key, value in updated.dict(exclude_unset=True).items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)

    return product


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
@router.patch("/{product_id}/stock")
def update_stock(product_id: int, payload: StockUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.stock = payload.stock
    db.commit()
    db.refresh(product)

    return product