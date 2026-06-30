from pydantic import BaseModel

class BusinessSettingsSchema(BaseModel):
    tax_enabled: bool
    tax_rate: float
    debt_threshold: float