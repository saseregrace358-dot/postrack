
from pydantic import BaseModel
from typing import Optional


class BusinessSettingsSchema(BaseModel):
    tax_enabled: bool
    tax_rate: float
    debt_threshold: float

    currency: Optional[str] = None
