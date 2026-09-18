import React from 'react';
import { ExplainabilityData } from '../../types/screening';
import { SwallowMetricCard } from '../common/SwallowMetricCard';
import { SignalQualityBadge } from '../common/SignalQualityBadge';
import { HelpCircle, Check, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';

interface ExplainabilityPanelProps {
  explainability: ExplainabilityData;
}

export const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({
  explainability,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900">Explainable Decision Telemetry</h2>
          <p className="text-xs text-slate-500">
            Multi-modal sensor metrics and rule verification breakdown
          </p>
        </div>
        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          DSP & ML Pipeline v1.2
        </span>
      </div>

      {/* Grid of Key Swallow Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* Signal Quality */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
            Signal Quality
          </span>
          <SignalQualityBadge quality={explainability.signalQuality} size="md" />
          <p className="text-[10px] text-slate-400 mt-1">Acoustic & IMU SNR</p>
        </div>

        {/* Piezo Event */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
            Piezo Event
          </span>
          <span
            className={`text-sm font-bold ${
              explainability.piezoEventDetected ? 'text-emerald-700' : 'text-slate-400'
            }`}
          >
            {explainability.piezoEventDetected ? 'DETECTED' : 'NOT DETECTED'}
          </span>
          <p className="text-[10px] text-slate-400 mt-1">Throat vibration burst</p>
        </div>

        {/* Movement Event */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
            Movement Event
          </span>
          <span
            className={`text-sm font-bold ${
              explainability.movementEventDetected ? 'text-teal-700' : 'text-slate-400'
            }`}
          >
            {explainability.movementEventDetected ? 'DETECTED' : 'NOT DETECTED'}
          </span>
          <p className="text-[10px] text-slate-400 mt-1">Laryngeal elevation |a|</p>
        </div>

        {/* Sensor Agreement */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
            Sensor Agreement
          </span>
          <span
            className={`text-sm font-bold ${
              explainability.sensorAgreement === 'HIGH'
                ? 'text-emerald-700'
                : explainability.sensorAgreement === 'MODERATE'
                ? 'text-teal-700'
                : 'text-amber-700'
            }`}
          >
            {explainability.sensorAgreement}
          </span>
          <p className="text-[10px] text-slate-400 mt-1">Cross-sensor lag check</p>
        </div>

        {/* Swallow Duration */}
        <SwallowMetricCard
          label="Swallow Duration"
          value={explainability.swallowDurationMs > 0 ? explainability.swallowDurationMs : '--'}
          unit="ms"
          subtext="Reference: 450–1250ms"
          isResearchPlaceholder={true}
          status={
            explainability.swallowDurationMs > 1250
              ? 'flag'
              : explainability.swallowDurationMs >= 450
              ? 'normal'
              : 'neutral'
          }
        />

        {/* Dominant Frequency */}
        <SwallowMetricCard
          label="Dominant Frequency"
          value={explainability.dominantFrequencyHz > 0 ? explainability.dominantFrequencyHz : '--'}
          unit="Hz"
          subtext="Spectral peak"
          status="neutral"
        />

        {/* ML Assessment */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
            ML Assessment
          </span>
          <span
            className={`text-sm font-bold ${
              explainability.mlAssessment === 'NORMAL'
                ? 'text-emerald-700'
                : explainability.mlAssessment === 'ABNORMAL'
                ? 'text-rose-700'
                : 'text-amber-700'
            }`}
          >
            {explainability.mlAssessment}
          </span>
          <p className="text-[10px] text-slate-400 mt-1">RandomForest Classifier</p>
        </div>

        {/* Rule Verification */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
              Rule Verification
            </span>
          </div>
          <span
            className={`text-sm font-bold ${
              explainability.ruleVerification === 'PASS'
                ? 'text-emerald-700'
                : explainability.ruleVerification === 'FLAG'
                ? 'text-rose-700'
                : 'text-amber-700'
            }`}
          >
            {explainability.ruleVerification}
          </span>
          <div className="mt-1">
            <span className="inline-block text-[9px] font-mono text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
              RESEARCH_VALIDATION_REQUIRED
            </span>
          </div>
        </div>
      </div>

      {/* Spectral Summary Line */}
      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
        <span className="font-bold text-slate-700">Spectral Features Profile: </span>
        <span className="text-slate-600">{explainability.spectralFeaturesSummary}</span>
        {explainability.confidenceScorePercent && (
          <span className="ml-3 font-semibold text-teal-700">
            (Classification Confidence: {explainability.confidenceScorePercent}%)
          </span>
        )}
      </div>

      {/* Section: "Why did KanthaRakshak return this result?" */}
      <div className="p-5 rounded-xl bg-teal-50/40 border border-teal-200">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-4 h-4 text-teal-700 shrink-0" />
          <h3 className="text-sm font-bold text-teal-950">
            Why did KanthaRakshak return this result?
          </h3>
          <span className="text-[10px] text-teal-600 bg-white px-2 py-0.5 rounded border border-teal-200">
            Backend Plain-Language Explanations
          </span>
        </div>

        <ul className="space-y-2 text-xs text-slate-700">
          {explainability.clinicalExplanations.map((explanation, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
              <span className="leading-relaxed">{explanation}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
