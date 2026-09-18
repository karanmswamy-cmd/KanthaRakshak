"""
Swallow Event Detection Module for JeevaSwara / KanthaRakshak.

Dual-sensor coincidence detection algorithm fusing acoustic piezo energy
and cervical accelerometer motion to isolate deglutition windows.
"""

import numpy as np
from typing import Union, Tuple, Optional
from app.pipeline.data_format import TelemetrySession, SwallowEvent, NO_VALID_SWALLOW
from app.pipeline.preprocessing import smooth_envelope, remove_dc_offset
from app.pipeline.accelerometer import calculate_accel_magnitude, remove_gravity_baseline, compute_motion_envelope

def _find_active_intervals(envelope: np.ndarray, threshold: float, min_len: int = 3) -> list[Tuple[int, int]]:
    """Finds contiguous index segments where envelope exceeds threshold."""
    is_active = envelope >= threshold
    diff = np.diff(np.pad(is_active.astype(int), (1, 1), mode='constant'))
    starts = np.where(diff == 1)[0]
    ends = np.where(diff == -1)[0]
    intervals = []
    for s, e in zip(starts, ends):
        if (e - s) >= min_len:
            intervals.append((int(s), int(e)))
    return intervals

def detect_swallow_event(
    session: TelemetrySession,
    piezo_threshold_std_factor: float = 2.0,
    motion_threshold_std_factor: float = 1.8,
    max_coincidence_lag_ms: float = 250.0,
    min_event_duration_ms: float = 200.0,
    max_event_duration_ms: float = 3500.0
) -> Union[SwallowEvent, str]:
    """
    Identifies candidate deglutition burst from temporal coincidence
    between 27mm throat acoustic microphone and MPU6050 hyolaryngeal acceleration.

    Returns:
        SwallowEvent object if a valid coincident swallow is isolated.
        NO_VALID_SWALLOW ('NO_VALID_SWALLOW') if no physiological event meets criteria.
    """
    n = session.sample_count
    if n < 20 or session.duration_ms < 1000.0:
        return NO_VALID_SWALLOW

    t = session.timestamp_ms
    dt = float(np.mean(np.diff(t))) if len(t) > 1 else 20.0

    # 1. Condition Acoustic Signal
    piezo_clean = remove_dc_offset(session.piezo)
    piezo_env = smooth_envelope(piezo_clean, window_len=7)

    # 2. Condition Kinematic Motion Signal
    accel_mag = calculate_accel_magnitude(session.ax, session.ay, session.az)
    dynamic_motion = remove_gravity_baseline(accel_mag)
    motion_env = compute_motion_envelope(dynamic_motion, window_size=7)

    # 3. Dynamic Thresholding based on quiescent baseline (first 25%)
    baseline_n = max(5, int(n * 0.25))
    piezo_baseline_std = float(np.std(piezo_env[:baseline_n]))
    piezo_baseline_mean = float(np.mean(piezo_env[:baseline_n]))
    piezo_thresh = piezo_baseline_mean + max(0.04, piezo_threshold_std_factor * piezo_baseline_std)

    motion_baseline_std = float(np.std(motion_env[:baseline_n]))
    motion_baseline_mean = float(np.mean(motion_env[:baseline_n]))
    motion_thresh = motion_baseline_mean + max(0.03, motion_threshold_std_factor * motion_baseline_std)

    # 4. Extract Candidate Intervals
    piezo_intervals = _find_active_intervals(piezo_env, piezo_thresh, min_len=4)
    motion_intervals = _find_active_intervals(motion_env, motion_thresh, min_len=4)

    if not piezo_intervals:
        return NO_VALID_SWALLOW

    # 5. Coincidence Gating: Find best matching coincident acoustic & motion interval
    best_candidate: Optional[SwallowEvent] = None
    best_score = -1.0

    for p_start, p_end in piezo_intervals:
        p_t_start = t[p_start]
        p_t_end = t[min(p_end, n - 1)]
        p_dur = p_t_end - p_t_start
        p_peak_idx = p_start + int(np.argmax(piezo_env[p_start:p_end]))
        p_peak_t = t[p_peak_idx]

        if p_dur < min_event_duration_ms or p_dur > max_event_duration_ms:
            continue

        matched_motion = False
        m_peak_t = None
        lag_ms = 9999.0

        for m_start, m_end in motion_intervals:
            m_t_start = t[m_start]
            m_t_end = t[min(m_end, n - 1)]
            m_peak_idx = m_start + int(np.argmax(motion_env[m_start:m_end]))
            curr_m_peak_t = t[m_peak_idx]

            # Check overlap or proximity
            overlap = min(p_t_end, m_t_end) - max(p_t_start, m_t_start)
            current_lag = abs(p_peak_t - curr_m_peak_t)

            if overlap > 50.0 or current_lag <= max_coincidence_lag_ms:
                matched_motion = True
                if current_lag < lag_ms:
                    lag_ms = current_lag
                    m_peak_t = curr_m_peak_t

        # Calculate event confidence
        peak_amp = float(np.max(piezo_env[p_start:p_end]))
        snr_factor = min(1.0, peak_amp / max(1e-4, piezo_baseline_mean * 4.0))

        if matched_motion:
            coincidence_factor = max(0.0, 1.0 - (lag_ms / max_coincidence_lag_ms))
            confidence = 0.5 * snr_factor + 0.5 * coincidence_factor
        else:
            # Single-sensor acoustic event with motion quiet
            coincidence_factor = 0.2
            confidence = 0.4 * snr_factor

        score = confidence * (1.0 if matched_motion else 0.5)

        if score > best_score:
            best_score = score
            # Expand boundaries slightly for complete deglutition phase
            start_idx = max(0, p_start - 2)
            end_idx = min(n - 1, p_end + 2)
            best_candidate = SwallowEvent(
                event_start=float(t[start_idx]),
                event_end=float(t[end_idx]),
                event_duration=float(t[end_idx] - t[start_idx]),
                detection_confidence=float(round(confidence, 3)),
                piezo_peak_ms=float(p_peak_t),
                motion_peak_ms=float(m_peak_t) if m_peak_t is not None else None
            )

    if best_candidate is None or best_candidate.detection_confidence < 0.25:
        return NO_VALID_SWALLOW

    return best_candidate
