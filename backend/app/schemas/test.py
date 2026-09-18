from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class FinalResultEnum(str, Enum):
    LOW_RISK = "LOW_RISK"
    RETEST = "RETEST"
    POSSIBLE_RISK = "POSSIBLE_RISK"

class TestStartRequest(BaseModel):
    patient_id: str

class TestStartResponse(BaseModel):
    test_id: str
    patient_id: str
    started_at: datetime
    message: str

class TestFinishRequest(BaseModel):
    # Optional client-provided metrics or override data
    force_result: Optional[FinalResultEnum] = None
    operator_notes: Optional[str] = None

class ExplainabilityResponse(BaseModel):
    signal_quality: str
    piezo_event_detected: bool
    movement_event_detected: bool
    sensor_agreement: str
    swallow_duration_ms: float
    dominant_frequency_hz: float
    spectral_peak_count: int
    ml_prediction: Optional[str] = None
    ml_probability: Optional[float] = None
    rule_verification: str
    plain_language_explanations: List[str]
    retest_reasons: Optional[List[str]] = None
    research_validation_required: bool = True

class ScreeningTestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    patient_name: Optional[str] = None
    patient_age: Optional[int] = None
    patient_age_group: Optional[str] = None
    ward: Optional[str] = None
    started_at: datetime
    finished_at: Optional[datetime] = None
    signal_quality: str
    noise_level: str
    piezo_detected: bool
    motion_detected: bool
    sensor_agreement: str
    swallow_duration: float
    dominant_frequency: float
    spectral_peak_count: int
    ml_prediction: Optional[str] = None
    ml_probability: Optional[float] = None
    rule_result: str
    final_result: FinalResultEnum
    explanation: List[str]
    recommendation: str
