import { SensorDataPoint, QualityPacket } from '../types/sensor';
import { ScreeningRecord } from '../types/screening';

export interface DemoSession {
  id: 'normal' | 'poor_signal' | 'abnormal';
  title: string;
  tag: string;
  description: string;
  expectedResult: 'LOW_RISK' | 'RETEST' | 'POSSIBLE_RISK';
  qualitySummary: QualityPacket;
  durationSeconds: number;
  dataPoints: SensorDataPoint[];
  screeningRecord: ScreeningRecord;
}

// Generate realistic simulated waveform points
function generateWaveformData(
  type: 'normal' | 'poor_signal' | 'abnormal',
  totalPoints: number = 80
): SensorDataPoint[] {
  const points: SensorDataPoint[] = [];
  const dt = 50; // 50ms per point (20Hz sampling preview)

  for (let i = 0; i < totalPoints; i++) {
    const t = i * dt; // time in ms
    let piezo = 0;
    let ax = 0.02;
    let ay = 0.05;
    let az = 0.98;

    if (type === 'normal') {
      // Baseline small noise
      const baseNoise = (Math.sin(i * 0.4) + Math.cos(i * 0.9)) * 0.02;
      // Swallow event between 1500ms and 2300ms (duration 800ms)
      if (t >= 1500 && t <= 2300) {
        const progress = (t - 1500) / 800; // 0 to 1
        const envelope = Math.sin(progress * Math.PI); // smooth bell
        const freqComponent = Math.sin((t - 1500) * 0.06);
        piezo = envelope * (0.65 + 0.15 * freqComponent) + baseNoise;
        // Hyoid elevation motion
        ax = 0.02 + envelope * 0.22 * Math.sin(progress * Math.PI);
        ay = 0.05 + envelope * 0.18;
        az = 0.98 - envelope * 0.12;
      } else {
        piezo = baseNoise;
      }
    } else if (type === 'poor_signal') {
      // High noise, erratic jumps, weak coupling
      const randomJitter = (Math.random() - 0.5) * 0.28;
      const drift = Math.sin(i * 0.15) * 0.18;
      piezo = randomJitter + drift;
      ax = 0.15 + (Math.random() - 0.5) * 0.35;
      ay = 0.22 + (Math.random() - 0.5) * 0.4;
      az = 0.9 + (Math.random() - 0.5) * 0.25;
    } else {
      // 'abnormal' - Prolonged, fragmented swallow (1400ms to 3100ms)
      const baseNoise = (Math.sin(i * 0.3) + Math.cos(i * 0.8)) * 0.025;
      if (t >= 1400 && t <= 3100) {
        const progress = (t - 1400) / 1700;
        // Two stuttered peaks
        const envelope1 = Math.max(0, Math.sin(progress * Math.PI * 1.5)) * (progress < 0.6 ? 1 : 0.3);
        const envelope2 = progress > 0.4 ? Math.sin((progress - 0.4) * Math.PI * 2) * 0.6 : 0;
        const totalEnvelope = Math.min(1.0, envelope1 + envelope2);
        piezo = totalEnvelope * 0.72 * Math.sin(t * 0.08) + baseNoise;
        // Atypical asynchronous motion
        ax = 0.02 + totalEnvelope * 0.35 * Math.cos(progress * Math.PI);
        ay = 0.05 + totalEnvelope * 0.28;
        az = 0.98 - totalEnvelope * 0.22;
      } else {
        piezo = baseNoise;
      }
    }

    const accel_mag = parseFloat(Math.sqrt(ax * ax + ay * ay + az * az).toFixed(3));
    points.push({
      timestamp: t,
      piezo: parseFloat(piezo.toFixed(3)),
      ax: parseFloat(ax.toFixed(3)),
      ay: parseFloat(ay.toFixed(3)),
      az: parseFloat(az.toFixed(3)),
      accel_magnitude: accel_mag,
    });
  }

  return points;
}

