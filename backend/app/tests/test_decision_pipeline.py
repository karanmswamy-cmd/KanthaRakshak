from app.schemas.sensor import SensorSample
from app.schemas.test import FinalResultEnum
from app.services.decision_engine import DecisionEngine

def test_decision_pipeline_retest_on_poor_signal():
    engine = DecisionEngine()
    # Bad signal: flatline piezo
    samples = [
        SensorSample(timestamp=i*50, piezo=0.0, ax=0.0, ay=0.0, az=1.0, accel_magnitude=1.0)
        for i in range(60)
    ]
    features = {
        "piezo_detected": False,
        "motion_detected": False,
        "swallow_duration_ms": 0.0
    }
    res = engine.evaluate(samples, features)
    assert res["final_result"] == FinalResultEnum.RETEST

def test_decision_pipeline_low_risk_on_normal():
    engine = DecisionEngine()
    samples = []
    for i in range(70):
        t = i * 50
        piezo = 0.02 + (0.70 if 1000 <= t <= 1750 else 0.0)
        ax = 0.02 + (0.24 if 1000 <= t <= 1750 else 0.0)
        samples.append(SensorSample(
            timestamp=t,
            piezo=piezo,
            ax=ax,
            ay=0.05,
            az=0.98,
            accel_magnitude=float((ax**2 + 0.05**2 + 0.98**2)**0.5)
        ))

    features = {
        "piezo_detected": True,
        "motion_detected": True,
        "swallow_duration_ms": 750.0,
        "dominant_frequency_hz": 12.5,
        "spectral_peak_count": 2,
        "piezo_motion_delay_ms": 40.0,
        "cross_correlation_coeff": 0.72
    }
    res = engine.evaluate(samples, features)
    assert res["final_result"] == FinalResultEnum.LOW_RISK
    assert "No concerning swallowing pattern" in res["recommendation"]

def test_decision_pipeline_possible_risk_on_abnormal():
    engine = DecisionEngine()
    samples = []
    for i in range(90):
        t = i * 50
        piezo = 0.02 + (0.75 if 1500 <= t <= 3150 else 0.0)
        ax = 0.02 + (0.35 if 1500 <= t <= 3150 else 0.0)
        samples.append(SensorSample(
            timestamp=t,
            piezo=piezo,
            ax=ax,
            ay=0.05,
            az=0.98,
            accel_magnitude=float((ax**2 + 0.05**2 + 0.98**2)**0.5)
        ))

    # Synchronized but physiologically prolonged and fragmented
    features = {
        "piezo_detected": True,
        "motion_detected": True,
        "swallow_duration_ms": 1650.0, # Prolonged (>1250ms reference)
        "dominant_frequency_hz": 9.0,
        "spectral_peak_count": 6,      # Multiple fragmented bursts
        "piezo_motion_delay_ms": 80.0,  # Coincident within acceptable lag
        "cross_correlation_coeff": 0.55 # Sensors agree on the abnormal swallow
    }
    res = engine.evaluate(samples, features)
    assert res["final_result"] == FinalResultEnum.POSSIBLE_RISK
    assert "Further assessment by a qualified clinician" in res["recommendation"]
