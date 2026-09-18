import React from 'react';
import { useDemo, DemoCaseId } from '../../context/DemoContext';
import { FlaskConical, PlayCircle, AlertCircle } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  const { isDemoMode, selectedDemoCase, setSelectedDemoCase } = useDemo();

  if (!isDemoMode) return null;

  return (
    <aside aria-label="Simulation notice" className="bg-amber-500/10 border-b border-amber-300/60 px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-900">
          <FlaskConical className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-semibold">DEMONSTRATION & REPLAY MODE ACTIVE:</span>
          <span className="text-amber-800 hidden md:inline">
            Waveforms and tests are replayed from clinical research datasets. Not from a live patient.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-600 font-medium hidden sm:inline">Active Scenario:</span>
          <div className="inline-flex rounded-lg bg-white p-0.5 border border-amber-200 shadow-sm">
            <button
              onClick={() => setSelectedDemoCase('normal')}
              className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
                selectedDemoCase === 'normal'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Case 1: Normal
            </button>
            <button
              onClick={() => setSelectedDemoCase('poor_signal')}
              className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
                selectedDemoCase === 'poor_signal'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Case 2: Noise / Retest
            </button>
            <button
              onClick={() => setSelectedDemoCase('abnormal')}
              className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
                selectedDemoCase === 'abnormal'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Case 3: Prolonged Risk
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