export const DEMO_SESSIONS: Record<'normal' | 'poor_signal' | 'abnormal', DemoSession> = {
  normal: {
    id: 'normal',
    title: 'Clinical Case 1: Normal Bolus Transit',
    tag: 'Simulated Low Risk Case',
    description: 'Crisp acoustic envelope, high signal-to-noise ratio, and synchronous anterior laryngeal elevation.',
    expectedResult: 'LOW_RISK',
    qualitySummary: {
      type: 'quality',
      signal_quality: 'GOOD',
      noise_level: 'LOW',
      motion_baseline: 'STABLE',
      piezo_snr_db: 24.5,
    },
    durationSeconds: 4.0,
    dataPoints: generateWaveformData('normal'),
    screeningRecord: {
      id: 'TEST-DEMO-001',
      patientId: 'PAT-8831',
      patientNameOrInitials: 'R. K. (Demo)',
      patientAge: 64,
      patientAgeGroup: '60–75',
      wardOrRoom: 'ICU Bed 04',
      createdAt: new Date().toISOString(),
      screeningState: 'LOW_RISK',
      signalQuality: 'GOOD',
      operatorNurse: 'Nurse P. Sharma (RN)',
      explainability: {
        signalQuality: 'GOOD',
        piezoEventDetected: true,
        movementEventDetected: true,
        sensorAgreement: 'HIGH',
        swallowDurationMs: 780,
        dominantFrequencyHz: 52,
        spectralFeaturesSummary: 'Normal high-frequency energy dispersion with smooth acoustic decay',
        mlAssessment: 'NORMAL',
        ruleVerification: 'PASS',
        confidenceScorePercent: 93,
        clinicalExplanations: [
          'Swallow event successfully captured within standard acoustic envelope',
          'Piezo acoustic peak and MPU6050 hyoid elevation synchronized within 42ms window',
          'Signal quality and SNR (24.5 dB) exceeded minimum reference criteria',
          'No concerning post-swallow respiratory or turbulence artifact detected',
        ],
      },
      durationSeconds: 4.0,
      recordedDataPointsCount: 80,
      isDemoSimulation: true,
      recommendationText: 'No concerning swallowing pattern was identified during this screening. Routine hydration monitoring recommended.',
    },
  },
  poor_signal: {
    id: 'poor_signal',
    title: 'Clinical Case 2: Sensor Misalignment / Noise Artifact',
    tag: 'Simulated Inconclusive Case',
    description: 'Weak acoustic coupling on throat contact mic and excessive baseline motion artifacts.',
    expectedResult: 'RETEST',
    qualitySummary: {
      type: 'quality',
      signal_quality: 'POOR',
      noise_level: 'HIGH',
      motion_baseline: 'MOVEMENT_DETECTED',
      piezo_snr_db: 5.2,
    },
    durationSeconds: 4.0,
    dataPoints: generateWaveformData('poor_signal'),
    screeningRecord: {
      id: 'TEST-DEMO-002',
      patientId: 'PAT-6190',
      patientNameOrInitials: 'M. S. (Demo)',
      patientAge: 72,
      patientAgeGroup: '60–75',
      wardOrRoom: 'Stroke Unit 12',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      screeningState: 'RETEST',
      signalQuality: 'POOR',
      operatorNurse: 'Nurse P. Sharma (RN)',
      explainability: {
        signalQuality: 'POOR',
        piezoEventDetected: false,
        movementEventDetected: true,
        sensorAgreement: 'DISAGREED',
        swallowDurationMs: 0,
        dominantFrequencyHz: 18,
        spectralFeaturesSummary: 'Indeterminate spectral peaks obscured by broadband noise',
        mlAssessment: 'INCONCLUSIVE',
        ruleVerification: 'NOT_VALIDATED',
        confidenceScorePercent: 38,
        clinicalExplanations: [
          'Signal quality was insufficient to perform reliable feature extraction',
          'Sensor agreement check failed: Piezo acoustic sensor and MPU6050 strongly disagreed',
          'High ambient baseline noise detected; bolus onset could not be isolated',
        ],
        retestReasons: [
          'Poor sensor contact on cricoid cartilage area',
          'Excessive patient motion artifact during recording',
          'Insufficient acoustic energy detected to confirm swallow event',
        ],
      },
      durationSeconds: 4.0,
      recordedDataPointsCount: 80,
      isDemoSimulation: true,
      recommendationText: 'Re-secure 27mm piezo sensor with medical tape, confirm patient is seated still, and repeat screening.',
    },
  },
  abnormal: {
    id: 'abnormal',
    title: 'Clinical Case 3: Prolonged Multi-Phase Swallow Pattern',
    tag: 'Simulated Possible Risk Case',
    description: 'Delayed swallow duration (1680ms), multi-burst acoustic profile, and uncoordinated laryngeal excursion.',
    expectedResult: 'POSSIBLE_RISK',
    qualitySummary: {
      type: 'quality',
      signal_quality: 'GOOD',
      noise_level: 'LOW',
      motion_baseline: 'STABLE',
      piezo_snr_db: 21.0,
    },
    durationSeconds: 4.0,
    dataPoints: generateWaveformData('abnormal'),
    screeningRecord: {
      id: 'TEST-DEMO-003',
      patientId: 'PAT-2044',
      patientNameOrInitials: 'V. A. (Demo)',
      patientAge: 81,
      patientAgeGroup: '76+',
      wardOrRoom: 'Geriatric Ward 08',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      screeningState: 'POSSIBLE_RISK',
      signalQuality: 'GOOD',
      operatorNurse: 'Nurse P. Sharma (RN)',
      explainability: {
        signalQuality: 'GOOD',
        piezoEventDetected: true,
        movementEventDetected: true,
        sensorAgreement: 'MODERATE',
        swallowDurationMs: 1680,
        dominantFrequencyHz: 34,
        spectralFeaturesSummary: 'Bimodal acoustic energy spectrum with protracted low-frequency rumble',
        mlAssessment: 'ABNORMAL',
        ruleVerification: 'FLAG',
        confidenceScorePercent: 88,
        clinicalExplanations: [
          'Swallow duration (1680 ms) significantly exceeded prototype reference envelope (450–1250 ms) [RESEARCH_VALIDATION_REQUIRED]',
          'Multiple fragmented acoustic energy bursts observed indicating non-continuous bolus clearance',
          'Delayed thyroid cartilage return excursion detected by MPU6050 accelerometer',
          'Secondary acoustic vibration identified after primary swallow sequence',
        ],
      },
      durationSeconds: 4.0,
      recordedDataPointsCount: 80,
      isDemoSimulation: true,
      recommendationText: 'Potentially abnormal swallowing characteristics were identified. Further assessment by a qualified clinician or speech-language professional is recommended.',
    },
  },
};
