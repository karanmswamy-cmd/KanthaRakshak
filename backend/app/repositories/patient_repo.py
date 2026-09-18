from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, derive_age_group

class PatientRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[Patient]:
        return self.db.query(Patient).order_by(Patient.created_at.desc()).all()

    def get_by_id(self, patient_id: str) -> Optional[Patient]:
        return self.db.query(Patient).filter(Patient.id == patient_id).first()

    def get_by_code(self, patient_code: str) -> Optional[Patient]:
        return self.db.query(Patient).filter(Patient.patient_code == patient_code).first()

    def create(self, data: PatientCreate) -> Patient:
        patient_id = data.id or f"PAT-{int(self.db.query(Patient).count() + 1001)}"
        patient_code = data.patient_code or f"JS-{patient_id.split('-')[-1]}"
        age_group = derive_age_group(data.age)

        patient = Patient(
            id=patient_id,
            patient_code=patient_code,
            name=data.name,
            age=data.age,
            age_group=age_group,
            sex=data.sex,
            ward=data.ward
        )
        self.db.add(patient)
        self.db.commit()
        self.db.refresh(patient)
        return patient
