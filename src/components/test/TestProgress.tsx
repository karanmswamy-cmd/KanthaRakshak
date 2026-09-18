import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertOctagon,
  RotateCcw,
  Sparkles,
  GlassWater,
  Activity,
  Cpu,
} from 'lucide-react';

export type GuidedStage =
  | 'PREPARE'
  | 'READY'
  | 'START'
  | 'SWALLOW'
  | 'RECORDING'
  | 'PROCESSING';

interface TestProgressProps {
  currentStage: GuidedStage;
  countdown: number | null; // 3, 2, 1 or null
  elapsedSeconds: number;
  totalDurationSeconds?: number;
  onCancel: () => void;
  onRepeat: () => void;
}

const STAGES_CONFIG: {
  key: GuidedStage;
  num: number;
  title: string;
  instruction: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: 'PREPARE',
    num: 1,
    title: 'Prepare',
    instruction: 'Sit comfortably upright and remain still.',
    icon: Activity,
  },
  {
    key: 'READY',
    num: 2,
    title: 'Ready',
    instruction: 'Prepare the standardized water sample (5 mL spoon/syringe).',
    icon: GlassWater,
  },
  {
    key: 'START',
    num: 3,
    title: 'Start',
    instruction: 'Take the instructed sip and hold comfortably in mouth.',
    icon: Clock,
  },
  {
    key: 'SWALLOW',
    num: 4,
    title: 'Swallow',
    instruction: 'Swallow normally in one fluid motion.',
    icon: Sparkles,
  },
  {
    key: 'RECORDING',
    num: 5,
    title: 'Recording',
    instruction: 'Capturing throat vibration and movement...',
    icon: Activity,
  },
  {
    key: 'PROCESSING',
    num: 6,
    title: 'Processing',
    instruction: 'Analyzing swallow waveforms with dual-sensor agreement engine...',
    icon: Cpu,
  },
];

export const TestProgress: React.FC<TestProgressProps> = ({
  currentStage,
  countdown,
  elapsedSeconds,
  totalDurationSeconds = 4.0,
  onCancel,
  onRepeat,
}) => {
  const currentStageIndex = STAGES_CONFIG.findIndex((s) => s.key === currentStage);
  const activeStage = STAGES_CONFIG[currentStageIndex] || STAGES_CONFIG[0];
  const Icon = activeStage.icon;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      {/* Top stage stepper */}
      <div className="hidden sm:grid grid-cols-6 gap-2 mb-6">
        {STAGES_CONFIG.map((stage, idx) => {
          const isDone = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;

          return (
            <div
              key={stage.key}
              className={`flex flex-col items-center text-center p-2 rounded-lg border transition-all ${
                isCurrent
                  ? 'bg-teal-50 border-teal-500 shadow-xs'
                  : isDone
                  ? 'bg-slate-50 border-slate-200 opacity-90'
                  : 'bg-white border-slate-100 opacity-40'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                  isCurrent
                    ? 'bg-teal-600 text-white animate-pulse'
                    : isDone
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : stage.num}
              </div>
              <span
                className={`text-[11px] font-semibold truncate max-w-full ${
                  isCurrent ? 'text-teal-900' : 'text-slate-600'
                }`}
              >
                {stage.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active Stage Callout Box */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-md shrink-0">
            {countdown !== null ? (
              <span className="text-3xl font-extrabold animate-scale">{countdown}</span>
            ) : (
              <Icon className="w-7 h-7 animate-pulse" />
            )}
          </div>

          <div>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                Stage {activeStage.num} of 6: {activeStage.title}
              </span>
              {currentStage === 'RECORDING' && (
                <span className="flex items-center gap-1 text-xs font-mono font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  REC {elapsedSeconds.toFixed(1)}s / {totalDurationSeconds.toFixed(1)}s
                </span>
              )}
            </div>
            <p className="text-lg font-bold text-slate-900 mt-1">
              {activeStage.instruction}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onRepeat}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Repeat Test</span>
          </button>
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors shadow-2xs"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
