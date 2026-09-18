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

export const api = {
  // Device Status
  async getDeviceStatus(): Promise<DeviceStatus> {
    if (!IS_DEMO_MODE) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/device/status`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) return await res.json();
      } catch (err) {
        // Fall back to mock
      }
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
    if (!IS_DEMO_MODE) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/patients`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) return await res.json();
      } catch (err) {}
    }
    return getStoredPatients();
  },

  async getPatient(id: string): Promise<Patient | null> {
    if (!IS_DEMO_MODE) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/patients/${id}`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) return await res.json();
      } catch (err) {}
    }
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

    if (!IS_DEMO_MODE) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/patients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPatient),
          signal: AbortSignal.timeout(2000),
        });
        if (res.ok) return await res.json();
      } catch (err) {}
    }

    const patients = getStoredPatients();
    // remove if exists
    const filtered = patients.filter((p) => p.id.toLowerCase() !== payload.id.toLowerCase());
    const updated = [newPatient, ...filtered];
    saveStoredPatients(updated);
    return newPatient;
  },

  // Screening Tests
  async getTests(): Promise<ScreeningRecord[]> {
    if (!IS_DEMO_MODE) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tests`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) return await res.json();
      } catch (err) {}
    }
    return getStoredTests();
  },

  async getTest(testId: string): Promise<ScreeningRecord | null> {
    if (!IS_DEMO_MODE) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tests/${testId}`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) return await res.json();
      } catch (err) {}
    }
    const tests = getStoredTests();
    return tests.find((t) => t.id.toLowerCase() === testId.toLowerCase()) || null;
  },

  async startTest(patientId: string): Promise<{ testId: string }> {
    if (!IS_DEMO_MODE) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tests/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patient_id: patientId }),
          signal: AbortSignal.timeout(2000),
        });
        if (res.ok) return await res.json();
      } catch (err) {}
    }
    const generatedId = `TEST-${Math.floor(1000 + Math.random() * 9000)}`;
    return { testId: generatedId };
  },

  async finishTest(testId: string, record: ScreeningRecord): Promise<ScreeningRecord> {
    if (!IS_DEMO_MODE) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tests/${testId}/finish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
          signal: AbortSignal.timeout(2000),
        });
        if (res.ok) return await res.json();
      } catch (err) {}
    }

    const tests = getStoredTests();
    const updated = [record, ...tests.filter((t) => t.id !== record.id)];
    saveStoredTests(updated);

    // Update patient's last screening
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
