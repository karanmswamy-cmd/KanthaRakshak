from app.services.rule_engine import RuleEngine

def test_rule_engine_pass():
    engine = RuleEngine()
    features = {
        "swallow_duration_ms": 780.0,
        "dominant_frequency_hz": 14.5,
        "spectral_peak_count": 2
    }
    status, flags, reasons = engine.evaluate(
        signal_quality="GOOD",
        sensor_agreement="HIGH",
        features=features,
        ml_prediction="NORMAL"
    )
    assert status == "PASS"
    assert "PROLONGED_SWALLOW_DURATION" not in flags

def test_rule_engine_flag_prolonged_duration():
    engine = RuleEngine()
    features = {
        "swallow_duration_ms": 1650.0, # Exceeds 1250ms reference
        "dominant_frequency_hz": 12.0,
        "spectral_peak_count": 4
    }
    status, flags, reasons = engine.evaluate(
        signal_quality="GOOD",
        sensor_agreement="HIGH",
        features=features,
        ml_prediction="ABNORMAL"
    )
    assert status == "FLAG"
    assert "PROLONGED_SWALLOW_DURATION" in flags
