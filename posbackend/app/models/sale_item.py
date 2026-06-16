from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class SaleCreate(BaseModel):
    id: str
    date: str
    items: List[Dict[str, Any]]
    subtotal: float
    tax: float
    total: float
    amountPaid: float
    balance: float
    paymentMethod: str
    status: str
    payments: Optional[list] = []