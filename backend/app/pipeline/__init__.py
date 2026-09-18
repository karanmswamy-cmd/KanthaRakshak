"""
JeevaSwara / KanthaRakshak Research-Grade Biomedical Signal Processing and ML Pipeline.

Prototype non-invasive swallow-screening decision support pipeline.
Note: Research prototype only. Not a diagnostic medical device.
"""

from app.pipeline.data_format import TelemetrySession, SessionMetadata, SwallowEvent
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
from app.pipeline.event_detection import detect_swallow_event, NO_VALID_SWALLOW
from app.pipeline.quality_assessment import assess_signal_quality
from app.pipeline.feature_extractor import extract_all_features
from app.pipeline.dataset_loader import (
    normalize_labels,
    map_dataset_columns,
    load_public_research_dataset,
    patient_wise_train_test_split
)
from app.pipeline.model_trainer import compute_offline_shap_summary, NUMERICAL_FEATURE_COLUMNS
from app.pipeline.inference import predict_session

__all__ = [
    "TelemetrySession",
    "SessionMetadata",
    "SwallowEvent",
    "NO_VALID_SWALLOW",
    "remove_dc_offset",
    "normalize_signal",
    "bandpass_filter",
    "noise_gate",
    "smooth_envelope",
    "resample_if_needed",
    "detect_clipping",
    "estimate_noise_floor",
    "calculate_accel_magnitude",
    "remove_gravity_baseline",
    "compute_motion_envelope",
    "compute_jerk",
    "detect_swallow_event",
    "assess_signal_quality",
    "extract_all_features",
    "normalize_labels",
    "map_dataset_columns",
    "load_public_research_dataset",
    "patient_wise_train_test_split",
    "compute_offline_shap_summary",
    "NUMERICAL_FEATURE_COLUMNS",
    "predict_session",
]

