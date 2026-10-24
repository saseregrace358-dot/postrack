from pydantic import BaseModel, Field
from typing import List


class ReturnItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    item_condition: str = "Resellable"


class ReturnCreate(BaseModel):
    sale_id: int
    reason: str = Field(min_length=1, max_length=500)
    items: List[ReturnItemCreate] = Field(min_length=1)