"""
Signal Quality Assessment Module for JeevaSwara / KanthaRakshak.

Evaluates acoustic microphone and inertial sensor integrity.
Computes comprehensive 0-100 internal score and categorizes as GOOD / FAIR / POOR.
"""

import numpy as np
from typing import Dict, Any, Tuple, Literal
from app.pipeline.data_format import TelemetrySession
from app.pipeline.accelerometer import calculate_accel_magnitude, compute_jerk
from app.pipeline.preprocessing import detect_clipping

def assess_signal_quality(session: TelemetrySession) -> Tuple[str, float, Dict[str, Any]]:
    """
    Evaluates signal integrity across both modalities.

    Returns:
        quality_category: 'GOOD' | 'FAIR' | 'POOR'
        quality_score: float from 0.0 to 100.0
        diagnostics: detailed breakdown of penalties and flags
    """
    penalties = 0.0
    flags = []
    n = session.sample_count

    # 1. Packet Count & Recording Duration Checks
    if n < 30:
        return "POOR", 0.0, {
            "reason": f"Insufficient sample count ({n} samples, minimum 30 required).",
            "flags": ["INSUFFICIENT_SAMPLES"],
            "score": 0.0
        }

    duration_ms = session.duration_ms
    if duration_ms < 1500.0:
        return "POOR", 10.0, {
            "reason": f"Recording duration ({duration_ms:.0f} ms) too brief for swallow evaluation.",
            "flags": ["SHORT_DURATION"],
            "score": 10.0
        }

    # 2. Packet Gap / Timestamp Irregularity Check
    t = session.timestamp_ms
    dt_arr = np.diff(t)
    expected_dt = 1000.0 / session.metadata.sample_rate # e.g. 20ms for 50Hz
    gap_count = int(np.sum(dt_arr > expected_dt * 2.5))
    if gap_count > 0:
        gap_penalty = min(30.0, gap_count * 10.0)
        penalties += gap_penalty
        flags.append(f"PACKET_GAPS_{gap_count}")

    # 3. Flatline Detection (Dead sensor or disconnected ADC line)
    piezo = session.piezo
    piezo_var = float(np.var(piezo))
    if piezo_var < 1e-6:
        penalties += 60.0
        flags.append("PIEZO_FLATLINE")

    accel_mag = calculate_accel_magnitude(session.ax, session.ay, session.az)
    accel_var = float(np.var(accel_mag))
    if accel_var < 1e-6:
        penalties += 60.0
        flags.append("MPU6050_FLATLINE")

    # 4. Clipping & Saturation Check
    has_clip, clip_ratio = detect_clipping(piezo, threshold=0.98)
    if has_clip:
        penalties += min(35.0, clip_ratio * 150.0)
        flags.append(f"PIEZO_CLIPPING_{int(clip_ratio*100)}PCT")

    # 5. Low Amplitude Check (Loose microphone contact)
    max_piezo_abs = float(np.max(np.abs(piezo)))
    if max_piezo_abs < 0.05 and "PIEZO_FLATLINE" not in flags:
        penalties += 30.0
        flags.append("LOW_ACOUSTIC_AMPLITUDE")

    # 6. Baseline Noise Floor & SNR Calculation
    baseline_n = max(5, int(n * 0.25))
    baseline_piezo = piezo[:baseline_n]
    noise_rms = max(1e-5, float(np.sqrt(np.mean(baseline_piezo ** 2))))
    signal_rms = float(np.sqrt(np.mean(piezo ** 2)))
    snr_db = float(20.0 * np.log10(max(1e-3, signal_rms / noise_rms)))

    if snr_db < 4.0:
        penalties += 35.0
        flags.append("EXCESSIVE_AMBIENT_NOISE")
    elif snr_db < 10.0:
        penalties += 15.0
        flags.append("MODERATE_NOISE")

    # 7. Excessive Violent Movement / Patient Cough Artifact
    dt = float(np.mean(dt_arr)) / 1000.0 if len(dt_arr) > 0 else 0.02
    jerk = compute_jerk(accel_mag, dt=dt)
    max_jerk = float(np.max(np.abs(jerk)))
    max_accel = float(np.max(accel_mag))

    if max_accel > 3.2 or max_jerk > 40.0:
        penalties += 40.0
        flags.append("VIOLENT_MOTION_ARTIFACT")
    elif max_accel > 2.0 or max_jerk > 20.0:
        penalties += 15.0
        flags.append("MODERATE_MOTION_ARTIFACT")

    # 8. Sensor Disagreement (Microphone contact loss or IMU decoupling)
    # Dynamic acceleration amplitude (relative to median baseline)
    dynamic_accel_span = float(np.max(accel_mag) - np.min(accel_mag))
    sensor_disagreement = False
    if max_piezo_abs > 0.40 and dynamic_accel_span < 0.025 and "MPU6050_FLATLINE" not in flags:
        # High acoustic amplitude but completely silent motion: IMU detachment
        penalties += 25.0
        flags.append("SENSOR_DISAGREEMENT_NO_MOTION")
        sensor_disagreement = True
    elif dynamic_accel_span > 0.45 and max_piezo_abs < 0.035 and "PIEZO_FLATLINE" not in flags:
        # High motion excursion but virtually zero acoustic energy: mic detachment
        penalties += 25.0
        flags.append("SENSOR_DISAGREEMENT_NO_ACOUSTICS")
        sensor_disagreement = True

    # Final Score Synthesis
    raw_score = max(0.0, 100.0 - penalties)
    quality_score = float(round(raw_score, 1))

    if quality_score >= 75.0 and not any(f in flags for f in ["PIEZO_FLATLINE", "MPU6050_FLATLINE", "VIOLENT_MOTION_ARTIFACT"]):
        quality_category: Literal["GOOD", "FAIR", "POOR"] = "GOOD"
    elif quality_score >= 50.0 and "PIEZO_FLATLINE" not in flags and "MPU6050_FLATLINE" not in flags:
        quality_category = "FAIR"
    else:
        quality_category = "POOR"

    diagnostics = {
        "score": quality_score,
        "quality_category": quality_category,
        "snr_db": round(snr_db, 1),
        "piezo_variance": round(piezo_var, 6),
        "accel_variance": round(accel_var, 6),
        "clipping_ratio": round(clip_ratio, 3),
        "max_piezo_amplitude": round(max_piezo_abs, 3),
        "max_acceleration_g": round(max_accel, 3),
        "max_jerk_g_per_s": round(max_jerk, 1),
        "gap_count": gap_count,
        "sensor_disagreement": sensor_disagreement,
        "flags": flags
    }

    return quality_category, quality_score, diagnostics

