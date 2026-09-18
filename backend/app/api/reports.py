import json
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.models.base import get_db
from app.repositories.test_repo import ScreeningTestRepository
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/{test_id}")
def get_report(
    test_id: str,
    format: str = Query("json", description="'json' or 'pdf'"),
    db: Session = Depends(get_db)
):
    t_repo = ScreeningTestRepository(db)
    test = t_repo.get_by_id(test_id)
    if not test:
        raise HTTPException(status_code=404, detail=f"Screening test {test_id} not found")

    patient = test.patient
    if not patient:
        from app.models.patient import Patient
        patient = Patient(id=test.patient_id, name="Patient", age=65, age_group="60–75")

    if format.lower() == "pdf":
        pdf_buffer = ReportService.generate_pdf_report(test, patient)
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=KanthaRakshak_Report_{test_id}.pdf"}
        )

    # Return structured JSON summary
    reasons = json.loads(test.explanation_json) if test.explanation_json else []
    return {
        "report_id": f"REP-{test.id}",
        "test_id": test.id,
        "patient_id": patient.id,
        "patient_code": patient.patient_code,
        "patient_name": patient.name,
        "age": patient.age,
        "age_group": patient.age_group,
        "ward": patient.ward,
        "started_at": test.started_at.isoformat(),
        "finished_at": test.finished_at.isoformat() if test.finished_at else None,
        "final_result": test.final_result,
        "signal_quality": test.signal_quality,
        "sensor_agreement": test.sensor_agreement,
        "swallow_duration_ms": test.swallow_duration,
        "dominant_frequency_hz": test.dominant_frequency,
        "spectral_peak_count": test.spectral_peak_count,
        "explanations": reasons,
        "disclaimer": "KanthaRakshak is an experimental screening prototype and is not intended to provide a clinical diagnosis.",
        "pdf_download_url": f"/api/reports/{test_id}?format=pdf"
    }
