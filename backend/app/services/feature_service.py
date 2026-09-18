import numpy as np
from typing import Dict, Any, List
from app.schemas.sensor import SensorSample
from app.services.signal_service import SignalService

class FeatureService:
    """
    Extracts acoustic, spectral, kinematic and cross-sensor temporal features
    from dual-sensor swallowing telemetry using robust pure NumPy operations.
    """

    @classmethod
    def extract_features(
        cls,
        samples: List[SensorSample],
        sample_rate: float = 50.0
    ) -> Dict[str, Any]:
        """
        Extracts comprehensive biomechanical features dictionary.
        """
        if not samples:
            return cls._get_empty_features()

        timestamps = np.array([s.timestamp for s in samples], dtype=float)
        piezo_raw = np.array([s.piezo for s in samples], dtype=float)
        ax = np.array([s.ax for s in samples], dtype=float)
        ay = np.array([s.ay for s in samples], dtype=float)
        az = np.array([s.az for s in samples], dtype=float)
        mags = np.array([s.accel_magnitude for s in samples], dtype=float)

        # 1. DSP filtering on Piezo acoustic channel
        piezo_detrend = SignalService.remove_dc_offset(piezo_raw)
        piezo_filtered = SignalService.apply_bandpass_filter(piezo_detrend, sample_rate=sample_rate)
        piezo_envelope = SignalService.compute_energy_envelope(piezo_filtered, sample_rate=sample_rate)

        # 2. Swallow window detection on Piezo
        detected_piezo, p_start, p_end, p_duration = SignalService.detect_swallow_window(
            piezo_envelope, timestamps
        )

        # 3. Kinematic motion envelope (detrended magnitude)
        motion_detrend = SignalService.remove_dc_offset(mags)
        motion_envelope = SignalService.compute_energy_envelope(motion_detrend, sample_rate=sample_rate)
        detected_motion, m_start, m_end, m_duration = SignalService.detect_swallow_window(
            motion_envelope, timestamps, threshold_ratio=0.30
        )

        # 4. Temporal & Energy Features
        rms_energy = float(np.sqrt(np.mean(piezo_filtered**2)))
        peak_amplitude = float(np.max(np.abs(piezo_filtered)))
        zero_crossings = float(np.sum(np.diff(np.signbit(piezo_filtered)).astype(bool)) / max(1, len(piezo_filtered)))

        # 5. Spectral Features via FFT
        n = len(piezo_filtered)
        if n > 8:
            freqs = np.fft.rfftfreq(n, d=1.0 / sample_rate)
            fft_magnitude = np.abs(np.fft.rfft(piezo_filtered))

            mag_sum = float(np.sum(fft_magnitude))
            if mag_sum > 1e-6:
                spectral_centroid = float(np.sum(freqs * fft_magnitude) / mag_sum)
                spectral_bandwidth = float(np.sqrt(np.sum(((freqs - spectral_centroid) ** 2) * fft_magnitude) / mag_sum))
            else:
                spectral_centroid = 0.0
                spectral_bandwidth = 0.0

            dominant_idx = int(np.argmax(fft_magnitude[1:])) + 1 if len(fft_magnitude) > 1 else 0
            dominant_frequency = float(freqs[dominant_idx]) if dominant_idx < len(freqs) else 0.0

            # Pure NumPy peak count
            thresh = float(np.max(fft_magnitude)) * 0.25
            if len(fft_magnitude) > 2:
                mid = fft_magnitude[1:-1]
                left = fft_magnitude[:-2]
                right = fft_magnitude[2:]
                peak_mask = (mid > left) & (mid > right) & (mid >= thresh)
                spectral_peak_count = int(np.sum(peak_mask))
            else:
                spectral_peak_count = 0
        else:
            spectral_centroid = 0.0
            spectral_bandwidth = 0.0
            dominant_frequency = 0.0
            spectral_peak_count = 0

        # 6. Accelerometer Kinematics
        max_acceleration = float(np.max(mags))
        mean_accel = float(np.mean(mags))
        accel_std = float(np.std(mags))

        # 7. Cross-Sensor Agreement & Coupling
        if len(piezo_envelope) > 5 and len(motion_envelope) > 5:
            norm_p = (piezo_envelope - np.mean(piezo_envelope)) / (np.std(piezo_envelope) + 1e-6)
            norm_m = (motion_envelope - np.mean(motion_envelope)) / (np.std(motion_envelope) + 1e-6)
            cross_corr = float(np.correlate(norm_p, norm_m, mode='valid')[0] / len(piezo_envelope))
        else:
            cross_corr = 0.0

        peak_piezo_idx = int(np.argmax(piezo_envelope))
        peak_motion_idx = int(np.argmax(motion_envelope))
        time_piezo_peak = float(timestamps[peak_piezo_idx]) if peak_piezo_idx < len(timestamps) else 0.0
        time_motion_peak = float(timestamps[peak_motion_idx]) if peak_motion_idx < len(timestamps) else 0.0
        piezo_motion_delay_ms = abs(time_piezo_peak - time_motion_peak)

        return {
            "piezo_detected": detected_piezo,
            "motion_detected": detected_motion,
            "swallow_duration_ms": round(p_duration if detected_piezo else 0.0, 1),
            "movement_duration_ms": round(m_duration if detected_motion else 0.0, 1),
            "rms_energy": round(rms_energy, 4),
            "peak_amplitude": round(peak_amplitude, 4),
            "zero_crossing_rate": round(zero_crossings, 4),
            "dominant_frequency_hz": round(dominant_frequency, 1),
            "spectral_centroid": round(spectral_centroid, 1),
            "spectral_bandwidth": round(spectral_bandwidth, 1),
            "spectral_peak_count": spectral_peak_count,
            "max_acceleration_g": round(max_acceleration, 3),
            "mean_acceleration_g": round(mean_accel, 3),
            "acceleration_std": round(accel_std, 3),
            "piezo_motion_delay_ms": round(piezo_motion_delay_ms, 1),
            "cross_correlation_coeff": round(cross_corr, 3),
        }

    @classmethod
    def _get_empty_features(cls) -> Dict[str, Any]:
        return {
            "piezo_detected": False,
            "motion_detected": False,
            "swallow_duration_ms": 0.0,
            "movement_duration_ms": 0.0,
            "rms_energy": 0.0,
            "peak_amplitude": 0.0,
            "zero_crossing_rate": 0.0,
            "dominant_frequency_hz": 0.0,
            "spectral_centroid": 0.0,
            "spectral_bandwidth": 0.0,
            "spectral_peak_count": 0,
            "max_acceleration_g": 1.0,
            "mean_acceleration_g": 1.0,
            "acceleration_std": 0.0,
            "piezo_motion_delay_ms": 0.0,
            "cross_correlation_coeff": 0.0,
        }
