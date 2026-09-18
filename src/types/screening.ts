import { SignalQualityLevel, SensorAgreementLevel } from './sensor';
import { AgeGroup } from './patient';

export type ScreeningState = 'LOW_RISK' | 'RETEST' | 'POSSIBLE_RISK';

export interface ExplainabilityData {
  signalQuality: SignalQualityLevel;
  piezoEventDetected: boolean;
  movementEventDetected: boolean;
  sensorAgreement: SensorAgreementLevel;
  swallowDurationMs: number;
  dominantFrequencyHz: number;
  spectralFeaturesSummary: string;
  mlAssessment: 'NORMAL' | 'ABNORMAL' | 'INCONCLUSIVE';
  ruleVerification: 'PASS' | 'FLAG' | 'NOT_VALIDATED';
  confidenceScorePercent?: number;
  clinicalExplanations: string[]; // Plain-language reasons supplied by backend
  retestReasons?: string[]; // If state is RETEST
}

export interface ScreeningRecord {
  id: string; // e.g., "TEST-8812"
  patientId: string;
  patientNameOrInitials?: string;
  patientAge: number;
  patientAgeGroup: AgeGroup;
  wardOrRoom?: string;
  createdAt: string; // ISO string
  screeningState: ScreeningState;
  signalQuality: SignalQualityLevel;
  operatorNurse: string;
  explainability: ExplainabilityData;
  durationSeconds: number;
  recordedDataPointsCount: number;
  isDemoSimulation: boolean;
  recommendationText: string;
}
