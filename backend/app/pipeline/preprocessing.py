"""
Biomedical Signal Preprocessing Module for JeevaSwara / KanthaRakshak.

RESEARCH DISCLAIMER:
Filter frequencies, noise floor cutoffs, and windowing durations configured in this
module are experimental developer heuristics for prototype signal conditioning.
THEY ARE NOT CLINICALLY VALIDATED MEDICAL PARAMETERS.
"""

import numpy as np
from typing import Tuple, Literal

def remove_dc_offset(signal: np.ndarray, method: Literal["mean", "median"] = "mean") -> np.ndarray:
    """
    Removes baseline DC offset / drift from the sensor signal.
    """
    arr = np.asarray(signal, dtype=float)
    if len(arr) == 0:
        return arr
    offset = np.median(arr) if method == "median" else np.mean(arr)
    return arr - offset

def normalize_signal(
    signal: np.ndarray,
    method: Literal["zscore", "minmax", "peak"] = "peak",
    eps: float = 1e-7
) -> np.ndarray:
    """
    Normalizes signal amplitude to standardized scale.
    'peak': scales maximum absolute amplitude to 1.0.
    'zscore': zero-mean, unit variance.
    'minmax': scales to [-1.0, 1.0].
    """
    arr = np.asarray(signal, dtype=float)
    if len(arr) == 0:
        return arr

    if method == "peak":
        peak = np.max(np.abs(arr))
        if peak < eps:
            return np.zeros_like(arr)
        return arr / peak

    elif method == "zscore":
        std = np.std(arr)
        if std < eps:
            return np.zeros_like(arr)
        return (arr - np.mean(arr)) / std

    elif method == "minmax":
        min_v = np.min(arr)
        max_v = np.max(arr)
        span = max_v - min_v
        if span < eps:
            return np.zeros_like(arr)
        # Scale to [-1, 1]
        return 2.0 * ((arr - min_v) / span) - 1.0

    return arr

def bandpass_filter(
    signal: np.ndarray,
    fs: float,
    lowcut: float = 20.0,
    highcut: float = 300.0,
    order: int = 4
) -> np.ndarray:
    """
    Configurable bandpass filter for cervical deglutition acoustics.
    Uses pure-NumPy moving window FIR / difference filtering to maintain zero OS DLL dependencies.

    NOTE: The default range (20 Hz - 300 Hz) is an experimental heuristic to attenuate
    heart sounds / low-frequency respiratory motion while capturing pharyngeal transit acoustics.
    RESEARCH VALIDATION REQUIRED - NOT A DIAGNOSTIC SETTING.
    """
    arr = np.asarray(signal, dtype=float)
    n = len(arr)
    if n < 5:
        return arr.copy()

    # Apply forward-backward moving-average lowpass filter
    # cutoff approx fs / (2 * window)
    window_low = max(3, int(round(fs / max(1.0, highcut))))
    if window_low % 2 == 0:
        window_low += 1

    # Apply lowpass
    padded_low = np.pad(arr, (window_low // 2, window_low // 2), mode='edge')
    kernel_low = np.ones(window_low) / window_low
    lowpassed = np.convolve(padded_low, kernel_low, mode='valid')
    if len(lowpassed) > n:
        lowpassed = lowpassed[:n]

    # Highpass: subtract broad baseline moving average (lowcut)
    window_high = max(5, int(round(fs / max(0.1, lowcut))))
    if window_high % 2 == 0:
        window_high += 1

    padded_high = np.pad(lowpassed, (window_high // 2, window_high // 2), mode='edge')
    kernel_high = np.ones(window_high) / window_high
    baseline = np.convolve(padded_high, kernel_high, mode='valid')
    if len(baseline) > n:
        baseline = baseline[:n]

    bandpassed = lowpassed - baseline
    return bandpassed

def noise_gate(signal: np.ndarray, threshold: float = 0.03) -> np.ndarray:
    """
    Suppresses sub-threshold baseline acoustic noise, preserving significant deglutition bursts.
    """
    arr = np.asarray(signal, dtype=float).copy()
    mask = np.abs(arr) < threshold
    arr[mask] = 0.0
    return arr

def smooth_envelope(signal: np.ndarray, window_len: int = 5) -> np.ndarray:
    """
    Computes smoothed energy envelope via sliding root-mean-square (RMS) window.
    """
    arr = np.asarray(signal, dtype=float)
    if len(arr) == 0:
        return arr
    if window_len <= 1 or len(arr) < window_len:
        return np.abs(arr)

    squared = arr ** 2
    padded = np.pad(squared, (window_len // 2, window_len // 2), mode='reflect')
    kernel = np.ones(window_len) / window_len
    rms_sq = np.convolve(padded, kernel, mode='valid')
    if len(rms_sq) > len(arr):
        rms_sq = rms_sq[:len(arr)]
    return np.sqrt(np.maximum(0.0, rms_sq))

def resample_if_needed(
    signal: np.ndarray,
    timestamps: np.ndarray,
    target_fs: float = 50.0
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Resamples time-series to uniform target frequency using linear interpolation.
    """
    arr = np.asarray(signal, dtype=float)
    t = np.asarray(timestamps, dtype=float)
    if len(t) < 2 or len(arr) != len(t):
        return arr, t

    duration_sec = (t[-1] - t[0]) / 1000.0
    if duration_sec <= 0:
        return arr, t

    expected_samples = int(round(duration_sec * target_fs)) + 1
    if expected_samples <= 1:
        return arr, t

    uniform_t = np.linspace(t[0], t[-1], expected_samples)
    resampled_signal = np.interp(uniform_t, t, arr)
    return resampled_signal, uniform_t

def detect_clipping(signal: np.ndarray, threshold: float = 0.98) -> Tuple[bool, float]:
    """
    Detects analog-to-digital converter (ADC) saturation or clipping.
    Returns: (has_clipping, clipping_ratio)
    """
    arr = np.asarray(signal, dtype=float)
    if len(arr) == 0:
        return False, 0.0
    clipped_count = np.sum(np.abs(arr) >= threshold)
    ratio = float(clipped_count / len(arr))
    return bool(ratio > 0.05), float(ratio)

def estimate_noise_floor(signal: np.ndarray, baseline_ratio: float = 0.25) -> Tuple[float, float]:
    """
    Estimates baseline acoustic noise floor from initial quiescent period before swallow stimulus.
    Returns: (noise_rms, noise_std)
    """
    arr = np.asarray(signal, dtype=float)
    if len(arr) == 0:
        return 0.0, 0.0
    n_baseline = max(5, int(len(arr) * baseline_ratio))
    baseline = arr[:n_baseline]
    rms = float(np.sqrt(np.mean(baseline ** 2)))
    std = float(np.std(baseline))
    return rms, std
