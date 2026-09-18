/**
 * REFERENCE & PLACEHOLDER THRESHOLDS FOR KANTHARAKSHAK PROTOTYPE
 *
 * CAUTION: The values below are development placeholders for algorithm testing and UI validation.
 * They are NOT medically validated diagnostic cutoffs.
 * Every threshold constant below is explicitly flagged with RESEARCH_VALIDATION_REQUIRED.
 * Validated clinical thresholds established through IRB-approved trials must supersede these values.
 */

export const RESEARCH_VALIDATION_REQUIRED = true as const;

export interface ScreeningThresholds {
  validationStatus: 'RESEARCH_VALIDATION_REQUIRED';
  // Normal duration envelope for adult liquid bolus swallow (approx 500ms - 1200ms)
  normalDurationMinMs: number;
  normalDurationMaxMs: number;
  // Normalized piezo amplitude cutoff for detecting acoustic swallow peak
  piezoPeakDetectionThreshold: number;
  // MPU6050 resultant jerk/magnitude cutoff for hyoid elevation motion (in g)
  motionElevationThresholdG: number;
  // Minimum signal-to-noise ratio in dB required for reliable classification
  minSnrDbRequired: number;
  // Maximum cross-sensor delay between acoustic onset and motion peak (ms)
  maxSensorDisagreementLagMs: number;
  // Minimum sensor confidence to avoid triggering a RETEST
  minAcceptableConfidenceScore: number;
}

export const CURRENT_SCREENING_THRESHOLDS: ScreeningThresholds = {
  validationStatus: 'RESEARCH_VALIDATION_REQUIRED',
  normalDurationMinMs: 450,
  normalDurationMaxMs: 1250,
  piezoPeakDetectionThreshold: 0.28,
  motionElevationThresholdG: 0.18,
  minSnrDbRequired: 12.0,
  maxSensorDisagreementLagMs: 250,
  minAcceptableConfidenceScore: 0.65,
};

/**
 * Audit note regarding demographics:
 * Per specification, age is tracked for post-hoc stratification and research analysis.
 * Baseline acoustic/kinematic thresholds are NOT modulated by age group in this prototype.
 */
export const DEMOGRAPHIC_HANDLING_POLICY = {
  ageStratifiedThresholdsEnabled: false,
  policyNote:
    'Age group is collected solely for research stratification. Normal swallow thresholds are not modulated by age in prototype decision logic.',
  status: 'RESEARCH_VALIDATION_REQUIRED',
};
