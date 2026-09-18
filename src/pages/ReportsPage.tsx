import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ScreeningRecord } from '../types/screening';
import { ScreeningResultBadge } from '../components/common/ScreeningResultBadge';
import { SignalQualityBadge } from '../components/common/SignalQualityBadge';
import {
  FileText,
  Printer,
  Download,
  ShieldAlert,
  Activity,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const testIdParam = searchParams.get('testId');

  const [tests, setTests] = useState<ScreeningRecord[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>(testIdParam || '');
  const [report, setReport] = useState<ScreeningRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const allTests = await api.getTests();
        setTests(allTests);
        const activeId = testIdParam || (allTests[0] ? allTests[0].id : '');
        setSelectedTestId(activeId);
        if (activeId) {
          const match = allTests.find((t) => t.id === activeId) || null;
          setReport(match);
        }
      } catch (err) {
        console.error('Failed to load reports', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [testIdParam]);

  const handleSelectReport = (id: string) => {
    setSelectedTestId(id);
    const match = tests.find((t) => t.id === id) || null;
    setReport(match);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500">Generating clinical report document...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Clinical Screening Summary Report
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              Decision Support Document
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Archival summary for medical records and specialist clinical handoffs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedTestId}
            onChange={(e) => handleSelectReport(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 py-1.5 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          >
            {tests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} - {t.patientNameOrInitials} ({t.screeningState})
              </option>
            ))}
          </select>

          <a
            href={api.getReportPdfUrl(selectedTestId)}
            target="_blank"
            rel="noopener noreferrer"
            download={`KanthaRakshak_Report_${selectedTestId}.pdf`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Download PDF</span>
          </a>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {report ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
          {/* Official Document Header */}
          <div className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b-2 border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
                <Activity className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    KanthaRakshak
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                    Team SunForge
                  </span>
                </div>
                <p className="text-xs font-semibold text-teal-700">Every Swallow Counts</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Non-Invasive Cervical Swallow-Screening Decision Support System
                </p>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="font-mono font-bold text-slate-900 block text-sm">
                REPORT ID: {report.id}
              </span>
              <p className="text-slate-500 mt-0.5">
                Screening Timestamp: {new Date(report.createdAt).toLocaleString()}
              </p>
              <p className="text-slate-500">
                Evaluating Clinician: <strong>{report.operatorNurse}</strong>
              </p>
            </div>
          </div>

          {/* Section 1: Patient Information */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              1. Patient Demographics & Context
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Patient Name / ID
                </span>
                <span className="font-bold text-slate-900">
                  {report.patientNameOrInitials} ({report.patientId})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Age & Cohort
                </span>
                <span className="font-semibold text-slate-800">
                  {report.patientAge} Years ({report.patientAgeGroup})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Ward / Location
                </span>
                <span className="font-semibold text-slate-800">
                  {report.wardOrRoom || 'Clinical Ward'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Signal Quality
                </span>
                <SignalQualityBadge quality={report.signalQuality} size="sm" />
              </div>
            </div>
          </div>

          {/* Section 2: Final Screening Result */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              2. Final Screening Result
            </h3>
            <div
              className={`p-6 rounded-xl border-2 text-center ${
                report.screeningState === 'LOW_RISK'
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                  : report.screeningState === 'RETEST'
                  ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                  : 'bg-rose-50/80 border-rose-300 text-rose-950'
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-widest mb-1">
                Classification Output
              </div>
              <div className="text-3xl font-black tracking-tight">
                {report.screeningState === 'LOW_RISK'
                  ? 'LOW RISK'
                  : report.screeningState === 'RETEST'
                  ? 'RETEST / INCONCLUSIVE'
                  : 'POSSIBLE ASPIRATION RISK'}
              </div>
              <p className="text-xs font-semibold mt-2 max-w-xl mx-auto">
                {report.recommendationText}
              </p>
            </div>
          </div>

          {/* Section 3: Swallow Metrics Telemetry */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              3. Swallow Quantitative Metrics & Feature Extraction
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Swallow Duration
                </span>
                <span className="text-base font-bold text-slate-900">
                  {report.explainability.swallowDurationMs > 0
                    ? `${report.explainability.swallowDurationMs} ms`
                    : 'N/A'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  [Ref: 450–1250 ms]*
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Dominant Frequency
                </span>
                <span className="text-base font-bold text-slate-900">
                  {report.explainability.dominantFrequencyHz} Hz
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Spectral Energy Peak
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Sensor Agreement
                </span>
                <span className="text-base font-bold text-teal-700">
                  {report.explainability.sensorAgreement}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Piezo vs MPU6050
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Rule Verification
                </span>
                <span className="text-base font-bold text-slate-800">
                  {report.explainability.ruleVerification}
                </span>
                <span className="text-[10px] text-amber-700 font-mono block mt-0.5">
                  RESEARCH_VALIDATION*
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Plain Language Explanations */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              4. Decision Explanation & Heuristic Rationales
            </h3>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <ul className="space-y-2 text-slate-700">
                {report.explainability.clinicalExplanations.map((exp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{exp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section 5: Clinical Recommendation */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              5. Recommendation & Specialist Handoff
            </h3>
            <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50 text-xs text-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-teal-950">
                <Stethoscope className="w-4 h-4 text-teal-700" />
                <span>Recommended Action:</span>
              </div>
              <p className="leading-relaxed">{report.recommendationText}</p>
            </div>
          </div>

          {/* Mandatory Formal Regulatory Footer */}
          <div className="pt-6 border-t border-slate-200 text-center space-y-2 text-xs text-slate-500">
            <p className="font-semibold text-slate-700">
              "KanthaRakshak is an experimental screening prototype and is not intended to provide a clinical diagnosis."
            </p>
            <p className="text-[10px] text-slate-400 max-w-2xl mx-auto">
              This report is generated for early decision support by Team SunForge. Physiological thresholds marked with (*) are non-medically validated development heuristics under active research investigation.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500">Please select a test to view report.</p>
        </div>
      )}
    </div>
  );
};
