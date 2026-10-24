
from typing import List, Literal

from pydantic import BaseModel, Field


class ReturnItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    item_condition: Literal["Resellable", "Damaged"] = "Resellable"


class ReturnCreate(BaseModel):
    sale_id: int
    reason: str = Field(min_length=1, max_length=500)
    refund_status: Literal["PENDING", "COMPLETED"] = "PENDING"
    items: List[ReturnItemCreate] = Field(min_length=1)


class RefundStatusUpdate(BaseModel):
    refund_status: Literal["PENDING", "COMPLETED"]
