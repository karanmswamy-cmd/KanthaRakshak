from typing import Dict, Any, List, Tuple
from app.schemas.test import FinalResultEnum
from app.services.quality_service import QualityService
from app.services.sensor_agreement import SensorAgreementService
from app.services.rule_engine import RuleEngine
from app.services.ml_service import MLService
from app.schemas.sensor import SensorSample

class DecisionEngine:
    """
    Synthesizes signal quality, dual-sensor agreement, deterministic rule verification,
    and machine learning predictions to yield one of three conservative outcomes:
    1. LOW_RISK
    2. RETEST
    3. POSSIBLE_RISK
    """

    def __init__(self):
        self.rule_engine = RuleEngine()
        self.ml_service = MLService()

    def evaluate(
        self,
        samples: List[SensorSample],
        features: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executes hierarchical clinical decision synthesis.
        """
        # Step 1: Quality Check
        signal_quality, noise_level, motion_baseline, q_diag = QualityService.evaluate_quality(samples)

        # Step 2: Sensor Agreement Check
        sensor_agreement, agreement_reasons = SensorAgreementService.evaluate_agreement(features)

        # Gate 1: POOR Signal Quality -> RETEST
        if signal_quality == "POOR":
            reasons = [
                "Signal quality was insufficient for reliable analysis.",
                *q_diag.get("flags", [])
            ]
            if q_diag.get("reason"):
                reasons.append(q_diag["reason"])

            return {
                "final_result": FinalResultEnum.RETEST,
                "signal_quality": signal_quality,
                "noise_level": noise_level,
                "motion_baseline": motion_baseline,
                "sensor_agreement": sensor_agreement,
                "ml_prediction": "INCONCLUSIVE",
                "ml_probability": 0.0,
                "rule_status": "FLAG",
                "plain_language_explanations": reasons,
                "recommendation": "Re-secure 27mm piezo sensor with medical tape, verify patient is seated upright and still, and repeat screening."
            }

        # Gate 2: No valid swallow event isolated -> RETEST
        piezo_detected = features.get("piezo_detected", False)
        swallow_duration = features.get("swallow_duration_ms", 0.0)
        if not piezo_detected or swallow_duration <= 0:
            return {
                "final_result": FinalResultEnum.RETEST,
                "signal_quality": signal_quality,
                "noise_level": noise_level,
                "motion_baseline": motion_baseline,
                "sensor_agreement": sensor_agreement,
                "ml_prediction": "INCONCLUSIVE",
                "ml_probability": 0.0,
                "rule_status": "FLAG",
                "plain_language_explanations": [
                  "No valid pharyngeal swallow event was detected during the recording window.",
                  "Acoustic amplitude remained near baseline noise floor."
                ],
                "recommendation": "Repeat test with instructed 5 mL water bolus and ensure patient swallows in one continuous motion."
            }

        # Gate 3: Low sensor agreement -> RETEST
        if sensor_agreement == "LOW":
            return {
                "final_result": FinalResultEnum.RETEST,
                "signal_quality": signal_quality,
                "noise_level": noise_level,
                "motion_baseline": motion_baseline,
                "sensor_agreement": sensor_agreement,
                "ml_prediction": "INCONCLUSIVE",
                "ml_probability": 0.0,
                "rule_status": "FLAG",
                "plain_language_explanations": [
                  "Sensors disagreed: acoustic microphone and MPU6050 motion readings failed cross-correlation check.",
                  *agreement_reasons
                ],
                "recommendation": "Re-align MPU6050 directly over thyroid notch and 27mm piezo lateral to cricoid, then repeat test."
            }

        # Step 3: Run ML model inference
        ml_pred, ml_prob, ml_ver = self.ml_service.predict(features)

        # Step 4: Run Deterministic Rule Engine
        rule_status, rule_flags, rule_explanations = self.rule_engine.evaluate(
            signal_quality=signal_quality,
            sensor_agreement=sensor_agreement,
            features=features,
            ml_prediction=ml_pred
        )

        all_explanations = list(rule_explanations)

        # Step 5: Conservative Evidence Synthesis
        # Only classify POSSIBLE_RISK if ML AND/OR multiple physiologically abnormal features trigger
        has_abnormal_duration = "PROLONGED_SWALLOW_DURATION" in rule_flags
        has_fragmented_peaks = "FRAGMENTED_ENERGY_SPECTRUM" in rule_flags
        is_ml_abnormal = ml_pred == "ABNORMAL" and ml_prob >= 0.70

        if (has_abnormal_duration and is_ml_abnormal) or (has_abnormal_duration and has_fragmented_peaks) or (is_ml_abnormal and len(rule_flags) >= 2):
            final_result = FinalResultEnum.POSSIBLE_RISK
            recommendation = (
                "Potentially abnormal swallowing characteristics were identified. "
                "Further assessment by a qualified clinician or speech-language professional is recommended."
            )
        else:
            final_result = FinalResultEnum.LOW_RISK
            recommendation = (
                "No concerning swallowing pattern was identified during this screening. "
                "Screening result only – not a medical diagnosis."
            )

        return {
            "final_result": final_result,
            "signal_quality": signal_quality,
            "noise_level": noise_level,
            "motion_baseline": motion_baseline,
            "sensor_agreement": sensor_agreement,
            "ml_prediction": ml_pred,
            "ml_probability": ml_prob,
            "rule_status": rule_status,
            "plain_language_explanations": all_explanations,
            "recommendation": recommendation
        }
