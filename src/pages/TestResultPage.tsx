import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ScreeningRecord } from '../types/screening';
import { ScreeningResult } from '../components/results/ScreeningResult';
import { ExplainabilityPanel } from '../components/results/ExplainabilityPanel';
import {
  FileText,
  RotateCcw,
  ArrowLeft,
  User,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export const TestResultPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [record, setRecord] = useState<ScreeningRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadResult() {
      if (!testId) return;
      try {
        const res = await api.getTest(testId);
        setRecord(res);
      } catch (err) {
        console.error('Failed to load test result', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadResult();
  }, [testId]);

  const handleRepeatTest = () => {
    if (!record) return;
    navigate(`/test/setup?patientId=${record.patientId}`);
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading screening evaluation...</p>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="py-16 text-center bg-white rounded-xl border border-slate-200">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-slate-900">Screening Record Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">
          No test record was found matching ID: {testId}
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-teal-700 underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar with Patient & Date Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Screening Outcome & Verification
            </h1>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {record.id}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Completed on {new Date(record.createdAt).toLocaleString()} by {record.operatorNurse}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRepeatTest}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Repeat Test</span>
          </button>
          <Link
            to={`/reports?testId=${record.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generate Clinical Report</span>
          </Link>
        </div>
      </div>

      {/* Patient Demographic Summary Card */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
            <User className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm">
              Patient: {record.patientNameOrInitials || record.patientId}
            </span>
            <p className="text-slate-500 text-[11px]">
              ID: {record.patientId} • Ward: {record.wardOrRoom || 'Unspecified'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Age Cohort
            </span>
            <span className="font-semibold text-slate-800">
              {record.patientAge} yrs ({record.patientAgeGroup})
            </span>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Recording Duration
            </span>
            <span className="font-semibold text-slate-800">
              {record.durationSeconds.toFixed(1)}s (80 data frames)
            </span>
          </div>
        </div>
      </div>

      {/* 1. Large 3-State Outcome Display */}
      <ScreeningResult
        state={record.screeningState}
        retestReasons={record.explainability.retestReasons}
        onRepeatTest={handleRepeatTest}
        testId={record.id}
      />

      {/* 2. Transparent Explainability Panel */}
      <ExplainabilityPanel explainability={record.explainability} />

      {/* Mandatory Prototype Disclaimer Bar */}
      <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-slate-800">Clinical Regulatory Context:</span>
          <p className="mt-0.5 text-slate-600">
            KanthaRakshak is an investigational screening and decision-support prototype. It does not replace fiberoptic endoscopic evaluation of swallowing (FEES) or videofluoroscopic swallowing studies (VFSS).
          </p>
        </div>
      </div>
    </div>
  );
};
