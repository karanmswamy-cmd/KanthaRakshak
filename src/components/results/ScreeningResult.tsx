import React from 'react';
import { ScreeningState } from '../../types/screening';
import { CheckCircle2, RotateCcw, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ScreeningResultProps {
  state: ScreeningState;
  onRepeatTest?: () => void;
  retestReasons?: string[];
  testId: string;
}

export const ScreeningResult: React.FC<ScreeningResultProps> = ({
  state,
  onRepeatTest,
  retestReasons = [],
  testId,
}) => {
  if (state === 'LOW_RISK') {
    return (
      <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl p-8 text-center shadow-xs">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-300 shadow-xs">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-300">
          Screening Outcome
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-emerald-950 mt-3 tracking-tight">
          LOW RISK
        </h1>
        <p className="text-base font-semibold text-emerald-900 max-w-xl mx-auto mt-3">
          No concerning swallowing pattern was identified during this screening.
        </p>
        <p className="text-xs text-emerald-700 max-w-lg mx-auto mt-2 font-medium">
          Screening result only – not a medical diagnosis.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={`/reports?testId=${testId}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors shadow-2xs"
          >
            <span>View Screening Report</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (state === 'RETEST') {
    return (
      <div className="bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-8 text-center shadow-xs">
        <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-300 shadow-xs">
          <RotateCcw className="w-9 h-9" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-amber-800 bg-amber-100/80 px-3 py-1 rounded-full border border-amber-300">
          Inconclusive Screening
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-amber-950 mt-3 tracking-tight">
          RETEST / INCONCLUSIVE
        </h1>
        <p className="text-base font-semibold text-amber-900 max-w-xl mx-auto mt-3">
          Signal quality was insufficient or sensors disagreed during recording.
        </p>

        {retestReasons.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-white/80 border border-amber-200 max-w-md mx-auto text-left">
            <span className="text-xs font-bold text-amber-900 block mb-2">
              Identified Causes:
            </span>
            <ul className="text-xs text-amber-800 space-y-1.5 list-disc list-inside">
              {retestReasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onRepeatTest && (
            <button
              onClick={onRepeatTest}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Repeat Test Now</span>
            </button>
          )}
          <Link
            to="/test/setup"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
          >
            <span>Adjust Sensor Position</span>
          </Link>
        </div>
      </div>
    );
  }

  // POSSIBLE_RISK
  return (
    <div className="bg-rose-50/70 border-2 border-rose-300 rounded-2xl p-8 text-center shadow-xs">
      <div className="w-16 h-16 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-300 shadow-xs">
        <AlertTriangle className="w-9 h-9" />
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-rose-800 bg-rose-100/80 px-3 py-1 rounded-full border border-rose-300">
        Clinical Alert
      </span>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-rose-950 mt-3 tracking-tight">
        POSSIBLE ASPIRATION RISK
      </h1>
      <p className="text-base font-bold text-rose-900 max-w-xl mx-auto mt-3">
        Potentially abnormal swallowing characteristics were identified.
      </p>
      <div className="mt-3 p-3 rounded-lg bg-rose-100/60 border border-rose-200 max-w-lg mx-auto">
        <p className="text-xs font-semibold text-rose-900 leading-relaxed">
          Further assessment by a qualified clinician or speech-language professional is recommended.
        </p>
      </div>
      <p className="text-[11px] text-rose-700 mt-2 font-medium">
        Screening result only – not a medical diagnosis.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          to={`/reports?testId=${testId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs transition-colors shadow-xs"
        >
          <span>Generate Specialist Referral Summary</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
