from sqlalchemy import Column, String, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base

class SensorSession(Base):
    __tablename__ = "sensor_sessions"

    id = Column(String, primary_key=True, index=True)
    test_id = Column(String, ForeignKey("screening_tests.id"), nullable=False, unique=True, index=True)
    raw_file_path = Column(String, nullable=True)
    filtered_file_path = Column(String, nullable=True)
    sample_rate = Column(Integer, default=50) # Hz
    packet_loss = Column(Float, default=0.0) # Percentage (e.g. 0.0)
    duration = Column(Float, default=0.0) # seconds

    # Relationships
    screening_test = relationship("ScreeningTest", back_populates="sensor_session")
