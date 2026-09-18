"""
Kinematic and Accelerometer Processing Module for MPU6050 swallow sensors.
"""

import numpy as np

def calculate_accel_magnitude(ax: np.ndarray, ay: np.ndarray, az: np.ndarray) -> np.ndarray:
    """
    Computes Euclidean resultant acceleration magnitude:
    magnitude = sqrt(ax^2 + ay^2 + az^2)
    Units: g (earth gravitational units)
    """
    x = np.asarray(ax, dtype=float)
    y = np.asarray(ay, dtype=float)
    z = np.asarray(az, dtype=float)
    return np.sqrt(x**2 + y**2 + z**2)

def remove_gravity_baseline(accel_magnitude: np.ndarray, window_size: int = 25) -> np.ndarray:
    """
    Removes the ~1.0g static gravitational baseline and slow posture shifts
    to isolate dynamic hyolaryngeal excursion movement.
    """
    mag = np.asarray(accel_magnitude, dtype=float)
    n = len(mag)
    if n < 5 or window_size <= 1:
        return mag - np.mean(mag) if n > 0 else mag

    w = min(window_size, n // 2 * 2 + 1)
    if w % 2 == 0:
        w += 1
    w = max(3, w)

    padded = np.pad(mag, (w // 2, w // 2), mode='edge')
    kernel = np.ones(w) / w
    baseline = np.convolve(padded, kernel, mode='valid')
    if len(baseline) > n:
        baseline = baseline[:n]

    dynamic_motion = mag - baseline
    return dynamic_motion

def compute_motion_envelope(dynamic_motion: np.ndarray, window_size: int = 7) -> np.ndarray:
    """
    Computes smoothed absolute kinetic motion envelope for swallow excursion identification.
    """
    rectified = np.abs(np.asarray(dynamic_motion, dtype=float))
    n = len(rectified)
    if n < 3 or window_size <= 1:
        return rectified

    w = min(window_size, n if n % 2 != 0 else n - 1)
    if w < 3:
        return rectified

    padded = np.pad(rectified, (w // 2, w // 2), mode='edge')
    kernel = np.ones(w) / w
    env = np.convolve(padded, kernel, mode='valid')
    if len(env) > n:
        env = env[:n]
    return env

def compute_jerk(accel_magnitude: np.ndarray, dt: float = 0.02) -> np.ndarray:
    """
    Computes jerk (da/dt), the first time-derivative of acceleration.
    Captures rapid onset transitions, laryngeal jerk, and involuntary tremor.
    Units: g/s
    """
    mag = np.asarray(accel_magnitude, dtype=float)
    if len(mag) < 2 or dt <= 0:
        return np.zeros_like(mag)

    jerk = np.gradient(mag, dt)
    return jerk
