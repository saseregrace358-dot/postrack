
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional


class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class SaleCreate(BaseModel):
    items: List[SaleItemCreate] = Field(min_length=1)
    amountPaid: float = Field(default=0, ge=0)
    paymentMethod: str = "Cash"


class SaleOut(BaseModel):
    id: int
    order_id: str

    items: list = Field(default_factory=list)

    subtotal: float
    tax: float
    total: float

    amountPaid: float
    balance: float
    paymentMethod: str
    status: str

    base_currency: Optional[str] = None
    currency_at_sale: Optional[str] = None
    exchange_rate_at_sale: Optional[float] = None
    original_amounts: Optional[dict] = None

    created_by: Optional[int] = None
    created_by_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
