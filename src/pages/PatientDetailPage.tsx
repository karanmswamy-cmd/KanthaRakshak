import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Patient } from '../types/patient';
import { ScreeningRecord } from '../types/screening';
import { ScreeningResultBadge } from '../components/common/ScreeningResultBadge';
import { SignalQualityBadge } from '../components/common/SignalQualityBadge';
import {
  ArrowLeft,
  User,
  PlusCircle,
  Clock,
  Calendar,
  FileText,
  Activity,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { DEMO_SESSIONS } from '../services/demoData';

export const PatientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [screenings, setScreenings] = useState<ScreeningRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const [p, allTests] = await Promise.all([api.getPatient(id), api.getTests()]);
        setPatient(p);
        const patientTests = allTests.filter(
          (t) => t.patientId.toLowerCase() === id.toLowerCase()
        );
        setScreenings(patientTests);
      } catch (e) {
        console.error('Failed to load patient details', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500">Loading patient dossier...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="py-16 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-sm font-semibold text-slate-800">Patient not found: {id}</p>
        <Link
          to="/patients"
          className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-teal-700 underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Patients Directory</span>
        </Link>
      </div>
    );
  }

  // Pre-generate miniature sample waveform data for visualization
  const miniWaveform = DEMO_SESSIONS.normal.dataPoints.slice(0, 40).map((d) => ({
    time: (d.timestamp / 1000).toFixed(2),
    piezo: d.piezo,
    accel: d.accel_magnitude,
  }));

  return (
    <div className="space-y-6">
      {/* Back button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            to="/patients"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {patient.nameOrInitials} ({patient.id})
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {patient.ageGroup}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ward: {patient.wardOrRoom || 'Unassigned'} • Registered:{' '}
              {new Date(patient.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <Link
          to={`/test/setup?patientId=${patient.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Initiate New Screening</span>
        </Link>
      </div>

      {/* Patient Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-400 block font-semibold text-[10px] uppercase">
            Chronological Age
          </span>
          <span className="font-bold text-slate-800 text-sm">{patient.age} Years</span>
        </div>
        <div>
          <span className="text-slate-400 block font-semibold text-[10px] uppercase">
            Biological Sex
          </span>
          <span className="font-semibold text-slate-800 text-sm">{patient.sex || 'Not stated'}</span>
        </div>
        <div>
          <span className="text-slate-400 block font-semibold text-[10px] uppercase">
            Screening Surveillance Count
          </span>
          <span className="font-bold text-teal-700 text-sm">
            {screenings.length} Screenings
          </span>
        </div>
        <div>
          <span className="text-slate-400 block font-semibold text-[10px] uppercase">
            Clinical Notes
          </span>
          <span className="text-slate-700 text-xs truncate block">
            {patient.admissionNotes || 'Standard referral'}
          </span>
        </div>
      </div>

      {/* Longitudinal Screening Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Screening Timeline ({screenings.length})
          </h2>
          <span className="text-xs text-slate-500">Most recent first</span>
        </div>

        {screenings.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No screenings recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Start a new screening session to generate sensor waveforms.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {screenings.map((screening) => (
              <div
                key={screening.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4"
              >
                {/* Header of each screening session */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {screening.id}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(screening.createdAt).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Operator: {screening.operatorNurse}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <SignalQualityBadge quality={screening.signalQuality} size="sm" />
                    <ScreeningResultBadge state={screening.screeningState} size="sm" />
                    <Link
                      to={`/reports?testId=${screening.id}`}
                      className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Report</span>
                    </Link>
                  </div>
                </div>

                {/* Miniature Sensor Charts (Piezo + MPU6050) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Miniature Piezo Chart */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Throat Acoustic Vibration (27mm Piezo)
                    </span>
                    <div className="h-24 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={miniWaveform}>
                          <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" />
                          <YAxis domain={[-0.5, 0.8]} hide />
                          <Line
                            type="monotone"
                            dataKey="piezo"
                            stroke="#10b981"
                            strokeWidth={1.5}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Miniature Movement Chart */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Laryngeal Kinematics (MPU6050 |a|)
                    </span>
                    <div className="h-24 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={miniWaveform}>
                          <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" />
                          <YAxis domain={[0.8, 1.4]} hide />
                          <Line
                            type="monotone"
                            dataKey="accel"
                            stroke="#0d9488"
                            strokeWidth={1.5}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Analysis summary & explanations */}
                <div className="p-3.5 rounded-lg bg-teal-50/40 border border-teal-100 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-teal-950 mb-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-teal-700" />
                    <span>Analysis Summary & Heuristics</span>
                  </div>
                  <ul className="text-slate-700 text-[11px] space-y-1 list-disc list-inside">
                    {screening.explainability.clinicalExplanations.map((exp, idx) => (
                      <li key={idx}>{exp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
