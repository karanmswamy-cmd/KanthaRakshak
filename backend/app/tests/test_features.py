from app.schemas.sensor import SensorSample
from app.services.feature_service import FeatureService

def test_feature_extraction_empty():
    features = FeatureService.extract_features([])
    assert features["swallow_duration_ms"] == 0.0
    assert features["piezo_detected"] is False

def test_feature_extraction_normal_pattern():
    samples = []
    for i in range(80):
        t = i * 50
        # Swallow peak between 1000 and 1750 ms (duration ~750ms)
        if 1000 <= t <= 1750:
            env = 0.70
            piezo = env
            ax = 0.25
        else:
            piezo = 0.01
            ax = 0.02
        samples.append(SensorSample(
            timestamp=t,
            piezo=piezo,
            ax=ax,
            ay=0.05,
            az=0.98,
            accel_magnitude=float((ax**2 + 0.05**2 + 0.98**2)**0.5)
        ))

    features = FeatureService.extract_features(samples)
    assert features["rms_energy"] > 0
    assert features["max_acceleration_g"] > 1.0
    assert "dominant_frequency_hz" in features
    assert "spectral_centroid" in features
