import yaml
from pathlib import Path
from typing import Dict, Any, List, Tuple
from app.core.config import settings

class RuleEngine:
    """
    Deterministic rule verification engine using configurable reference thresholds.
    Ensures that ML predictions are guarded by physiological bounding checks.
    """

    def __init__(self, thresholds_path: str = settings.THRESHOLDS_YAML_PATH):
        self.thresholds_path = thresholds_path
        self.config = self._load_thresholds()

    def _load_thresholds(self) -> Dict[str, Any]:
        try:
            p = Path(self.thresholds_path)
            if p.exists():
                with open(p, "r", encoding="utf-8") as f:
                    return yaml.safe_load(f)
        except Exception as e:
            print(f"Warning: Failed to load thresholds YAML ({e}), using default fallbacks.")

        return {
            "thresholds": {
                "swallow_duration_min": {"value": 450.0, "validated": False},
                "swallow_duration_max": {"value": 1250.0, "validated": False},
                "piezo_peak_detection": {"value": 0.28, "validated": False},
                "motion_elevation_g": {"value": 0.18, "validated": False},
                "min_snr_db": {"value": 12.0, "validated": False},
                "max_sensor_lag_ms": {"value": 250.0, "validated": False},
            }
        }

    def evaluate(
        self,
        signal_quality: str,
        sensor_agreement: str,
        features: Dict[str, Any],
        ml_prediction: str
    ) -> Tuple[str, List[str], List[str]]:
        """
        Evaluates heuristic bounding rules.
        Returns:
            rule_status: 'PASS' | 'FLAG' | 'NOT_VALIDATED'
            flags: list of technical flags
            explanations: list of human-readable clinical rationale sentences
        """
        thresholds = self.config.get("thresholds", {})
        dur_min = thresholds.get("swallow_duration_min", {}).get("value", 450.0)
        dur_max = thresholds.get("swallow_duration_max", {}).get("value", 1250.0)
        dur_val = thresholds.get("swallow_duration_max", {}).get("validated", False)

        flags = []
        explanations = []

        # Tag reminder
        validation_tag = " [RESEARCH_VALIDATION_REQUIRED]" if not dur_val else ""

        # 1. Signal quality gate
        if signal_quality == "POOR":
            flags.append("POOR_SIGNAL_QUALITY")
            explanations.append("Signal quality was insufficient for reliable acoustic/kinematic feature extraction.")
            return "FLAG", flags, explanations

        if signal_quality == "FAIR":
            explanations.append("Fair signal quality: Baseline acoustic SNR was acceptable but exhibited slight ambient interference.")

        # 2. Sensor agreement gate
        if sensor_agreement == "LOW":
            flags.append("LOW_SENSOR_AGREEMENT")
            explanations.append("Sensors disagreed: Contact microphone and motion sensor did not capture synchronized swallow signals.")
            return "FLAG", flags, explanations
        elif sensor_agreement == "HIGH":
            explanations.append("High cross-sensor agreement: Piezo acoustic peak and hyoid vertical elevation were tightly coupled in time.")

        # 3. Swallow Duration Rule
        swallow_duration = features.get("swallow_duration_ms", 0.0)
        if swallow_duration > 0:
            if swallow_duration < dur_min:
                flags.append("ABBREVIATED_SWALLOW_DURATION")
                explanations.append(
                    f"Swallow burst duration ({swallow_duration:.0f} ms) was shorter than reference range ({dur_min:.0f}–{dur_max:.0f} ms){validation_tag}."
                )
            elif swallow_duration > dur_max:
                flags.append("PROLONGED_SWALLOW_DURATION")
                explanations.append(
                    f"Swallow transit duration ({swallow_duration:.0f} ms) exceeded reference envelope (<{dur_max:.0f} ms){validation_tag}."
                )
            else:
                explanations.append(
                    f"Swallow duration ({swallow_duration:.0f} ms) fell within expected normative envelope ({dur_min:.0f}–{dur_max:.0f} ms){validation_tag}."
                )
        else:
            flags.append("NO_SWALLOW_ISOLATED")
            explanations.append("No distinct swallow event could be isolated above baseline threshold.")

        # 4. Dominant Frequency & Spectral Dispersion
        dom_freq = features.get("dominant_frequency_hz", 0.0)
        peak_count = features.get("spectral_peak_count", 0)
        if dom_freq > 0:
            explanations.append(f"Dominant spectral energy concentrated around {dom_freq:.1f} Hz (peak count: {peak_count}).")

        # 5. Multiple acoustic bursts (piecemeal deglutition / fragmentation)
        if peak_count >= 5:
            flags.append("FRAGMENTED_ENERGY_SPECTRUM")
            explanations.append(f"Multiple fragmented acoustic energy peaks detected ({peak_count} peaks) indicating possible non-continuous bolus clearance.")

        # 6. ML concordance note
        if ml_prediction == "ABNORMAL":
            flags.append("ML_CLASSIFIER_FLAGGED")
            explanations.append("Machine learning model identified atypical multi-parametric acoustic/kinematic pattern.")
        elif ml_prediction == "NORMAL":
            explanations.append("Machine learning feature classifier indicated standard bolus clearance trajectory.")

        # Determine rule verification status
        if any("PROLONGED" in f or "FRAGMENTED" in f or "ML_CLASSIFIER_FLAGGED" in f for f in flags):
            rule_status = "FLAG"
        elif len(flags) == 0:
            rule_status = "PASS"
        else:
            rule_status = "NOT_VALIDATED"

        return rule_status, flags, explanations
