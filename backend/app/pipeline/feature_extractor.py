"""
Comprehensive Feature Extraction Module for JeevaSwara / KanthaRakshak.

Extracts:
1. Piezo Acoustic Features (temporal, spectral moments, MFCCs)
2. MPU6050 Motion Features (kinematics, jerk, peak counts)
3. Multi-Sensor Fusion Features (peak delays, cross-correlation, overlap, sensor agreement)
"""

import numpy as np
from typing import Dict, Any, Optional
from app.pipeline.data_format import TelemetrySession, SwallowEvent, NO_VALID_SWALLOW
from app.pipeline.accelerometer import calculate_accel_magnitude, remove_gravity_baseline, compute_jerk
from app.pipeline.preprocessing import remove_dc_offset, smooth_envelope

def hz_to_mel(hz: np.ndarray) -> np.ndarray:
    return 2595.0 * np.log10(1.0 + hz / 700.0)

def mel_to_hz(mel: np.ndarray) -> np.ndarray:
    return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)

def compute_mfcc_coefficients(
    signal: np.ndarray,
    fs: float = 50.0,
    n_mfcc: int = 13,
    n_mels: int = 20,
    n_fft: int = 64
) -> np.ndarray:
    """
    Computes Mel-Frequency Cepstral Coefficients (MFCCs) using pure NumPy.
    Ensures zero external C-library dependency.
    """
    x = np.asarray(signal, dtype=float)
    if len(x) < 4:
        return np.zeros(n_mfcc, dtype=float)

    # Pad or truncate to n_fft
    if len(x) < n_fft:
        x_padded = np.pad(x, (0, n_fft - len(x)), mode='constant')
    else:
        x_padded = x[:n_fft]

    # Apply Hanning window
    window = 0.5 - 0.5 * np.cos(2.0 * np.pi * np.arange(n_fft) / (n_fft - 1))
    windowed = x_padded * window

    # Power spectrum via rfft
    spectrum = np.fft.rfft(windowed, n=n_fft)
    power_spec = (np.abs(spectrum) ** 2) / n_fft
    n_freq_bins = len(power_spec)

    # Create Mel filterbank
    f_min = 0.0
    f_max = fs / 2.0
    mel_min = hz_to_mel(np.array([f_min]))[0]
    mel_max = hz_to_mel(np.array([f_max]))[0]
    mel_points = np.linspace(mel_min, mel_max, n_mels + 2)
    hz_points = mel_to_hz(mel_points)

    bin_points = np.floor((n_fft + 1) * hz_points / fs).astype(int)
    bin_points = np.clip(bin_points, 0, n_freq_bins - 1)

    fbank = np.zeros((n_mels, n_freq_bins))
    for m in range(1, n_mels + 1):
        f_m_minus = bin_points[m - 1]
        f_m = bin_points[m]
        f_m_plus = bin_points[m + 1]

        for k in range(f_m_minus, f_m):
            if f_m > f_m_minus:
                fbank[m - 1, k] = (k - f_m_minus) / (f_m - f_m_minus)
        for k in range(f_m, f_m_plus):
            if f_m_plus > f_m:
                fbank[m - 1, k] = (f_m_plus - k) / (f_m_plus - f_m)

    # Filter energies & log
    filter_energies = np.dot(fbank, power_spec)
    filter_energies = np.maximum(1e-10, filter_energies)
    log_energies = np.log(filter_energies)

    # Discrete Cosine Transform (DCT-II)
    mfccs = np.zeros(n_mfcc, dtype=float)
    K = n_mels
    for m in range(n_mfcc):
        mfccs[m] = np.sum(log_energies * np.cos(np.pi * m * (np.arange(K) + 0.5) / K))

    return mfccs

