import React from 'react';

interface SwallowMetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  badge?: string;
  isResearchPlaceholder?: boolean;
  status?: 'normal' | 'flag' | 'neutral';
}

export const SwallowMetricCard: React.FC<SwallowMetricCardProps> = ({
  label,
  value,
  unit,
  subtext,
  badge,
  isResearchPlaceholder = false,
  status = 'neutral',
}) => {
  const getBorder = () => {
    if (status === 'normal') return 'border-emerald-200 bg-emerald-50/30';
    if (status === 'flag') return 'border-rose-200 bg-rose-50/30';
    return 'border-slate-200 bg-white';
  };

  return (
    <div className={`p-4 rounded-xl border ${getBorder()} shadow-sm transition-all`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span className="text-2xl font-bold tracking-tight text-slate-800">
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-slate-500">{unit}</span>}
      </div>

      {subtext && <p className="text-xs text-slate-600 mt-1">{subtext}</p>}

      {isResearchPlaceholder && (
        <div className="mt-2.5 pt-2 border-t border-slate-100">
          <span className="inline-block text-[10px] font-mono font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            RESEARCH_VALIDATION_REQUIRED
          </span>
        </div>
      )}
    </div>
  );
};
