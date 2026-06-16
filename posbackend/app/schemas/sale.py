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
    status: str