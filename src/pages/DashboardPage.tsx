import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Patient } from '../types/patient';
import { ScreeningRecord } from '../types/screening';
import { DeviceStatusCard } from '../components/device/DeviceStatusCard';
import { PatientTable } from '../components/patients/PatientTable';
import {
  Activity,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  PlusCircle,
  FileSpreadsheet,
  Clock,
  HeartHandshake,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tests, setTests] = useState<ScreeningRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [patientsData, testsData] = await Promise.all([
          api.getPatients(),
          api.getTests(),
        ]);
        setPatients(patientsData);
        setTests(testsData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute summary stats
  const totalTestsCount = tests.length;
  const lowRiskCount = tests.filter((t) => t.screeningState === 'LOW_RISK').length;
  const retestsCount = tests.filter((t) => t.screeningState === 'RETEST').length;
  const possibleRiskCount = tests.filter((t) => t.screeningState === 'POSSIBLE_RISK').length;

  return (
    <div className="space-y-6">
      {/* Header with Title and Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Clinical Screening Dashboard
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              Station Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Non-invasive cervical acoustic and kinematic bolus transit screening
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/patients/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Register Patient</span>
          </Link>
          <Link
            to="/test/setup"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Activity className="w-4 h-4" />
            <span>+ Start New Screening</span>
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tests Today */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Screenings Recorded
            </span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {totalTestsCount}
            </span>
            <span className="text-xs font-medium text-slate-500">tests</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">All hospital units</p>
        </div>

        {/* Card 2: Low Risk */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Low Risk
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
              {lowRiskCount}
            </span>
            <span className="text-xs font-semibold text-emerald-700">
              ({totalTestsCount > 0 ? Math.round((lowRiskCount / totalTestsCount) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-1">Within expected envelope</p>
        </div>

        {/* Card 3: Retests */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Retests
            </span>
            <RotateCcw className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-950">
              {retestsCount}
            </span>
            <span className="text-xs font-semibold text-amber-700">
              ({totalTestsCount > 0 ? Math.round((retestsCount / totalTestsCount) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-amber-700 mt-1">Noise / sensor misalignment</p>
        </div>

        {/* Card 4: Possible Risk */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">
              Possible Risk
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-950">
              {possibleRiskCount}
            </span>
            <span className="text-xs font-semibold text-rose-700">
              ({totalTestsCount > 0 ? Math.round((possibleRiskCount / totalTestsCount) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-rose-700 mt-1">Specialist evaluation flagged</p>
        </div>
      </div>

      {/* Main Row: Device & Hardware Bridge Card + Quick Action Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <DeviceStatusCard />
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h2 className="text-sm font-bold text-slate-900">
                Screening Protocol & Instructions
              </h2>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Hospital SOP
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-bold text-teal-800 block mb-1">1. Patient Position</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Patient seated at 90° upright. Ensure neck is free of clothing collars.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-bold text-teal-800 block mb-1">2. Dual Sensors</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Apply 27mm piezo to lateral cricoid ring; MPU6050 to thyroid notch midline.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-bold text-teal-800 block mb-1">3. Water Bolus</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Administer 5 mL ambient water sample via spoon. Initiate guided test.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Standard screening duration: 4.0 seconds</span>
            </div>
            <Link
              to="/test/setup"
              className="text-xs font-bold text-teal-700 hover:text-teal-800 underline"
            >
              Verify Sensor Attachment &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Screenings Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Screening Tests</h2>
            <p className="text-xs text-slate-500">Latest recordings across patient cohort</p>
          </div>
          <Link
            to="/history"
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 underline"
          >
            View Complete Screening Log
          </Link>
        </div>

        <PatientTable patients={patients} recentTests={tests} />
      </div>
    </div>
  );
};
