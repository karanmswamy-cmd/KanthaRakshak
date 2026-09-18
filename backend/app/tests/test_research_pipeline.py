import os
import json
import numpy as np
import pytest

from app.pipeline.data_format import TelemetrySession, SessionMetadata, SwallowEvent, NO_VALID_SWALLOW
from app.pipeline.preprocessing import (
    remove_dc_offset,
    normalize_signal,
    bandpass_filter,
    noise_gate,
    smooth_envelope,
    resample_if_needed,
    detect_clipping,
    estimate_noise_floor
)
from app.pipeline.accelerometer import (
    calculate_accel_magnitude,
    remove_gravity_baseline,
    compute_motion_envelope,
    compute_jerk
)
from app.pipeline.event_detection import detect_swallow_event
from app.pipeline.quality_assessment import assess_signal_quality
from app.pipeline.feature_extractor import extract_all_features, compute_mfcc_coefficients
from app.pipeline.inference import predict_session

# Helper to generate test telemetry session
def make_test_session(duration_ms=4000.0, fs=50.0, add_swallow=True):
    n = int(duration_ms / (1000.0 / fs))
    t = np.arange(n) * (1000.0 / fs)
    piezo = np.random.normal(0, 0.01, n)
    ax = np.random.normal(0, 0.01, n)
    ay = np.zeros(n)
    az = np.random.normal(0.98, 0.01, n)

    if add_swallow:
        onset = int(n * 0.4)
        dur = int(n * 0.2) # ~800ms
        piezo[onset:onset+dur] += 0.60 * np.sin(np.pi * np.linspace(0, 1, dur))**2
        ax[onset+2:onset+dur+2] += 0.40 * np.sin(np.pi * np.linspace(0, 1, dur))
        az[onset+2:onset+dur+2] += 0.20 * np.sin(np.pi * np.linspace(0, 1, dur))

    meta = SessionMetadata(
        patient_code="PAT-TEST-001",
        age=68,
        sample_rate=fs,
        test_type="standard_5ml_water"
    )
    return TelemetrySession(timestamp_ms=t, piezo=piezo, ax=ax, ay=ay, az=az, metadata=meta)

# -------------------------------------------------------------
# Preprocessing Unit Tests
# -------------------------------------------------------------
def test_remove_dc_offset():
    sig = np.array([2.0, 2.5, 2.1, 2.4])
    clean = remove_dc_offset(sig, method="mean")
    assert np.isclose(np.mean(clean), 0.0, atol=1e-7)

def test_normalize_signal():
    sig = np.array([-2.0, 0.5, 1.5, -0.5])
    norm_peak = normalize_signal(sig, method="peak")
    assert np.isclose(np.max(np.abs(norm_peak)), 1.0, atol=1e-7)

    norm_zscore = normalize_signal(sig, method="zscore")
    assert np.isclose(np.mean(norm_zscore), 0.0, atol=1e-5)
    assert np.isclose(np.std(norm_zscore), 1.0, atol=1e-5)

def test_bandpass_filter():
    fs = 50.0
    t = np.linspace(0, 2.0, int(2.0 * fs))
    # 2 Hz slow drift + 12 Hz swallow frequency
    sig = np.sin(2 * np.pi * 0.5 * t) + np.sin(2 * np.pi * 12.0 * t)
    filtered = bandpass_filter(sig, fs=fs, lowcut=2.0, highcut=20.0)
    assert len(filtered) == len(sig)
    assert not np.isnan(filtered).any()

def test_noise_gate():
    sig = np.array([0.01, -0.02, 0.45, -0.60, 0.015])
    gated = noise_gate(sig, threshold=0.03)
    assert gated[0] == 0.0
    assert gated[1] == 0.0
    assert gated[2] == 0.45
    assert gated[3] == -0.60
    assert gated[4] == 0.0

def test_smooth_envelope():
    sig = np.sin(np.linspace(0, 10, 100))
    env = smooth_envelope(sig, window_len=7)
    assert len(env) == len(sig)
    assert (env >= 0.0).all()

def test_resample_if_needed():
    t_orig = np.array([0.0, 40.0, 80.0, 120.0]) # 25 Hz
    sig_orig = np.array([1.0, 2.0, 3.0, 4.0])
    sig_resamp, t_resamp = resample_if_needed(sig_orig, t_orig, target_fs=50.0)
    assert len(t_resamp) > len(t_orig)
    assert not np.isnan(sig_resamp).any()

def test_detect_clipping():
    clean_sig = np.array([0.1, -0.2, 0.5, -0.4])
    has_clip, ratio = detect_clipping(clean_sig, threshold=0.98)
    assert not has_clip
    assert ratio == 0.0

    clipped_sig = np.array([0.99, -0.99, 0.99, -0.99, 0.1, 0.2])
    has_clip2, ratio2 = detect_clipping(clipped_sig, threshold=0.98)
    assert has_clip2
    assert ratio2 > 0.5

