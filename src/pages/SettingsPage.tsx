import React, { useState } from 'react';
import { useDemo } from '../context/DemoContext';
import { useAuth } from '../context/AuthContext';
import {
  CURRENT_SCREENING_THRESHOLDS,
  DEMOGRAPHIC_HANDLING_POLICY,
} from '../config/thresholds';
import {
  Settings,
  ShieldAlert,
  Server,
  Sliders,
  User,
  Volume2,
  Cpu,
  Info,
  CheckCircle2,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { isDemoMode, setIsDemoMode, selectedDemoCase, setSelectedDemoCase } = useDemo();
  const { user } = useAuth();

  const [soundCues, setSoundCues] = useState(true);
  const [apiUrl, setApiUrl] = useState(
    import.meta.env.VITE_API_URL || 'http://localhost:8000'
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          System Configuration & Validation Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review screening parameters, demo simulation modes, and demographic policies
        </p>
      </div>

      <div className="space-y-6">
        {/* Section 1: Demonstration & Replay Engine */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Simulation & Replay Configuration
                </h2>
                <p className="text-xs text-slate-500">
                  Allows hackathon evaluation without active ESP32 hardware
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isDemoMode}
                onChange={(e) => setIsDemoMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              <span className="ml-2.5 text-xs font-semibold text-slate-700">
                {isDemoMode ? 'Demo Mode Active' : 'Live Hardware Mode'}
              </span>
            </label>
          </div>

          {isDemoMode && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">
                Select Active Replay Dataset:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedDemoCase('normal')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedDemoCase === 'normal'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold text-xs block">Case 1: Normal Swallow</span>
                  <p className="text-[11px] text-slate-500 mt-1">Expected: LOW RISK</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDemoCase('poor_signal')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedDemoCase === 'poor_signal'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold text-xs block">Case 2: Sensor Noise</span>
                  <p className="text-[11px] text-slate-500 mt-1">Expected: RETEST</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDemoCase('abnormal')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedDemoCase === 'abnormal'
                      ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold text-xs block">Case 3: Prolonged Risk</span>
                  <p className="text-[11px] text-slate-500 mt-1">Expected: POSSIBLE RISK</p>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Reference Heuristic Thresholds (Explicitly marked) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Decision Thresholds & Reference Cutoffs
                </h2>
                <p className="text-xs text-slate-500">
                  Configurable research parameters flagged with validation requirements
                </p>
              </div>
            </div>

            <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">
              RESEARCH_VALIDATION_REQUIRED
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <th className="py-2.5 px-3">Parameter Name</th>
                  <th className="py-2.5 px-3">Reference Value</th>
                  <th className="py-2.5 px-3">Purpose</th>
                  <th className="py-2.5 px-3">Clinical Validation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-2.5 px-3 font-semibold">Normal Swallow Duration Min</td>
                  <td className="py-2.5 px-3 font-mono">{CURRENT_SCREENING_THRESHOLDS.normalDurationMinMs} ms</td>
                  <td className="py-2.5 px-3">Detects premature/incomplete swallow bursts</td>
                  <td className="py-2.5 px-3 font-mono text-amber-700 text-[10px]">RESEARCH_VALIDATION_REQUIRED</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">Normal Swallow Duration Max</td>
                  <td className="py-2.5 px-3 font-mono">{CURRENT_SCREENING_THRESHOLDS.normalDurationMaxMs} ms</td>
                  <td className="py-2.5 px-3">Detects delayed bolus transit / residue clearance</td>
                  <td className="py-2.5 px-3 font-mono text-amber-700 text-[10px]">RESEARCH_VALIDATION_REQUIRED</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">Piezo Acoustic Burst Threshold</td>
                  <td className="py-2.5 px-3 font-mono">{CURRENT_SCREENING_THRESHOLDS.piezoPeakDetectionThreshold}</td>
                  <td className="py-2.5 px-3">Detects start of pharyngeal bolus transit sound</td>
                  <td className="py-2.5 px-3 font-mono text-amber-700 text-[10px]">RESEARCH_VALIDATION_REQUIRED</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">Motion Elevation Threshold</td>
                  <td className="py-2.5 px-3 font-mono">{CURRENT_SCREENING_THRESHOLDS.motionElevationThresholdG} g</td>
                  <td className="py-2.5 px-3">Confirms vertical hyolaryngeal displacement</td>
                  <td className="py-2.5 px-3 font-mono text-amber-700 text-[10px]">RESEARCH_VALIDATION_REQUIRED</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">Sensor Disagreement Lag Limit</td>
                  <td className="py-2.5 px-3 font-mono">{CURRENT_SCREENING_THRESHOLDS.maxSensorDisagreementLagMs} ms</td>
                  <td className="py-2.5 px-3">Flags misaligned sensors when sound & motion desync</td>
                  <td className="py-2.5 px-3 font-mono text-amber-700 text-[10px]">RESEARCH_VALIDATION_REQUIRED</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Demographic Policy:</strong> {DEMOGRAPHIC_HANDLING_POLICY.policyNote}
            </p>
          </div>
        </div>

        {/* Section 3: Operator Profile */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Operating Clinician Profile
              </h2>
              <p className="text-xs text-slate-500">
                Active screening nurse credentials for audit signatures
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-semibold text-[10px] uppercase mb-1">
                Name
              </span>
              <span className="font-bold text-slate-800">{user?.name || 'Sister P. Sharma'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold text-[10px] uppercase mb-1">
                Role
              </span>
              <span className="font-semibold text-slate-800">{user?.role || 'Staff Nurse'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold text-[10px] uppercase mb-1">
                Department
              </span>
              <span className="font-semibold text-slate-800">{user?.department || 'Neuro ICU'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
