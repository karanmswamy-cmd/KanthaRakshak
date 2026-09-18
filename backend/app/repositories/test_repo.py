import json
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.screening_test import ScreeningTest
from app.models.sensor_session import SensorSession

class ScreeningTestRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[ScreeningTest]:
        return self.db.query(ScreeningTest).order_by(ScreeningTest.started_at.desc()).all()

    def get_by_id(self, test_id: str) -> Optional[ScreeningTest]:
        return self.db.query(ScreeningTest).filter(ScreeningTest.id == test_id).first()

    def get_by_patient_id(self, patient_id: str) -> List[ScreeningTest]:
        return self.db.query(ScreeningTest).filter(ScreeningTest.patient_id == patient_id).order_by(ScreeningTest.started_at.desc()).all()

    def create_initial(self, test_id: str, patient_id: str) -> ScreeningTest:
        test = ScreeningTest(
            id=test_id,
            patient_id=patient_id,
            started_at=datetime.utcnow(),
            final_result="RETEST" # default until finished
        )
        self.db.add(test)
        self.db.commit()
        self.db.refresh(test)
        return test

    def update_finished_test(
        self,
        test_id: str,
        evaluation_result: dict,
        features: dict,
        session_file_path: Optional[str] = None
    ) -> ScreeningTest:
        test = self.get_by_id(test_id)
        if not test:
            # Create if was started directly
            test = ScreeningTest(id=test_id, patient_id="PAT-8831", started_at=datetime.utcnow())
            self.db.add(test)

        test.finished_at = datetime.utcnow()
        test.signal_quality = evaluation_result.get("signal_quality", "GOOD")
        test.noise_level = evaluation_result.get("noise_level", "LOW")
        test.piezo_detected = features.get("piezo_detected", False)
        test.motion_detected = features.get("motion_detected", False)
        test.sensor_agreement = evaluation_result.get("sensor_agreement", "HIGH")
        test.swallow_duration = features.get("swallow_duration_ms", 0.0)
        test.dominant_frequency = features.get("dominant_frequency_hz", 0.0)
        test.spectral_peak_count = features.get("spectral_peak_count", 0)
        test.ml_prediction = evaluation_result.get("ml_prediction")
        test.ml_probability = evaluation_result.get("ml_probability")
        test.rule_result = evaluation_result.get("rule_status", "PASS")
        test.final_result = evaluation_result.get("final_result", "LOW_RISK")
        test.explanation_json = json.dumps(evaluation_result.get("plain_language_explanations", []))

        # Update sensor session file link
        if session_file_path:
            session = SensorSession(
                id=f"SESS-{test_id}",
                test_id=test_id,
                raw_file_path=session_file_path,
                sample_rate=50,
                duration=features.get("swallow_duration_ms", 0.0) / 1000.0
            )
            self.db.merge(session)

        self.db.commit()
        self.db.refresh(test)
        return test
