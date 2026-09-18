from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.orm import relationship
from app.models.base import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, index=True) # e.g. "PAT-8831"
    patient_code = Column(String, unique=True, index=True) # e.g. "JS-8831"
    name = Column(String, nullable=False) # e.g. "R. K." or Initials
    age = Column(Integer, nullable=False)
    age_group = Column(String, nullable=False) # "18–39", "40–59", "60–75", "76+"
    sex = Column(String, nullable=True) # "Male", "Female", "Other"
    ward = Column(String, nullable=True) # e.g. "ICU Bed 04"
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    screening_tests = relationship("ScreeningTest", back_populates="patient", cascade="all, delete-orphan")
