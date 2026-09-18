import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.base import get_db
from app.schemas.test import (
    TestStartRequest,
    TestStartResponse,
    TestFinishRequest,
    ScreeningTestResponse,
    FinalResultEnum
)
from app.repositories.test_repo import ScreeningTestRepository
from app.repositories.patient_repo import PatientRepository
from app.services.decision_engine import DecisionEngine
from app.services.feature_service import FeatureService
from app.core.websocket_manager import ws_manager

router = APIRouter(prefix="/tests", tags=["Screening Tests"])
decision_engine = DecisionEngine()

@router.post("/start", response_model=TestStartResponse, status_code=status.HTTP_201_CREATED)
def start_screening_test(req: TestStartRequest, db: Session = Depends(get_db)):
    p_repo = PatientRepository(db)
    patient = p_repo.get_by_id(req.patient_id)
    if not patient:
        # Create minimal placeholder patient if needed for demo
        from app.schemas.patient import PatientCreate
        patient = p_repo.create(PatientCreate(id=req.patient_id, name="Screening Subject", age=65))

    test_id = f"TEST-{int(datetime.utcnow().timestamp()) % 100000:05d}"
    t_repo = ScreeningTestRepository(db)
    t = t_repo.create_initial(test_id, patient.id)

    return TestStartResponse(
        test_id=t.id,
        patient_id=patient.id,
        started_at=t.started_at,
        message="Screening session initialized. Connect to WebSocket /ws/live/{test_id} to stream telemetry."
    )

@router.post("/{test_id}/finish", response_model=ScreeningTestResponse)
def finish_screening_test(
    test_id: str,
    req: Optional[TestFinishRequest] = None,
    db: Session = Depends(get_db)
):
    t_repo = ScreeningTestRepository(db)
    test = t_repo.get_by_id(test_id)
    if not test:
        raise HTTPException(status_code=404, detail=f"Screening test {test_id} not found")

    # Fetch buffered samples from in-memory ring buffer
    samples = ws_manager.get_session_samples(test_id)

    # If no live samples were streamed (e.g. direct API test), load synthetic normal demo samples
    if not samples:
        from app.services.ble_service import DATA_DIR
        import csv
        from app.schemas.sensor import SensorSample
        demo_csv = DATA_DIR / "normal_demo.csv"
        if demo_csv.exists():
            with open(demo_csv, "r", encoding="utf-8") as f:
                reader = csv.reader(f)
                for row in reader:
                    if not row or row[0].startswith("#") or row[0] == "timestamp":
                        continue
                    samples.append(SensorSample(
                        timestamp=float(row[0]),
                        piezo=float(row[1]),
                        ax=float(row[2]),
                        ay=float(row[3]),
                        az=float(row[4]),
                        gx=float(row[5]),
                        gy=float(row[6]),
                        gz=float(row[7]),
                        accel_magnitude=float(row[8])
                    ))

    # 1. Feature Extraction
    features = FeatureService.extract_features(samples)

    # 2. Synthesized Decision Engine
    eval_result = decision_engine.evaluate(samples, features)

    # Optional client-side force override (for testing UI states)
    if req and req.force_result:
        eval_result["final_result"] = req.force_result

    # 3. Save raw session to CSV
    session_file_path = ws_manager.save_session_to_csv(test_id)
    ws_manager.clear_session_buffer(test_id)

    # 4. Update Database
    updated_test = t_repo.update_finished_test(
        test_id=test_id,
        evaluation_result=eval_result,
        features=features,
        session_file_path=session_file_path
    )

    reasons = json.loads(updated_test.explanation_json) if updated_test.explanation_json else []

    return ScreeningTestResponse(
        id=updated_test.id,
        patient_id=updated_test.patient_id,
        patient_name=updated_test.patient.name if updated_test.patient else None,
        patient_age=updated_test.patient.age if updated_test.patient else None,
        patient_age_group=updated_test.patient.age_group if updated_test.patient else None,
        ward=updated_test.patient.ward if updated_test.patient else None,
        started_at=updated_test.started_at,
        finished_at=updated_test.finished_at,
        signal_quality=updated_test.signal_quality,
        noise_level=updated_test.noise_level,
        piezo_detected=updated_test.piezo_detected,
        motion_detected=updated_test.motion_detected,
        sensor_agreement=updated_test.sensor_agreement,
        swallow_duration=updated_test.swallow_duration,
        dominant_frequency=updated_test.dominant_frequency,
        spectral_peak_count=updated_test.spectral_peak_count,
        ml_prediction=updated_test.ml_prediction,
        ml_probability=updated_test.ml_probability,
        rule_result=updated_test.rule_result,
        final_result=FinalResultEnum(updated_test.final_result),
        explanation=reasons,
        recommendation=eval_result.get("recommendation", "")
    )

@router.get("", response_model=List[ScreeningTestResponse])
def list_screening_tests(db: Session = Depends(get_db)):
    t_repo = ScreeningTestRepository(db)
    tests = t_repo.get_all()
    res = []
    for t in tests:
        reasons = json.loads(t.explanation_json) if t.explanation_json else []
        res.append(ScreeningTestResponse(
            id=t.id,
            patient_id=t.patient_id,
            patient_name=t.patient.name if t.patient else None,
            patient_age=t.patient.age if t.patient else None,
            patient_age_group=t.patient.age_group if t.patient else None,
            ward=t.patient.ward if t.patient else None,
            started_at=t.started_at,
            finished_at=t.finished_at,
            signal_quality=t.signal_quality,
            noise_level=t.noise_level,
            piezo_detected=t.piezo_detected,
            motion_detected=t.motion_detected,
            sensor_agreement=t.sensor_agreement,
            swallow_duration=t.swallow_duration,
            dominant_frequency=t.dominant_frequency,
            spectral_peak_count=t.spectral_peak_count,
            ml_prediction=t.ml_prediction,
            ml_probability=t.ml_probability,
            rule_result=t.rule_result,
            final_result=FinalResultEnum(t.final_result) if t.final_result in FinalResultEnum.__members__ else FinalResultEnum.LOW_RISK,
            explanation=reasons,
            recommendation="Review complete clinical report."
        ))
    return res

@router.get("/{test_id}", response_model=ScreeningTestResponse)
def get_screening_test(test_id: str, db: Session = Depends(get_db)):
    t_repo = ScreeningTestRepository(db)
    t = t_repo.get_by_id(test_id)
    if not t:
        raise HTTPException(status_code=404, detail=f"Screening test {test_id} not found")

    reasons = json.loads(t.explanation_json) if t.explanation_json else []
    return ScreeningTestResponse(
        id=t.id,
        patient_id=t.patient_id,
        patient_name=t.patient.name if t.patient else None,
        patient_age=t.patient.age if t.patient else None,
        patient_age_group=t.patient.age_group if t.patient else None,
        ward=t.patient.ward if t.patient else None,
        started_at=t.started_at,
        finished_at=t.finished_at,
        signal_quality=t.signal_quality,
        noise_level=t.noise_level,
        piezo_detected=t.piezo_detected,
        motion_detected=t.motion_detected,
        sensor_agreement=t.sensor_agreement,
        swallow_duration=t.swallow_duration,
        dominant_frequency=t.dominant_frequency,
        spectral_peak_count=t.spectral_peak_count,
        ml_prediction=t.ml_prediction,
        ml_probability=t.ml_probability,
        rule_result=t.rule_result,
        final_result=FinalResultEnum(t.final_result) if t.final_result in FinalResultEnum.__members__ else FinalResultEnum.LOW_RISK,
        explanation=reasons,
        recommendation="Review complete clinical report."
    )
