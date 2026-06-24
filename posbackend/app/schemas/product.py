
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class ProductBase(BaseModel):
    name: str
    cost: float
    price: float
    category: str
    stock: int
    barcode: str | None = None
    image: str | None = None

class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str]
    cost: Optional[float]
    price: Optional[float]
    category: Optional[str]
    stock: Optional[int]
    image: Optional[str]
    barcode: Optional[str]

class ProductOut(ProductBase):
    id: int

    created_by: int | None = None
    created_by_name: str | None = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
    class Config:
       from_attributes = True
       alias_generator = None