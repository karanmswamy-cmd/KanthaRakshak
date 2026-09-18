import { Patient, deriveAgeGroup } from '../types/patient';
import { ScreeningRecord } from '../types/screening';
import { DeviceStatus } from '../types/device';
import { DEMO_SESSIONS } from './demoData';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== 'false';

// Default mock initial patients
const INITIAL_MOCK_PATIENTS: Patient[] = [
  {
    id: 'PAT-8831',
    nameOrInitials: 'R. K.',
    age: 64,
    ageGroup: '60–75',
    sex: 'Male',
    wardOrRoom: 'ICU Bed 04',
    admissionNotes: 'Post-extubation monitoring, clear fluids order pending.',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    lastScreeningAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    screeningCount: 2,
  },
  {
    id: 'PAT-6190',
    nameOrInitials: 'M. S.',
    age: 72,
    ageGroup: '60–75',
    sex: 'Female',
    wardOrRoom: 'Stroke Unit 12',
    admissionNotes: 'Day 3 post-ischemic stroke; speech therapy baseline evaluation requested.',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    lastScreeningAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    screeningCount: 3,
  },
  {
    id: 'PAT-2044',
    nameOrInitials: 'V. A.',
    age: 81,
    ageGroup: '76+',
    sex: 'Male',
    wardOrRoom: 'Geriatric Ward 08',
    admissionNotes: 'History of recurrent aspiration pneumonia; regular swallowing screening protocol.',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    lastScreeningAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    screeningCount: 4,
  },
  {
    id: 'PAT-5012',
    nameOrInitials: 'S. T.',
    age: 34,
    ageGroup: '18–39',
    sex: 'Female',
    wardOrRoom: 'Ward 3A - Bed 14',
    admissionNotes: 'Trauma recovery post-C-spine clearance; baseline swallow check.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    lastScreeningAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    screeningCount: 1,
  },
  {
    id: 'PAT-9092',
    nameOrInitials: 'D. J.',
    age: 55,
    ageGroup: '40–59',
    sex: 'Male',
    wardOrRoom: 'Post-Op Room 02',
    admissionNotes: 'Post-anterior cervical discectomy; pre-discharge swallow evaluation.',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    lastScreeningAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    screeningCount: 2,
  },
];

// Initial mock device status
let mockDeviceStatus: DeviceStatus = {
  esp32Id: 'ESP32-SWALLOW-01',
  bleConnected: true,
  bleDeviceName: 'KanthaRakshak-Bridge-B4E2',
  firmwareVersion: 'v1.4.2-hackathon',
  batteryPercentage: 88,
  isCharging: false,
  packetRateHz: 50,
  lastPacketTimestamp: new Date().toISOString(),
  piezoAdcState: 'ACTIVE',
  mpu6050State: 'ACTIVE',
  overallStatus: 'READY',
};

// In-memory or localStorage store
function getStoredPatients(): Patient[] {
  try {
    const data = localStorage.getItem('kantha_patients');
    if (data) return JSON.parse(data);
  } catch (e) {
    // fallback
  }
  return INITIAL_MOCK_PATIENTS;
}

function saveStoredPatients(patients: Patient[]) {
  try {
    localStorage.setItem('kantha_patients', JSON.stringify(patients));
  } catch (e) {}
}

