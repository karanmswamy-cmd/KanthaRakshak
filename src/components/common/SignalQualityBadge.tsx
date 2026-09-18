import React from 'react';
import { SignalQualityLevel } from '../../types/sensor';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

interface SignalQualityBadgeProps {
  quality: SignalQualityLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const SignalQualityBadge: React.FC<SignalQualityBadgeProps> = ({
  quality,
  size = 'md',
  showIcon = true,
}) => {
  const getStyles = () => {
    switch (quality) {
      case 'GOOD':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'GOOD QUALITY',
        };
      case 'FAIR':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
          label: 'FAIR QUALITY',
        };
      case 'POOR':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
          label: 'POOR QUALITY',
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
          label: quality,
          icon: null,
        };
    }
  };

  const style = getStyles();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${style.bg} ${sizeClasses[size]}`}
    >
      {showIcon && style.icon ? style.icon : <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
      <span>{style.label}</span>
    </span>
  );
};
