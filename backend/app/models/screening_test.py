from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.models.base import Base

class ScreeningTest(Base):
    __tablename__ = "screening_tests"

    id = Column(String, primary_key=True, index=True) # e.g. "TEST-8812"
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)

    # Signal Quality & Heuristic flags
    signal_quality = Column(String, nullable=False, default="GOOD") # GOOD, FAIR, POOR
    noise_level = Column(String, nullable=False, default="LOW")     # LOW, MEDIUM, HIGH

    piezo_detected = Column(Boolean, default=False)
    motion_detected = Column(Boolean, default=False)

    sensor_agreement = Column(String, default="HIGH") # HIGH, MEDIUM, LOW

    # Extracted Biomechanical/Acoustic Features
    swallow_duration = Column(Float, default=0.0)      # ms
    dominant_frequency = Column(Float, default=0.0)    # Hz
    spectral_peak_count = Column(Integer, default=0)

    # ML & Rule Decision Outputs
    ml_probability = Column(Float, nullable=True)      # 0.0 - 1.0
    ml_prediction = Column(String, nullable=True)       # NORMAL, ABNORMAL, INCONCLUSIVE
    rule_result = Column(String, default="PASS")        # PASS, FLAG, NOT_VALIDATED
    final_result = Column(String, nullable=False)       # LOW_RISK, RETEST, POSSIBLE_RISK

    explanation_json = Column(Text, nullable=True)      # JSON list of plain language strings

    # Relationships
    patient = relationship("Patient", back_populates="screening_tests")
    sensor_session = relationship("SensorSession", back_populates="screening_test", uselist=False, cascade="all, delete-orphan")