def test_estimate_noise_floor():
    noise = np.random.normal(0, 0.02, 100)
    rms, std = estimate_noise_floor(noise, baseline_ratio=0.25)
    assert rms > 0.0
    assert std > 0.0

# -------------------------------------------------------------
# Kinematic Accelerometer Unit Tests
# -------------------------------------------------------------
def test_calculate_accel_magnitude():
    ax = np.array([1.0, 0.0, 0.0])
    ay = np.array([0.0, 2.0, 0.0])
    az = np.array([0.0, 0.0, 2.0])
    mag = calculate_accel_magnitude(ax, ay, az)
    expected = np.array([1.0, 2.0, 2.0])
    assert np.allclose(mag, expected)

def test_remove_gravity_baseline():
    mag = np.ones(100) * 0.98 # static gravity
    mag[40:60] += 0.25 # excursion
    dynamic = remove_gravity_baseline(mag, window_size=25)
    assert len(dynamic) == len(mag)
    assert np.isclose(np.mean(dynamic[:30]), 0.0, atol=0.05)

def test_compute_jerk():
    t = np.linspace(0, 1.0, 50)
    mag = 2.0 * t # constant slope of 2.0
    jerk = compute_jerk(mag, dt=0.02)
    assert np.allclose(jerk[2:-2], 2.0, atol=0.1)

# -------------------------------------------------------------
# Swallow Event Detection Unit Tests
# -------------------------------------------------------------
def test_swallow_event_detection_coincident():
    session = make_test_session(duration_ms=4000.0, fs=50.0, add_swallow=True)
    event = detect_swallow_event(session)
    assert isinstance(event, SwallowEvent)
    assert event.event_duration >= 400.0
    assert event.event_duration <= 1600.0
    assert event.detection_confidence >= 0.5

def test_swallow_event_detection_empty_signal():
    session = make_test_session(duration_ms=4000.0, fs=50.0, add_swallow=False)
    event = detect_swallow_event(session)
    assert event == NO_VALID_SWALLOW

# -------------------------------------------------------------
# Signal Quality Assessment Unit Tests
# -------------------------------------------------------------
def test_signal_quality_good():
    session = make_test_session(duration_ms=4000.0, fs=50.0, add_swallow=True)
    category, score, diag = assess_signal_quality(session)
    assert category == "GOOD"
    assert score >= 75.0

def test_signal_quality_poor_flatline():
    t = np.arange(100) * 20.0
    zero_piezo = np.zeros(100)
    session = TelemetrySession(timestamp_ms=t, piezo=zero_piezo, ax=zero_piezo, ay=zero_piezo, az=np.ones(100))
    category, score, diag = assess_signal_quality(session)
    assert category == "POOR"
    assert score < 50.0
    assert "PIEZO_FLATLINE" in diag["flags"]

# -------------------------------------------------------------
# Feature Extraction Unit Tests
# -------------------------------------------------------------
def test_extract_all_features():
    session = make_test_session(duration_ms=4000.0, fs=50.0, add_swallow=True)
    event = detect_swallow_event(session)
    features = extract_all_features(session, event if isinstance(event, SwallowEvent) else None)

    required_keys = [
        "swallow_duration_ms", "piezo_rms", "piezo_peak_amplitude", "dominant_frequency_hz",
        "spectral_centroid_hz", "spectral_peak_count", "max_acceleration_g", "jerk_rms_g_per_s",
        "piezo_motion_peak_delay_ms", "cross_correlation_coeff", "sensor_agreement_score",
        "mfcc_1", "mfcc_13"
    ]
    for k in required_keys:
        assert k in features, f"Missing feature: {k}"

def test_mfcc_coefficients():
    sig = np.random.normal(0, 0.5, 100)
    mfccs = compute_mfcc_coefficients(sig, fs=50.0, n_mfcc=13)
    assert len(mfccs) == 13
    assert not np.isnan(mfccs).any()

# -------------------------------------------------------------
# Inference & Explainability Unit Tests
# -------------------------------------------------------------
def test_predict_session_production():
    session = make_test_session(duration_ms=4000.0, fs=50.0, add_swallow=True)
    result = predict_session(session, demo_mode=False)

    assert result["signal_quality"] in ("GOOD", "FAIR", "POOR")
    assert "swallow_detected" in result
    assert "ml_prediction" in result
    assert "probability" in result
    assert result["uses_age"] is False
    assert len(result["explainability"]) > 0

def test_predict_session_demo_mode():
    session = make_test_session(duration_ms=4000.0, fs=50.0, add_swallow=True)
    result = predict_session(session, demo_mode=True)

    assert result["demo_mode"] is True
    assert result["notice"] == "Demonstration analysis – not trained clinical model"
    assert result["model_version"] == "demo-heuristic"
