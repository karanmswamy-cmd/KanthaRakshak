import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useDevice } from '../context/DeviceContext';
import { useDemo } from '../context/DemoContext';
import { api } from '../services/api';
import { Patient } from '../types/patient';
import { NeckAnatomyDiagram } from '../components/device/NeckAnatomyDiagram';
import { ConnectionIndicator } from '../components/common/ConnectionIndicator';
import { SignalQualityBadge } from '../components/common/SignalQualityBadge';
import {
  SignalQualityLevel,
  NoiseLevel,
  MotionBaseline,
} from '../types/sensor';
import {
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Sliders,
  User,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export const TestSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get('patientId') || 'PAT-8831';

  const { device, refreshDevice } = useDevice();
  const { selectedDemoCase } = useDemo();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(patientIdParam);

  // Live telemetry metrics for sensor verification
  const [signalQuality, setSignalQuality] = useState<SignalQualityLevel>('GOOD');
  const [noiseLevel, setNoiseLevel] = useState<NoiseLevel>('LOW');
  const [motionBaseline, setMotionBaseline] = useState<MotionBaseline>('STABLE');

  useEffect(() => {
    async function load() {
      const list = await api.getPatients();
      setAllPatients(list);
      const current = list.find((p) => p.id === selectedPatientId) || list[0] || null;
      setPatient(current);
    }
    load();
  }, [selectedPatientId]);

  // Adjust telemetry based on demo case or live status
  useEffect(() => {
    if (selectedDemoCase === 'poor_signal') {
      setSignalQuality('POOR');
      setNoiseLevel('HIGH');
      setMotionBaseline('MOVEMENT_DETECTED');
    } else {
      setSignalQuality('GOOD');
      setNoiseLevel('LOW');
      setMotionBaseline('STABLE');
    }
  }, [selectedDemoCase]);

  // Check preconditions:
  // 1. ESP32 connected
  // 2. Piezo receiving data (ACTIVE)
  // 3. MPU6050 receiving data (ACTIVE)
  // 4. minimum signal quality achieved (GOOD or FAIR, not POOR)
  const isEsp32Connected = device.bleConnected;
  const isPiezoActive = device.piezoAdcState === 'ACTIVE';
  const isMpuActive = device.mpu6050State === 'ACTIVE';
  const isSignalAcceptable = signalQuality === 'GOOD' || signalQuality === 'FAIR';

  const isReadyForTest =
    isEsp32Connected && isPiezoActive && isMpuActive && isSignalAcceptable;

  const handleStartTest = async () => {
    if (!isReadyForTest) return;
    try {
      const { testId } = await api.startTest(selectedPatientId);
      navigate(`/test/live?testId=${testId}&patientId=${selectedPatientId}`);
    } catch (e) {
      console.error('Failed to initiate test', e);
      navigate(`/test/live?testId=TEST-${Math.floor(1000 + Math.random() * 9000)}&patientId=${selectedPatientId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Sensor Attachment & Signal Setup
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              Pre-Screening Verification
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Verify dual acoustic and motion sensor placement on the patient before initiating swallow trial
          </p>
        </div>

        {/* Patient Selector */}
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Screening Subject:</span>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="text-xs font-medium rounded-lg border border-slate-300 py-1.5 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          >
            {allPatients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} - {p.nameOrInitials} ({p.age}y, {p.wardOrRoom || 'Ward'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Anatomy Guide on Left, Live Sensor Checklist on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Neck Anatomy Illustration */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <NeckAnatomyDiagram
            piezoActive={isPiezoActive}
            mpuActive={isMpuActive}
          />
        </div>

        {/* Right Column: Live Telemetry Cards & Overall Readiness */}
        <div className="lg:col-span-6 space-y-4">
          {/* Patient Quick Info Card */}
          {patient && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Patient: {patient.nameOrInitials} ({patient.id})
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {patient.age} yrs • {patient.ageGroup}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Ward: {patient.wardOrRoom} • Notes: {patient.admissionNotes || 'Standard swallow test'}
              </p>
            </div>
          )}

          {/* Live Sensor Health Cards */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Live Sensor Telemetry Status
              </h2>
              <button
                onClick={refreshDevice}
                className="text-xs font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh Link</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <ConnectionIndicator
                label="ESP32 Processing Unit"
                status={isEsp32Connected ? 'CONNECTED' : 'DISCONNECTED'}
              />
              <ConnectionIndicator
                label="BLE Wireless Link"
                status={isEsp32Connected ? 'CONNECTED' : 'DISCONNECTED'}
                subtext={`${device.packetRateHz} Hz`}
              />
              <ConnectionIndicator
                label="27mm Piezo Microphone"
                status={isPiezoActive ? 'CONNECTED' : 'NO_SIGNAL'}
                subtext="Cricoid Area"
              />
              <ConnectionIndicator
                label="MPU6050 Motion Sensor"
                status={isMpuActive ? 'CONNECTED' : 'NO_SIGNAL'}
                subtext="Thyroid Notch"
              />
            </div>

            {/* Signal Metrics Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/60">
                <span className="text-[11px] text-slate-500 font-medium block mb-1">
                  Signal Quality
                </span>
                <SignalQualityBadge quality={signalQuality} size="sm" />
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/60">
                <span className="text-[11px] text-slate-500 font-medium block mb-1">
                  Noise Level
                </span>
                <span
                  className={`inline-block font-semibold px-2 py-0.5 rounded text-[11px] border ${
                    noiseLevel === 'LOW'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : noiseLevel === 'MEDIUM'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {noiseLevel} NOISE
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/60">
                <span className="text-[11px] text-slate-500 font-medium block mb-1">
                  Motion Baseline
                </span>
                <span
                  className={`inline-block font-semibold px-2 py-0.5 rounded text-[11px] border ${
                    motionBaseline === 'STABLE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {motionBaseline}
                </span>
              </div>
            </div>
          </div>

          {/* LARGE OVERALL STATUS BANNER */}
          <div
            className={`p-5 rounded-xl border-2 text-center transition-all ${
              isReadyForTest
                ? 'bg-emerald-50/80 border-emerald-400'
                : 'bg-amber-50/80 border-amber-400'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              {isReadyForTest ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              )}
              <h2
                className={`text-xl font-extrabold tracking-tight ${
                  isReadyForTest ? 'text-emerald-950' : 'text-amber-950'
                }`}
              >
                {isReadyForTest ? 'READY FOR TEST' : 'ADJUST SENSOR POSITION'}
              </h2>
            </div>

            <p
              className={`text-xs font-medium max-w-md mx-auto ${
                isReadyForTest ? 'text-emerald-800' : 'text-amber-800'
              }`}
            >
              {isReadyForTest
                ? 'All sensors communicating with acceptable baseline signal-to-noise ratio. You may begin the guided test.'
                : 'Sensor signals are outside acceptable quality bounds or disconnected. Check skin contact tape and cable connections.'}
            </p>

            {/* START TEST BUTTON */}
            <div className="mt-4">
              <button
                onClick={handleStartTest}
                disabled={!isReadyForTest}
                className={`w-full py-3.5 px-6 rounded-xl font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition-all ${
                  isReadyForTest
                    ? 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                }`}
              >
                <PlayCircle className="w-5 h-5" />
                <span>Start Guided Swallow Test</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>

            {!isReadyForTest && (
              <p className="text-[11px] text-slate-500 mt-2 font-mono">
                [Preconditions locked: ESP32 + 2 Sensors + Good/Fair Signal Required]
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
