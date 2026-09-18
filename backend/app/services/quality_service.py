import numpy as np
from typing import List, Dict, Any, Tuple
from app.schemas.sensor import SensorSample

class QualityService:
    """
    Evaluates signal integrity across 27mm Piezo and MPU6050 sensors.
    Determines whether the recording is usable for biomechanical analysis.
    """

    MIN_RECORDING_DURATION_MS = 2500.0  # At least 2.5 seconds required
    MIN_SAMPLES_COUNT = 50              # Minimum data points
    MAX_PACKET_LOSS_RATIO = 0.15        # 15% maximum tolerated loss
    ADC_CLIP_THRESHOLD = 0.98           # Near 1.0 or -1.0 saturation
    FLATLINE_VARIANCE_THRESHOLD = 1e-6   # Below this = disconnected/frozen line
    LOW_PIEZO_AMPLITUDE_CUTOFF = 0.05   # Barely any acoustic energy detected
    HIGH_NOISE_STD_DEV = 0.35           # Excessive ambient tremor/noise
    MAX_EXCESSIVE_JERK_G = 3.2          # Wild violent patient movement artifact

    @classmethod
    def evaluate_quality(cls, samples: List[SensorSample]) -> Tuple[str, str, str, Dict[str, Any]]:
        """
        Returns:
            signal_quality: 'GOOD' | 'FAIR' | 'POOR'
            noise_level: 'LOW' | 'MEDIUM' | 'HIGH'
            motion_baseline: 'STABLE' | 'MOVEMENT_DETECTED'
            diagnostics: dict of metric details and flags
        """
        if not samples or len(samples) < cls.MIN_SAMPLES_COUNT:
            return "POOR", "HIGH", "MOVEMENT_DETECTED", {
                "reason": "Recording too short or insufficient sample count",
                "sample_count": len(samples) if samples else 0
            }

        timestamps = np.array([s.timestamp for s in samples])
        duration_ms = timestamps[-1] - timestamps[0] if len(timestamps) > 1 else 0

        if duration_ms < cls.MIN_RECORDING_DURATION_MS:
            return "POOR", "HIGH", "MOVEMENT_DETECTED", {
                "reason": f"Duration ({duration_ms:.0f}ms) below minimum {cls.MIN_RECORDING_DURATION_MS:.0f}ms",
                "duration_ms": duration_ms
            }

        piezo_vals = np.array([s.piezo for s in samples], dtype=float)
        mags = np.array([s.accel_magnitude for s in samples], dtype=float)
        ax = np.array([s.ax for s in samples], dtype=float)
        ay = np.array([s.ay for s in samples], dtype=float)
        az = np.array([s.az for s in samples], dtype=float)

        flags = []

        # 1. Check flatline sensor (disconnected cable or dead ADC)
        piezo_var = float(np.var(piezo_vals))
        mpu_var = float(np.var(mags))
        if piezo_var < cls.FLATLINE_VARIANCE_THRESHOLD:
            flags.append("PIEZO_FLATLINE")
        if mpu_var < cls.FLATLINE_VARIANCE_THRESHOLD:
            flags.append("MPU6050_FLATLINE")

        # 2. Check ADC clipping / saturation
        clipped_ratio = float(np.mean(np.abs(piezo_vals) >= cls.ADC_CLIP_THRESHOLD))
        if clipped_ratio > 0.10:
            flags.append("PIEZO_ADC_CLIPPING")

        # 3. Check very low piezo amplitude (poor acoustic coupling / loose tape)
        max_piezo = float(np.max(np.abs(piezo_vals)))
        if max_piezo < cls.LOW_PIEZO_AMPLITUDE_CUTOFF:
            flags.append("LOW_PIEZO_AMPLITUDE")

        # 4. Check excessive baseline noise
        # Baseline noise estimated from first 30% of samples (before swallow command)
        baseline_slice = piezo_vals[: max(10, int(len(piezo_vals) * 0.3))]
        baseline_std = float(np.std(baseline_slice))
        if baseline_std > cls.HIGH_NOISE_STD_DEV:
            flags.append("EXCESSIVE_BASELINE_NOISE")

        # 5. Check excessive motion / violent movement
        max_accel = float(np.max(mags))
        motion_detected = bool(max_accel > 1.8 or np.std(mags) > 0.3)
        if max_accel > cls.MAX_EXCESSIVE_JERK_G:
            flags.append("EXCESSIVE_MOTION_ARTIFACT")

        # Compute SNR estimate (dB)
        signal_rms = float(np.sqrt(np.mean(piezo_vals**2)))
        noise_rms = max(1e-5, float(np.sqrt(np.mean(baseline_slice**2))))
        snr_db = float(20.0 * np.log10(max(1e-4, signal_rms / noise_rms)))

        # Determine noise level
        if baseline_std < 0.08 and "EXCESSIVE_BASELINE_NOISE" not in flags:
            noise_level = "LOW"
        elif baseline_std < 0.20:
            noise_level = "MEDIUM"
        else:
            noise_level = "HIGH"

        motion_baseline = "MOVEMENT_DETECTED" if motion_detected else "STABLE"

        # Determine overall signal quality
        critical_flags = {"PIEZO_FLATLINE", "MPU6050_FLATLINE", "EXCESSIVE_MOTION_ARTIFACT"}
        if any(f in critical_flags for f in flags) or snr_db < 6.0 or len(flags) >= 2:
            signal_quality = "POOR"
        elif len(flags) == 1 or snr_db < 12.0 or noise_level == "MEDIUM":
            signal_quality = "FAIR"
        else:
            signal_quality = "GOOD"

        diagnostics = {
            "duration_ms": duration_ms,
            "sample_count": len(samples),
            "snr_db": round(snr_db, 1),
            "piezo_var": round(piezo_var, 6),
            "mpu_var": round(mpu_var, 6),
            "baseline_std": round(baseline_std, 4),
            "max_piezo": round(max_piezo, 3),
            "max_accel": round(max_accel, 3),
            "flags": flags
        }

        return signal_quality, noise_level, motion_baseline, diagnostics
