from pydantic import BaseModel
from typing import List

class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int
    price: float


class SaleCreate(BaseModel):
    items: List[SaleItemCreate]
    subtotal: float
    tax: float
    total: float
    amountPaid: float
    balance: float
    paymentMethod: str

class SaleOut(BaseModel):
    id: int
    order_id: str

    subtotal: float
    tax: float
    total: float

    amountPaid: float
    balance: float
    paymentMethod: str
    status: str

    created_by: int | None = None
    created_by_name: str | None = None

    class Config:
        from_attributes = True    
    