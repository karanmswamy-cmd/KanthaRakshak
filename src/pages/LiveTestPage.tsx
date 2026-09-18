import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Patient } from '../types/patient';
import {
  SensorDataPoint,
  QualityPacket,
  SwallowEventPacket,
  AnalysisCompletePacket,
  SignalQualityLevel,
  NoiseLevel,
  SensorAgreementLevel,
} from '../types/sensor';
import { TelemetryStreamService } from '../services/websocket';
import { DEMO_SESSIONS } from '../services/demoData';
import { TestProgress, GuidedStage } from '../components/test/TestProgress';
import { LiveWaveform } from '../components/test/LiveWaveform';
import { SensorAgreementCard } from '../components/test/SensorAgreementCard';
import { ShieldCheck, User } from 'lucide-react';

export const LiveTestPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get('testId') || `TEST-${Math.floor(1000 + Math.random() * 9000)}`;
  const patientId = searchParams.get('patientId') || 'PAT-8831';

  const { isDemoMode, selectedDemoCase } = useDemo();
  const { user } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(null);

  // Guided Stages & Countdown
  const [currentStage, setCurrentStage] = useState<GuidedStage>('PREPARE');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  // Live Telemetry Stream State
  const [waveformData, setWaveformData] = useState<SensorDataPoint[]>([]);
  const [signalQuality, setSignalQuality] = useState<SignalQualityLevel>('GOOD');
  const [noiseLevel, setNoiseLevel] = useState<NoiseLevel>('LOW');
  const [swallowDetected, setSwallowDetected] = useState<boolean>(false);
  const [sensorAgreement, setSensorAgreement] = useState<SensorAgreementLevel>('HIGH');
  const [packetRateHz, setPacketRateHz] = useState<number>(50);
  const [statusMessage, setStatusMessage] = useState<string>('Preparing subject...');
  const [connectionMode, setConnectionMode] = useState<'LIVE_HARDWARE' | 'DEMO_REPLAY'>('DEMO_REPLAY');

  const streamRef = useRef<TelemetryStreamService | null>(null);
  const stageTimerRef = useRef<number | null>(null);

  // Fetch patient profile
  useEffect(() => {
    async function loadPatient() {
      const p = await api.getPatient(patientId);
      if (p) setPatient(p);
    }
    loadPatient();
  }, [patientId]);

  // Orchestrate Clinical Guided Stages (1. Prepare -> 2. Ready -> 3. Start -> 4. Swallow 3-2-1 -> 5. Recording -> 6. Processing -> Result)
  useEffect(() => {
    // Stage 1: PREPARE (2.5 seconds)
    setStatusMessage('Instructing subject to sit upright and remain still...');
    stageTimerRef.current = window.setTimeout(() => {
      // Stage 2: READY (2.5 seconds)
      setCurrentStage('READY');
      setStatusMessage('Preparing 5 mL ambient water bolus sample...');

      stageTimerRef.current = window.setTimeout(() => {
        // Stage 3: START (2 seconds)
        setCurrentStage('START');
        setStatusMessage('Instructing subject to take sip and hold...');

        stageTimerRef.current = window.setTimeout(() => {
          // Stage 4: SWALLOW with 3-2-1 Countdown
          setCurrentStage('SWALLOW');
          setCountdown(3);
          setStatusMessage('Swallow countdown: 3...');

          const c2 = window.setTimeout(() => {
            setCountdown(2);
            setStatusMessage('Swallow countdown: 2...');
          }, 1000);

          const c1 = window.setTimeout(() => {
            setCountdown(1);
            setStatusMessage('Swallow normally now!');
          }, 2000);

          const cStart = window.setTimeout(() => {
            setCountdown(null);
            // Stage 5: RECORDING
            setCurrentStage('RECORDING');
            setStatusMessage('Capturing acoustic vibration and laryngeal elevation...');
            startTelemetryStream();
          }, 3000);

          return () => {
            clearTimeout(c2);
            clearTimeout(c1);
            clearTimeout(cStart);
          };
        }, 2200);
      }, 2500);
    }, 2200);

    return () => {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
      if (streamRef.current) streamRef.current.disconnect();
    };
  }, []);

  // Handle telemetry streaming
  const startTelemetryStream = () => {
    const stream = new TelemetryStreamService(testId, {
      forceDemo: isDemoMode,
      demoCase: selectedDemoCase,
    });
    streamRef.current = stream;

    stream.onConnectionState((connected, mode) => {
      setConnectionMode(mode);
    });

    stream.onData((pt) => {
      setWaveformData((prev) => [...prev, pt]);
      setElapsedSec(pt.timestamp / 1000);
    });

    stream.onQuality((q) => {
      setSignalQuality(q.signal_quality);
      setNoiseLevel(q.noise_level);
      if (q.signal_quality === 'POOR') {
        setSensorAgreement('DISAGREED');
        setStatusMessage('Sensor disagreement / excessive noise detected');
      }
    });

    stream.onSwallowEvent((ev) => {
      if (ev.detected) {
        setSwallowDetected(true);
        setStatusMessage('Swallow event captured! Tracking bolus clearance...');
      }
    });

    stream.onAnalysisComplete(async (complete) => {
      // Stage 6: PROCESSING
      setCurrentStage('PROCESSING');
      setStatusMessage('Dual-sensor signal agreement & rule verification in progress...');

      const session = DEMO_SESSIONS[selectedDemoCase];
      const patientRecord = patient || {
        id: patientId,
        nameOrInitials: 'Subject',
        age: 65,
        ageGroup: '60–75',
        wardOrRoom: 'Ward 4',
      };

      const finalRecord = {
        ...session.screeningRecord,
        id: testId,
        patientId: patientRecord.id,
        patientNameOrInitials: patientRecord.nameOrInitials,
        patientAge: patientRecord.age,
        patientAgeGroup: patientRecord.ageGroup,
        wardOrRoom: patientRecord.wardOrRoom,
        createdAt: new Date().toISOString(),
        operatorNurse: user?.name || 'Staff Nurse',
        isDemoSimulation: isDemoMode,
      };

      await api.finishTest(testId, finalRecord);

      // Transition to Result page after short processing animation
      setTimeout(() => {
        navigate(`/test/result/${testId}`);
      }, 1500);
    });

    stream.connect();
  };

  const handleCancelTest = () => {
    if (streamRef.current) streamRef.current.disconnect();
    navigate('/dashboard');
  };

  const handleRepeatTest = () => {
    if (streamRef.current) streamRef.current.disconnect();
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Patient Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Live Swallow Screening Test
            </h1>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {testId}
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
              {connectionMode === 'LIVE_HARDWARE' ? 'Live Hardware Active' : 'Demo Replay Stream'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-modal acoustic and motion signal acquisition
          </p>
        </div>

        {patient && (
          <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
            <div className="w-7 h-7 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900">
                {patient.nameOrInitials} ({patient.id})
              </span>
              <p className="text-[11px] text-slate-500">
                {patient.age} yrs • {patient.ageGroup} • {patient.wardOrRoom}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Guided Stage Stepper & Instructions */}
      <TestProgress
        currentStage={currentStage}
        countdown={countdown}
        elapsedSeconds={elapsedSec}
        totalDurationSeconds={4.0}
        onCancel={handleCancelTest}
        onRepeat={handleRepeatTest}
      />

      {/* Main Row: Waveform Charts (Left) & Telemetry Metrics (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <LiveWaveform
            data={waveformData}
            swallowDetected={swallowDetected}
          />
        </div>

        <div className="lg:col-span-4 space-y-4">
          <SensorAgreementCard
            signalQuality={signalQuality}
            noiseLevel={noiseLevel}
            swallowDetected={swallowDetected}
            sensorAgreement={sensorAgreement}
            recordingDurationSec={elapsedSec}
            packetRateHz={packetRateHz}
            statusMessage={statusMessage}
          />

          {/* Clinical protocol note */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Clinical Guardrail:</strong> Signals are acquired for feature extraction and verification only. No diagnostic determination is rendered during recording.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
