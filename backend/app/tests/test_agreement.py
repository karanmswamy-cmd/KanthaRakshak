from app.services.sensor_agreement import SensorAgreementService

def test_sensor_agreement_high():
    features = {
        "piezo_detected": True,
        "motion_detected": True,
        "piezo_motion_delay_ms": 45.0,
        "cross_correlation_coeff": 0.68
    }
    agreement, reasons = SensorAgreementService.evaluate_agreement(features)
    assert agreement == "HIGH"
    assert len(reasons) > 0

def test_sensor_agreement_one_modality_missing():
    features = {
        "piezo_detected": True,
        "motion_detected": False,
        "piezo_motion_delay_ms": 999.0,
        "cross_correlation_coeff": 0.05
    }
    agreement, reasons = SensorAgreementService.evaluate_agreement(features)
    assert agreement == "LOW"

def test_sensor_agreement_excessive_lag():
    features = {
        "piezo_detected": True,
        "motion_detected": True,
        "piezo_motion_delay_ms": 380.0, # Exceeds 250ms reference
        "cross_correlation_coeff": 0.15
    }
    agreement, reasons = SensorAgreementService.evaluate_agreement(features)
    assert agreement == "LOW"
