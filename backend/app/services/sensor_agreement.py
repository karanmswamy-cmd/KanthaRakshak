from typing import Dict, Any, Tuple

class SensorAgreementService:
    """
    Evaluates cross-modal agreement between the 27mm acoustic Piezo
    and the MPU6050 hyolaryngeal motion sensor.
    """

    # Engineering threshold limits [RESEARCH_VALIDATION_REQUIRED]
    MAX_ACCEPTABLE_LAG_MS = 250.0  # Max delay between sound burst & motion peak
    HIGH_AGREEMENT_CORR = 0.50     # Normalized envelope correlation
    MODERATE_AGREEMENT_CORR = 0.20

    @classmethod
    def evaluate_agreement(cls, features: Dict[str, Any]) -> Tuple[str, list[str]]:
        """
        Determines cross-sensor agreement level.
        Returns:
            agreement: 'HIGH' | 'MEDIUM' | 'LOW'
            reasons: list of explanatory strings
        """
        piezo_detected = features.get("piezo_detected", False)
        motion_detected = features.get("motion_detected", False)
        lag_ms = features.get("piezo_motion_delay_ms", 999.0)
        corr = features.get("cross_correlation_coeff", 0.0)

        reasons = []

        # Case 1: One sensor fired but other did not
        if piezo_detected and not motion_detected:
            reasons.append("Acoustic swallow detected by contact mic, but MPU6050 hyoid displacement was absent.")
            return "LOW", reasons

        if motion_detected and not piezo_detected:
            reasons.append("Motion displacement detected by MPU6050, but acoustic contact mic failed to isolate bolus sound.")
            return "LOW", reasons

        if not piezo_detected and not motion_detected:
            reasons.append("Neither acoustic nor kinematic modalities detected a coordinated swallow event.")
            return "LOW", reasons

        # Case 2: Both detected - check temporal synchronization & lag
        if lag_ms > cls.MAX_ACCEPTABLE_LAG_MS:
            reasons.append(
                f"Acoustic and motion events desynchronized: lag of {lag_ms:.0f}ms exceeded {cls.MAX_ACCEPTABLE_LAG_MS:.0f}ms reference cutoff [RESEARCH_VALIDATION_REQUIRED]."
            )
            return "LOW", reasons

        if corr >= cls.HIGH_AGREEMENT_CORR and lag_ms <= 150.0:
            reasons.append("High temporal coincidence and acoustic-kinematic envelope synchronization confirmed.")
            return "HIGH", reasons

        if corr >= cls.MODERATE_AGREEMENT_CORR or lag_ms <= cls.MAX_ACCEPTABLE_LAG_MS:
            reasons.append("Moderate agreement: Acoustic burst and laryngeal excursion occurred within acceptable reference window.")
            return "MEDIUM", reasons

        reasons.append("Low correlation between acoustic energy envelope and vertical motion trajectory.")
        return "LOW", reasons
