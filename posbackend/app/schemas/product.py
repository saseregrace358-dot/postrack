
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional


class ProductBase(BaseModel):
    name: str
    cost: float
    price: float
    category: str
    stock: int
    barcode: Optional[str] = None
    image: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    cost: Optional[float] = None
    price: Optional[float] = None
    category: Optional[str] = None
    stock: Optional[int] = None
    image: Optional[str] = None
    barcode: Optional[str] = None


class ProductOut(ProductBase):
    id: int

    created_by: Optional[int] = None
    created_by_name: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
