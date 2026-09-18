from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.base import get_db
from app.schemas.patient import PatientCreate, PatientResponse
from app.repositories.patient_repo import PatientRepository

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(data: PatientCreate, db: Session = Depends(get_db)):
    repo = PatientRepository(db)
    # Check if exists
    if data.id:
        existing = repo.get_by_id(data.id)
        if existing:
            return PatientResponse(
                id=existing.id,
                patient_code=existing.patient_code,
                name=existing.name,
                age=existing.age,
                age_group=existing.age_group,
                sex=existing.sex,
                ward=existing.ward,
                created_at=existing.created_at,
                screening_count=len(existing.screening_tests)
            )
    patient = repo.create(data)
    return PatientResponse(
        id=patient.id,
        patient_code=patient.patient_code,
        name=patient.name,
        age=patient.age,
        age_group=patient.age_group,
        sex=patient.sex,
        ward=patient.ward,
        created_at=patient.created_at,
        screening_count=0
    )

@router.get("", response_model=List[PatientResponse])
def list_patients(db: Session = Depends(get_db)):
    repo = PatientRepository(db)
    patients = repo.get_all()
    res = []
    for p in patients:
        res.append(PatientResponse(
            id=p.id,
            patient_code=p.patient_code,
            name=p.name,
            age=p.age,
            age_group=p.age_group,
            sex=p.sex,
            ward=p.ward,
            created_at=p.created_at,
            screening_count=len(p.screening_tests)
        ))
    return res

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    repo = PatientRepository(db)
    p = repo.get_by_id(patient_id)
    if not p:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    return PatientResponse(
        id=p.id,
        patient_code=p.patient_code,
        name=p.name,
        age=p.age,
        age_group=p.age_group,
        sex=p.sex,
        ward=p.ward,
        created_at=p.created_at,
        screening_count=len(p.screening_tests)
    )
