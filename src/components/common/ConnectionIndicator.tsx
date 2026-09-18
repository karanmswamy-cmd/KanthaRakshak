import React from 'react';

interface ConnectionIndicatorProps {
  label: string;
  status:
    | 'ACTIVE'
    | 'CONNECTED'
    | 'DISCONNECTED'
    | 'NO_SIGNAL'
    | 'WARNING'
    | 'SATURATED'
    | 'CALIBRATING'
    | 'I2C_ERROR';
  subtext?: string;
  size?: 'sm' | 'md';
}

export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
  label,
  status,
  subtext,
  size = 'md',
}) => {
  const isPositive = status === 'ACTIVE' || status === 'CONNECTED';
  const isWarning = status === 'WARNING' || status === 'SATURATED' || status === 'CALIBRATING';

  const dotColor = isPositive
    ? 'bg-emerald-500'
    : isWarning
    ? 'bg-amber-500'
    : 'bg-slate-400';
  const textColor = isPositive
    ? 'text-emerald-700'
    : isWarning
    ? 'text-amber-700'
    : 'text-slate-500';
  const pulse = isPositive ? 'animate-pulse' : '';

  return (
    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`inline-block w-2 h-2 rounded-full ${dotColor} ${pulse}`} />
        <span className={`text-xs font-semibold ${textColor}`}>
          {status}
        </span>
        {subtext && <span className="text-[11px] text-slate-400">({subtext})</span>}
      </div>
    </div>
  );
};
