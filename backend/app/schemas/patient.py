from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

def derive_age_group(age: int) -> str:
    """
    Derives age stratification group.
    Note: Stored strictly for retrospective research and audit analysis.
    Does not modulate normal clinical swallow thresholds in decision logic.
    """
    if age < 18:
        return "<18"
    elif age <= 39:
        return "18–39"
    elif age <= 59:
        return "40–59"
    elif age <= 75:
        return "60–75"
    else:
        return "76+"

class PatientCreate(BaseModel):
    id: Optional[str] = None
    patient_code: Optional[str] = None
    name: str = Field(..., description="Patient name or initials")
    age: int = Field(..., ge=1, le=120)
    sex: Optional[str] = "Prefer not to say"
    ward: Optional[str] = None

class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_code: str
    name: str
    age: int
    age_group: str
    sex: Optional[str]
    ward: Optional[str]
    created_at: datetime
    screening_count: int = 0
