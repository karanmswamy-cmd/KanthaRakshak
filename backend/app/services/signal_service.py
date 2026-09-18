import numpy as np
from typing import Tuple, Optional

# Mandatory Research Guardrail
RESEARCH_VALIDATION_REQUIRED: bool = True

class SignalService:
    """
    DSP pipeline for cervical acoustic signals and motion kinematics:
    raw signal -> remove DC offset -> normalize -> bandpass filter -> noise gate -> energy envelope -> detect window
    
    Uses pure NumPy operations to ensure zero OS/DLL dependency locks and high performance.
    """

    DEFAULT_SAMPLE_RATE_HZ = 50.0  # 50 Hz BLE packet rate
    BANDPASS_LOW_CUT_HZ = 2.0      # Remove respiratory baseline drift
    BANDPASS_HIGH_CUT_HZ = 22.0    # Frequency cutoff
    NOISE_GATE_THRESHOLD = 0.04    # Suppress baseline noise floor
    ENVELOPE_WINDOW_MS = 200.0     # 200ms moving window

    @classmethod
    def remove_dc_offset(cls, data: np.ndarray) -> np.ndarray:
        """Subtract mean baseline."""
        if len(data) == 0:
            return data
        return data - np.mean(data)

    @classmethod
    def normalize_signal(cls, data: np.ndarray) -> np.ndarray:
        """Scale signal to [-1.0, 1.0] range."""
        max_abs = np.max(np.abs(data)) if len(data) > 0 else 0
        if max_abs < 1e-6:
            return data
        return data / max_abs

    @classmethod
    def apply_bandpass_filter(
        cls,
        data: np.ndarray,
        sample_rate: float = DEFAULT_SAMPLE_RATE_HZ,
        lowcut: float = BANDPASS_LOW_CUT_HZ,
        highcut: float = BANDPASS_HIGH_CUT_HZ,
        window_len: int = 5
    ) -> np.ndarray:
        """
        Pure NumPy moving average FIR filter to remove low drift and high jitter.
        Threshold bounds marked with RESEARCH_VALIDATION_REQUIRED.
        """
        if len(data) < window_len:
            return data

        # 1. High-pass step: subtract slow baseline (window = ~1.0s = 50 samples)
        slow_win = min(len(data) // 2 * 2 + 1, max(5, int(sample_rate * 0.8)))
        if slow_win >= 3:
            baseline = np.convolve(data, np.ones(slow_win)/slow_win, mode='same')
            hp_data = data - baseline
        else:
            hp_data = data - np.mean(data)

        # 2. Low-pass smoothing: short window
        lp_win = max(3, min(7, window_len))
        kernel = np.ones(lp_win) / lp_win
        filtered = np.convolve(hp_data, kernel, mode='same')
        return filtered

    @classmethod
    def apply_noise_gate(cls, data: np.ndarray, threshold: float = NOISE_GATE_THRESHOLD) -> np.ndarray:
        """Attenuate sub-threshold ambient noise."""
        gated = np.copy(data)
        gated[np.abs(gated) < threshold] = 0.0
        return gated

    @classmethod
    def compute_energy_envelope(cls, data: np.ndarray, sample_rate: float = DEFAULT_SAMPLE_RATE_HZ) -> np.ndarray:
        """Compute smoothed short-time root-mean-square energy envelope."""
        window_size = max(3, int((cls.ENVELOPE_WINDOW_MS / 1000.0) * sample_rate))
        squared = data ** 2
        window = np.ones(window_size) / window_size
        smooth_energy = np.sqrt(np.convolve(squared, window, mode='same'))
        return smooth_energy

    @classmethod
    def detect_swallow_window(
        cls,
        envelope: np.ndarray,
        timestamps_ms: np.ndarray,
        threshold_ratio: float = 0.35,
        min_duration_ms: float = 300.0,
        max_duration_ms: float = 2500.0
    ) -> Tuple[bool, Optional[float], Optional[float], float]:
        """
        Detects primary swallow acoustic energy burst window.
        Returns:
            detected: bool
            start_ms: float or None
            end_ms: float or None
            duration_ms: float
        """
        if len(envelope) == 0:
            return False, None, None, 0.0

        peak_val = float(np.max(envelope))
        if peak_val < 0.10:
            return False, None, None, 0.0

        cutoff = peak_val * threshold_ratio
        above_threshold = envelope >= cutoff

        # Contiguous regions above threshold
        diff = np.diff(np.concatenate(([False], above_threshold, [False])).astype(int))
        starts = np.where(diff == 1)[0]
        ends = np.where(diff == -1)[0]

        best_start_ms = None
        best_end_ms = None
        best_duration_ms = 0.0

        for s, e in zip(starts, ends):
            if s >= len(timestamps_ms) or e - 1 >= len(timestamps_ms):
                continue
            duration = timestamps_ms[min(e - 1, len(timestamps_ms) - 1)] - timestamps_ms[s]
            if min_duration_ms <= duration <= max_duration_ms:
                if duration > best_duration_ms:
                    best_duration_ms = duration
                    best_start_ms = float(timestamps_ms[s])
                    best_end_ms = float(timestamps_ms[min(e - 1, len(timestamps_ms) - 1)])

        detected = best_start_ms is not None
        return detected, best_start_ms, best_end_ms, best_duration_ms
