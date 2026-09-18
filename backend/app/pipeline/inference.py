"""
Production Inference and Explainability Module for JeevaSwara / KanthaRakshak.

Provides predict_session() API endpoint with:
- Automated signal preprocessing
- Signal quality assessment (GOOD / FAIR / POOR)
- Candidate swallow event isolation
- Comprehensive feature extraction
- Sensor agreement verification
- Machine learning prediction (with DEMO_MODEL fallback)
- Nurse-friendly plain language explainability
"""

import os
import json
import joblib
import numpy as np
from typing import Dict, Any, Optional, Union
from app.pipeline.data_format import TelemetrySession, SwallowEvent, NO_VALID_SWALLOW
from app.pipeline.quality_assessment import assess_signal_quality
from app.pipeline.event_detection import detect_swallow_event
from app.pipeline.feature_extractor import extract_all_features
from app.pipeline.model_trainer import NUMERICAL_FEATURE_COLUMNS

def get_explainable_categories(
    signal_quality: str,
    sensor_agreement: str,
    swallow_detected: bool,
    features: Dict[str, Any],
    ml_prediction: str,
    probability: float
) -> list[str]:
    """
    Translates mathematical telemetry features into clear, intuitive,
    nurse-friendly clinical categories without raw mathematical jargon.
    """
    explanations = []

    # 1. Signal Quality rationale
    if signal_quality == "POOR":
        explanations.append("Signal quality was compromised by patient motion or loose sensor placement.")
    elif signal_quality == "FAIR":
        explanations.append("Acoustic signal was acceptable but contained moderate background tremor.")
    else:
        explanations.append("High-integrity acoustic and kinematic baseline recorded.")

    # 2. Event Detection rationale
    if not swallow_detected:
        explanations.append("No valid deglutition burst was identified during the active window.")
        return explanations

    # 3. Temporal Duration rationale
    dur = features.get("swallow_duration_ms", 0.0)
    if dur > 1250.0:
        explanations.append(f"Swallow event duration ({dur:.0f} ms) was prolonged relative to reference range (450–1250 ms)*.")
    elif dur < 400.0:
        explanations.append(f"Swallow duration ({dur:.0f} ms) was unusually brief.")
    else:
        explanations.append(f"Swallow event duration ({dur:.0f} ms) was within expected physiological reference limits (450–1250 ms)*.")

    # 4. Sensor Alignment rationale
    delay_ms = features.get("piezo_motion_peak_delay_ms", 0.0)
    if sensor_agreement == "LOW" or delay_ms > 200.0:
        explanations.append(f"Acoustic swallow sound and laryngeal elevation motion were poorly aligned (lag {delay_ms:.0f} ms).")
    elif sensor_agreement == "HIGH":
        explanations.append(f"Strong biomechanical synchronization: acoustic burst matched laryngeal movement within {delay_ms:.0f} ms.")

    # 5. Spectral & Effort rationale
    peaks = features.get("spectral_peak_count", 0)
    if peaks >= 4:
        explanations.append("Acoustic energy spectrum showed multiple fragmented bursts, suggesting fragmented or multi-effort clearing.")
    elif peaks > 0:
        explanations.append("Acoustic spectral distribution matched a single coordinated deglutition transit.")

    # 6. ML Assessment
    if ml_prediction == "ABNORMAL" and probability >= 0.65:
        explanations.append(f"Biomechanical pattern recognition model flagged atypical swallow dynamics (risk index: {int(probability * 100)}%).")
    elif ml_prediction == "NORMAL":
        explanations.append(f"Biomechanical pattern recognition model classified profile as typical (confidence: {int((1.0 - probability) * 100)}%).")

    return explanations

