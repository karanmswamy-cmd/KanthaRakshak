from app.schemas.sensor import SensorSample
from app.services.quality_service import QualityService

def test_too_few_samples():
    samples = [
        SensorSample(timestamp=i*50, piezo=0.1, ax=0, ay=0, az=1, accel_magnitude=1.0)
        for i in range(10)
    ]
    quality, noise, motion, diag = QualityService.evaluate_quality(samples)
    assert quality == "POOR"

def test_flatline_sensor():
    # 60 samples with identical 0.0 piezo values
    samples = [
        SensorSample(timestamp=i*50, piezo=0.0, ax=0.01, ay=0.02, az=0.98, accel_magnitude=0.98)
        for i in range(60)
    ]
    quality, noise, motion, diag = QualityService.evaluate_quality(samples)
    assert quality == "POOR"
    assert "PIEZO_FLATLINE" in diag["flags"]

def test_good_quality_samples():
    samples = []
    for i in range(70):
        t = i * 50
        # Normal quiet baseline with clear swallow excursion
        piezo = 0.02 + (0.65 if 1000 <= t <= 1800 else 0.0)
        ax = 0.02 + (0.22 if 1000 <= t <= 1800 else 0.0)
        samples.append(SensorSample(
            timestamp=t,
            piezo=piezo,
            ax=ax,
            ay=0.05,
            az=0.98,
            accel_magnitude=float((ax**2 + 0.05**2 + 0.98**2)**0.5)
        ))
    quality, noise, motion, diag = QualityService.evaluate_quality(samples)
    assert quality in ("GOOD", "FAIR")
    assert noise in ("LOW", "MEDIUM")
