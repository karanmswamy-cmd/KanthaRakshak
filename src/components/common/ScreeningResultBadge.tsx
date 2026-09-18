import React from 'react';
import { ScreeningState } from '../../types/screening';
import { CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';

interface ScreeningResultBadgeProps {
  state: ScreeningState;
  size?: 'sm' | 'md' | 'lg';
}

export const ScreeningResultBadge: React.FC<ScreeningResultBadgeProps> = ({
  state,
  size = 'md',
}) => {
  const getConfig = () => {
    switch (state) {
      case 'LOW_RISK':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
          label: 'LOW RISK',
        };
      case 'RETEST':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          icon: <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />,
          label: 'RETEST / INCONCLUSIVE',
        };
      case 'POSSIBLE_RISK':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          icon: <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />,
          label: 'POSSIBLE ASPIRATION RISK',
        };
    }
  };

  const config = getConfig();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-semibold',
    md: 'text-xs px-3 py-1 font-semibold tracking-wide',
    lg: 'text-sm px-4 py-1.5 font-bold tracking-wide',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${config.bg} ${sizeClasses[size]}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