class SessionInferenceEngine:
    """
    Manages model loading, caching, and evaluation for production inference.
    Supports DEMO_MODEL=true fallback when no trained artifact exists.
    """

    def __init__(self, model_dir: Optional[str] = None):
        if model_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_dir = os.path.join(base_dir, "ml_models")

        self.model_dir = model_dir
        self.model_path = os.path.join(model_dir, "model.joblib")
        self.meta_path = os.path.join(model_dir, "model_metadata.json")
        self.schema_path = os.path.join(model_dir, "feature_schema.json")

        self.pipeline = None
        self.metadata = {}
        self.feature_names = NUMERICAL_FEATURE_COLUMNS

        self._load_model()

    def _load_model(self):
        """Loads trained sklearn pipeline and schema if available on disk."""
        if os.path.exists(self.model_path):
            try:
                self.pipeline = joblib.load(self.model_path)
            except Exception as e:
                print(f"[InferenceEngine] Warning: Failed loading {self.model_path}: {e}")
                self.pipeline = None

        if os.path.exists(self.meta_path):
            try:
                with open(self.meta_path, "r") as f:
                    self.metadata = json.load(f)
            except Exception:
                self.metadata = {}

        if os.path.exists(self.schema_path):
            try:
                with open(self.schema_path, "r") as f:
                    schema = json.load(f)
                    self.feature_names = schema.get("feature_names", NUMERICAL_FEATURE_COLUMNS)
            except Exception:
                pass

    def predict_session(
        self,
        session: TelemetrySession,
        demo_mode: Optional[bool] = None
    ) -> Dict[str, Any]:
        """
        Executes end-to-end evaluation on a recorded session.

        Returns standard response payload:
        {
          "signal_quality": "GOOD" | "FAIR" | "POOR",
          "swallow_detected": bool,
          "features": {...},
          "sensor_agreement": "HIGH" | "MEDIUM" | "LOW",
          "ml_prediction": "NORMAL" | "ABNORMAL" | "INCONCLUSIVE",
          "probability": float,
          "model_version": str,
          "uses_age": bool,
          "explainability": list[str],
          "demo_mode": bool
        }
        """
        # Determine demo mode
        env_demo = os.getenv("DEMO_MODEL", "false").lower() in ("true", "1", "yes")
        is_demo = demo_mode if demo_mode is not None else (env_demo or (self.pipeline is None))

        # 1. Assess Signal Quality
        quality_category, quality_score, q_diag = assess_signal_quality(session)

        # 2. Detect Swallow Event
        event = detect_swallow_event(session)
        swallow_detected = isinstance(event, SwallowEvent)

        # 3. Extract Features
        features = extract_all_features(session, event if swallow_detected else None)
        sensor_agreement = features.get("sensor_agreement", "MEDIUM")

        # 4. Gating Check
        if quality_category == "POOR" or not swallow_detected:
            ml_pred = "INCONCLUSIVE"
            probability = 0.5
            model_ver = "demo-heuristic" if is_demo else self.metadata.get("version", "1.0.0-research")
            uses_age = False
            explanations = get_explainable_categories(
                quality_category, sensor_agreement, swallow_detected, features, ml_pred, probability
            )
            return {
                "signal_quality": quality_category,
                "signal_quality_score": quality_score,
                "swallow_detected": swallow_detected,
                "features": features,
                "sensor_agreement": sensor_agreement,
                "ml_prediction": ml_pred,
                "probability": probability,
                "model_version": model_ver,
                "uses_age": uses_age,
                "demo_mode": is_demo,
                "explainability": explanations,
                "notice": "Demonstration analysis – not trained clinical model" if is_demo else None
            }

        # 5. ML Inference
        if is_demo or self.pipeline is None:
            # Explicit Demonstration Logic: heuristic scoring without claiming trained ML model
            dur = features.get("swallow_duration_ms", 700.0)
            peaks = features.get("spectral_peak_count", 2)
            lag = features.get("piezo_motion_peak_delay_ms", 40.0)

            # Physiological heuristic score
            score = 0.15
            if dur > 1250.0:
                score += 0.45
            if peaks >= 4:
                score += 0.25
            if lag > 150.0:
                score += 0.15

            probability = float(np.clip(score, 0.05, 0.95))
            ml_pred = "ABNORMAL" if probability >= 0.50 else "NORMAL"
            model_ver = "demo-heuristic"
            uses_age = False
            notice = "Demonstration analysis – not trained clinical model"
        else:
            # Production Trained Model Pipeline
            feature_vector = np.array([[features.get(col, 0.0) for col in self.feature_names]], dtype=float)
            try:
                probs = self.pipeline.predict_proba(feature_vector)[0]
                probability = float(round(probs[1], 4)) # Probability of ABNORMAL
                ml_pred = "ABNORMAL" if probability >= 0.50 else "NORMAL"
            except Exception:
                pred_raw = self.pipeline.predict(feature_vector)[0]
                ml_pred = "ABNORMAL" if pred_raw == 1 else "NORMAL"
                probability = 0.85 if ml_pred == "ABNORMAL" else 0.15

            model_ver = self.metadata.get("version", "1.0.0-research")
            uses_age = self.metadata.get("uses_age", False)
            notice = None

        explanations = get_explainable_categories(
            quality_category, sensor_agreement, swallow_detected, features, ml_pred, probability
        )

        return {
            "signal_quality": quality_category,
            "signal_quality_score": quality_score,
            "swallow_detected": swallow_detected,
            "features": features,
            "sensor_agreement": sensor_agreement,
            "ml_prediction": ml_pred,
            "probability": round(probability, 4),
            "model_version": model_ver,
            "uses_age": uses_age,
            "demo_mode": is_demo,
            "explainability": explanations,
            "notice": notice
        }

# Global singleton instance
inference_engine = SessionInferenceEngine()

def predict_session(session: TelemetrySession, demo_mode: Optional[bool] = None) -> Dict[str, Any]:
    """Convenience function calling the singleton inference engine."""
    return inference_engine.predict_session(session, demo_mode=demo_mode)