function getStoredTests(): ScreeningRecord[] {
  try {
    const data = localStorage.getItem('kantha_tests');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return [
    DEMO_SESSIONS.normal.screeningRecord,
    DEMO_SESSIONS.poor_signal.screeningRecord,
    DEMO_SESSIONS.abnormal.screeningRecord,
  ];
}

function saveStoredTests(tests: ScreeningRecord[]) {
  try {
    localStorage.setItem('kantha_tests', JSON.stringify(tests));
  } catch (e) {}
}

function mapBackendPatient(p: any): Patient {
  return {
    id: p.id,
    nameOrInitials: p.name || p.nameOrInitials,
    age: p.age,
    ageGroup: p.age_group || deriveAgeGroup(p.age),
    sex: p.sex || 'Prefer not to say',
    wardOrRoom: p.ward || '',
    admissionNotes: p.admission_notes || '',
    createdAt: p.created_at || new Date().toISOString(),
    lastScreeningAt: p.last_screening_at,
    screeningCount: p.screening_count || 0,
  };
}

function mapBackendTest(t: any): ScreeningRecord {
  const finalState = (t.final_result || 'LOW_RISK') as 'LOW_RISK' | 'RETEST' | 'POSSIBLE_RISK';
  return {
    id: t.id,
    patientId: t.patient_id,
    patientNameOrInitials: t.patient_name || 'Patient',
    patientAge: t.patient_age || 65,
    patientAgeGroup: t.patient_age_group || '60–75',
    wardOrRoom: t.ward || 'Clinical Ward',
    createdAt: t.started_at || new Date().toISOString(),
    screeningState: finalState,
    signalQuality: t.signal_quality || 'GOOD',
    operatorNurse: 'K. Swamy (RN)',
    explainability: {
      signalQuality: t.signal_quality || 'GOOD',
      piezoEventDetected: t.piezo_detected ?? true,
      movementEventDetected: t.motion_detected ?? true,
      sensorAgreement: t.sensor_agreement || 'HIGH',
      swallowDurationMs: t.swallow_duration ?? 750,
      dominantFrequencyHz: t.dominant_frequency ?? 12.5,
      spectralFeaturesSummary: `${t.spectral_peak_count || 2} spectral bursts identified`,
      mlAssessment: t.ml_prediction || (finalState === 'POSSIBLE_RISK' ? 'ABNORMAL' : 'NORMAL'),
      ruleVerification: t.rule_result === 'PASS' ? 'PASS' : 'FLAG',
      confidenceScorePercent: t.ml_probability ? Math.round(t.ml_probability * 100) : 85,
      clinicalExplanations: Array.isArray(t.explanation) ? t.explanation : (t.explanation ? [t.explanation] : []),
      retestReasons: finalState === 'RETEST' ? (Array.isArray(t.explanation) ? t.explanation : []) : undefined,
    },
    durationSeconds: 5,
    recordedDataPointsCount: 250,
    isDemoSimulation: false,
    recommendationText: t.recommendation || 'Screening result only – not a medical diagnosis.',
  };
}

export const api = {
  // Base URL & PDF Download URL
  getBaseUrl(): string {
    return API_BASE_URL;
  },

  getReportPdfUrl(testId: string): string {
    return `${API_BASE_URL}/api/reports/${testId}?format=pdf`;
  },

  // Device Status
  async getDeviceStatus(): Promise<DeviceStatus> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/device/status`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        return {
          esp32Id: data.esp32_id || 'ESP32-SWALLOW-01',
          bleConnected: data.ble_connected ?? false,
          bleDeviceName: data.ble_device_name || 'KanthaRakshak-BLE',
          firmwareVersion: data.firmware_version || 'v1.4.2-hackathon',
          batteryPercentage: data.battery_percentage ?? 88,
          isCharging: data.is_charging ?? false,
          packetRateHz: data.packet_rate_hz ?? 50,
          lastPacketTimestamp: data.last_packet_timestamp || new Date().toISOString(),
          piezoAdcState: (data.piezo_adc_state || 'ACTIVE') as any,
          mpu6050State: (data.mpu6050_state || 'ACTIVE') as any,
          overallStatus: (data.overall_status === 'DISCONNECTED' ? 'DISCONNECTED' : data.overall_status === 'WARNING' ? 'WARNING' : 'READY') as any,
        };
      }
    } catch (err) {
      // Fall back to mock
    }
    return {
      ...mockDeviceStatus,
      lastPacketTimestamp: new Date().toISOString(),
    };
  },

  async updateMockDeviceStatus(partial: Partial<DeviceStatus>): Promise<DeviceStatus> {
    mockDeviceStatus = { ...mockDeviceStatus, ...partial };
    return mockDeviceStatus;
  },

  // Patients
  async getPatients(): Promise<Patient[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/patients`, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map(mapBackendPatient);
        }
      }
    } catch (err) {
      console.warn('Backend patients API unreachable, using local store', err);
    }
    return getStoredPatients();
  },

  async getPatient(id: string): Promise<Patient | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/patients/${id}`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        return mapBackendPatient(data);
      }
    } catch (err) {}
    const patients = getStoredPatients();
    return patients.find((p) => p.id.toLowerCase() === id.toLowerCase()) || null;
  },

  async createPatient(payload: {
    id: string;
    nameOrInitials: string;
    age: number;
    sex?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
    wardOrRoom?: string;
    admissionNotes?: string;
  }): Promise<Patient> {
    const ageGroup = deriveAgeGroup(payload.age);
    const newPatient: Patient = {
      ...payload,
      ageGroup,
      createdAt: new Date().toISOString(),
      screeningCount: 0,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payload.id,
          name: payload.nameOrInitials,
          age: payload.age,
          sex: payload.sex || 'Prefer not to say',
          ward: payload.wardOrRoom || '',
        }),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        return mapBackendPatient(data);
      }
    } catch (err) {
      console.warn('Failed to persist patient to backend, using local store', err);
    }

    const patients = getStoredPatients();
    const filtered = patients.filter((p) => p.id.toLowerCase() !== payload.id.toLowerCase());
    const updated = [newPatient, ...filtered];
    saveStoredPatients(updated);
    return newPatient;
  },

  // Screening Tests
  async getTests(): Promise<ScreeningRecord[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tests`, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map(mapBackendTest);
        }
      }
    } catch (err) {
      console.warn('Backend tests API unreachable, using local store', err);
    }
    return getStoredTests();
  },

  async getTest(testId: string): Promise<ScreeningRecord | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tests/${testId}`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        return mapBackendTest(data);
      }
    } catch (err) {}
    const tests = getStoredTests();
    return tests.find((t) => t.id.toLowerCase() === testId.toLowerCase()) || null;
  },

  async startTest(patientId: string): Promise<{ testId: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tests/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId }),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        return { testId: data.test_id };
      }
    } catch (err) {
      console.warn('Failed to start test on backend, generating local ID', err);
    }
    const generatedId = `TEST-${Math.floor(1000 + Math.random() * 9000)}`;
    return { testId: generatedId };
  },

  async finishTest(testId: string, record: ScreeningRecord): Promise<ScreeningRecord> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tests/${testId}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          force_result: record.screeningState,
          operator_notes: `Operator: ${record.operatorNurse}`,
        }),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        return mapBackendTest(data);
      }
    } catch (err) {
      console.warn('Backend finish test error, saving locally', err);
    }

    const tests = getStoredTests();
    const updated = [record, ...tests.filter((t) => t.id !== record.id)];
    saveStoredTests(updated);

    const patients = getStoredPatients();
    const patientIndex = patients.findIndex((p) => p.id === record.patientId);
    if (patientIndex >= 0) {
      patients[patientIndex].lastScreeningAt = record.createdAt;
      patients[patientIndex].screeningCount += 1;
      saveStoredPatients(patients);
    }

    return record;
  },

  async getReport(testId: string): Promise<ScreeningRecord | null> {
    return this.getTest(testId);
  },
};