def extract_all_features(
    session: TelemetrySession,
    event: Optional[SwallowEvent] = None
) -> Dict[str, Any]:
    """
    Extracts complete feature set across piezo acoustics, motion kinematics,
    and cross-sensor fusion.
    """
    t = session.timestamp_ms
    n = session.sample_count
    fs = session.metadata.sample_rate

    # If event provided, isolate swallow region; otherwise analyze entire active portion
    if event and isinstance(event, SwallowEvent):
        mask = (t >= event.event_start) & (t <= event.event_end)
        if np.sum(mask) < 4:
            mask = np.ones(n, dtype=bool)
    else:
        mask = np.ones(n, dtype=bool)

    t_sub = t[mask]
    piezo_raw = session.piezo[mask]
    ax_sub = session.ax[mask]
    ay_sub = session.ay[mask]
    az_sub = session.az[mask]

    # Preprocess sub-signals
    piezo = remove_dc_offset(piezo_raw)
    piezo_env = smooth_envelope(piezo, window_len=5)

    accel_mag = calculate_accel_magnitude(ax_sub, ay_sub, az_sub)
    dynamic_motion = remove_gravity_baseline(accel_mag)
    motion_env = smooth_envelope(dynamic_motion, window_len=5)

    # -------------------------------------------------------------
    # 1. PIEZO ACOUSTIC FEATURES
    # -------------------------------------------------------------
    duration_ms = float(event.event_duration if event and isinstance(event, SwallowEvent) else (t_sub[-1] - t_sub[0] if len(t_sub) > 1 else 0.0))
    piezo_rms = float(np.sqrt(np.mean(piezo ** 2))) if len(piezo) > 0 else 0.0
    piezo_peak_amp = float(np.max(np.abs(piezo))) if len(piezo) > 0 else 0.0
    piezo_energy = float(np.sum(piezo ** 2)) if len(piezo) > 0 else 0.0

    # Zero Crossing Rate
    if len(piezo) > 1:
        zcr = float(np.mean(np.abs(np.diff(np.signbit(piezo).astype(int)))))
    else:
        zcr = 0.0

    # Spectral Analysis via FFT
    if len(piezo) >= 8:
        fft_vals = np.fft.rfft(piezo)
        freqs = np.fft.rfftfreq(len(piezo), d=1.0 / fs)
        magnitudes = np.abs(fft_vals)
        power = magnitudes ** 2
        sum_power = np.sum(power)

        if sum_power > 1e-9:
            dom_idx = int(np.argmax(magnitudes))
            dominant_freq = float(freqs[dom_idx])
            # Spectral centroid
            spectral_centroid = float(np.sum(freqs * power) / sum_power)
            # Spectral bandwidth
            spectral_bandwidth = float(np.sqrt(np.sum(((freqs - spectral_centroid) ** 2) * power) / sum_power))
            # Spectral rolloff (85% energy)
            cum_power = np.cumsum(power)
            rolloff_idx = int(np.searchsorted(cum_power, 0.85 * sum_power))
            spectral_rolloff = float(freqs[min(rolloff_idx, len(freqs) - 1)])
        else:
            dominant_freq = 0.0
            spectral_centroid = 0.0
            spectral_bandwidth = 0.0
            spectral_rolloff = 0.0

        # Spectral peak count
        threshold_peak = 0.25 * np.max(magnitudes) if len(magnitudes) > 0 else 0.0
        spectral_peaks = int(np.sum((magnitudes[1:-1] > magnitudes[:-2]) &
                                    (magnitudes[1:-1] > magnitudes[2:]) &
                                    (magnitudes[1:-1] > threshold_peak)))
    else:
        dominant_freq = 0.0
        spectral_centroid = 0.0
        spectral_bandwidth = 0.0
        spectral_rolloff = 0.0
        spectral_peaks = 0

    # 13 MFCC Coefficients
    mfccs = compute_mfcc_coefficients(piezo, fs=fs, n_mfcc=13)

    # -------------------------------------------------------------
    # 2. MOTION INERTIAL FEATURES
    # -------------------------------------------------------------
    max_accel = float(np.max(accel_mag)) if len(accel_mag) > 0 else 1.0
    mean_accel = float(np.mean(accel_mag)) if len(accel_mag) > 0 else 1.0
    accel_variance = float(np.var(accel_mag)) if len(accel_mag) > 0 else 0.0

    # Motion duration (above 15% dynamic threshold)
    thresh_motion = 0.05
    active_motion_samples = np.sum(np.abs(dynamic_motion) >= thresh_motion)
    dt_ms = 1000.0 / fs
    motion_duration_ms = float(active_motion_samples * dt_ms)

    # Jerk
    dt_sec = 1.0 / fs
    jerk_vals = compute_jerk(accel_mag, dt=dt_sec)
    jerk_rms = float(np.sqrt(np.mean(jerk_vals ** 2))) if len(jerk_vals) > 0 else 0.0
    jerk_peak = float(np.max(np.abs(jerk_vals))) if len(jerk_vals) > 0 else 0.0

    # Movement peak count (peaks in motion envelope)
    if len(motion_env) > 3:
        mov_thresh = 0.04
        motion_peaks = int(np.sum((motion_env[1:-1] > motion_env[:-2]) &
                                  (motion_env[1:-1] > motion_env[2:]) &
                                  (motion_env[1:-1] > mov_thresh)))
    else:
        motion_peaks = 0

    # -------------------------------------------------------------
    # 3. FUSION FEATURES
    # -------------------------------------------------------------
    if len(piezo_env) > 0 and len(motion_env) > 0:
        p_peak_idx = int(np.argmax(piezo_env))
        m_peak_idx = int(np.argmax(motion_env))
        p_peak_t = t_sub[p_peak_idx] if len(t_sub) > p_peak_idx else 0.0
        m_peak_t = t_sub[m_peak_idx] if len(t_sub) > m_peak_idx else 0.0
        time_diff_ms = float(abs(p_peak_t - m_peak_t))

        # Cross correlation
        p_norm = (piezo_env - np.mean(piezo_env)) / (np.std(piezo_env) + 1e-7)
        m_norm = (motion_env - np.mean(motion_env)) / (np.std(motion_env) + 1e-7)
        cross_corr = float(np.clip(np.mean(p_norm * m_norm), -1.0, 1.0))

        # Overlap ratio
        p_active = piezo_env > 0.05
        m_active = motion_env > 0.03
        intersection = np.sum(p_active & m_active)
        union = np.sum(p_active | m_active)
        overlap_ratio = float(intersection / union) if union > 0 else 0.0
    else:
        time_diff_ms = 999.0
        cross_corr = 0.0
        overlap_ratio = 0.0

    # Sensor Agreement Score (0 to 100)
    delay_penalty = min(50.0, (time_diff_ms / 250.0) * 50.0)
    corr_bonus = max(0.0, cross_corr * 30.0)
    overlap_bonus = overlap_ratio * 20.0
    agreement_score = float(np.clip(50.0 - delay_penalty + corr_bonus + overlap_bonus, 0.0, 100.0))

    if agreement_score >= 70.0 and time_diff_ms <= 120.0:
        agreement_category = "HIGH"
    elif agreement_score >= 45.0 and time_diff_ms <= 250.0:
        agreement_category = "MEDIUM"
    else:
        agreement_category = "LOW"

    features: Dict[str, Any] = {
        # Temporal / Piezo
        "swallow_duration_ms": round(duration_ms, 1),
        "piezo_rms": round(piezo_rms, 5),
        "piezo_peak_amplitude": round(piezo_peak_amp, 4),
        "piezo_energy": round(piezo_energy, 4),
        "zero_crossing_rate": round(zcr, 4),

        # Spectral
        "dominant_frequency_hz": round(dominant_freq, 2),
        "spectral_centroid_hz": round(spectral_centroid, 2),
        "spectral_bandwidth_hz": round(spectral_bandwidth, 2),
        "spectral_rolloff_hz": round(spectral_rolloff, 2),
        "spectral_peak_count": int(spectral_peaks),

        # Kinematic Motion
        "max_acceleration_g": round(max_accel, 3),
        "mean_acceleration_g": round(mean_accel, 3),
        "acceleration_variance": round(accel_variance, 5),
        "motion_duration_ms": round(motion_duration_ms, 1),
        "jerk_rms_g_per_s": round(jerk_rms, 2),
        "jerk_peak_g_per_s": round(jerk_peak, 2),
        "movement_peak_count": int(motion_peaks),

        # Fusion
        "piezo_motion_peak_delay_ms": round(time_diff_ms, 1),
        "cross_correlation_coeff": round(cross_corr, 3),
        "overlap_ratio": round(overlap_ratio, 3),
        "sensor_agreement_score": round(agreement_score, 1),
        "sensor_agreement": agreement_category
    }

    # Add MFCCs
    for idx, c in enumerate(mfccs, 1):
        features[f"mfcc_{idx}"] = round(float(c), 4)

    return features
