from pathlib import Path
from typing import Dict, Any, Tuple
import joblib
import numpy as np

MODEL_PATH = Path(__file__).resolve().parent.parent / "ml_models" / "swallow_risk_model.joblib"

class MLService:
    """
    Inference service for ML swallow risk prediction.
    Loads serialized model package via joblib.
    Exposes predict(features) returning (predicted_class, probability, model_version).
    """

    def __init__(self, model_path: Path = MODEL_PATH):
        self.model_path = model_path
        self.model_package = None
        self._load_model()

    def _load_model(self):
        try:
            if self.model_path.exists():
                self.model_package = joblib.load(self.model_path)
            else:
                print(f"Notice: ML model not found at {self.model_path}. Fallback heuristic active.")
        except Exception as e:
            print(f"Notice: Error loading ML model ({e}). Using heuristic fallback.")

    def predict(self, features: Dict[str, Any]) -> Tuple[str, float, str]:
        """
        Runs model inference.
        Returns:
            predicted_class: 'NORMAL' | 'ABNORMAL' | 'INCONCLUSIVE'
            probability: float (0.0 to 1.0)
            model_version: str
        """
        if not self.model_package:
            # Fallback heuristic if joblib file is absent
            dur = features.get("swallow_duration_ms", 0.0)
            if dur <= 0:
                return "INCONCLUSIVE", 0.5, "v1.0.0-fallback"
            if dur > 1250.0 or features.get("spectral_peak_count", 0) >= 5:
                return "ABNORMAL", 0.85, "v1.0.0-fallback"
            return "NORMAL", 0.90, "v1.0.0-fallback"

        version = self.model_package.get("version", "v1.0.0")

        # If package uses explicit parametric weights
        if "weights" in self.model_package:
            weights = self.model_package["weights"]
            bias = self.model_package.get("bias", 0.0)
            z = bias
            for feat_name, w in weights.items():
                val = float(features.get(feat_name, 0.0))
                z += w * val

            # Sigmoid activation for abnormal bolus probability
            prob_abnormal = float(1.0 / (1.0 + np.exp(-np.clip(z, -15.0, 15.0))))
            pred_class = "ABNORMAL" if prob_abnormal >= 0.50 else "NORMAL"
            confidence = prob_abnormal if pred_class == "ABNORMAL" else float(1.0 - prob_abnormal)
            return pred_class, round(confidence, 3), version

        # If scikit-learn model object is stored directly
        if "model" in self.model_package:
            model = self.model_package["model"]
            feature_names = self.model_package["feature_names"]
            vector = [float(features.get(name, 0.0)) for name in feature_names]
            probs = model.predict_proba([vector])[0]
            prob_abnormal = float(probs[1]) if len(probs) > 1 else float(probs[0])
            pred_class = "ABNORMAL" if prob_abnormal >= 0.50 else "NORMAL"
            confidence = prob_abnormal if pred_class == "ABNORMAL" else float(probs[0])
            return pred_class, round(confidence, 3), version

        return "INCONCLUSIVE", 0.50, version
