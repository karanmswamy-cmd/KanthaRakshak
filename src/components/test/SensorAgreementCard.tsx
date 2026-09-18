import React from 'react';
import {
  SignalQualityLevel,
  NoiseLevel,
  SensorAgreementLevel,
} from '../../types/sensor';
import { SignalQualityBadge } from '../common/SignalQualityBadge';
import {
  ShieldCheck,
  Activity,
  Radio,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Waves,
} from 'lucide-react';

interface SensorAgreementCardProps {
  signalQuality: SignalQualityLevel;
  noiseLevel: NoiseLevel;
  swallowDetected: boolean;
  sensorAgreement: SensorAgreementLevel;
  recordingDurationSec: number;
  packetRateHz: number;
  statusMessage: string;
}

export const SensorAgreementCard: React.FC<SensorAgreementCardProps> = ({
  signalQuality,
  noiseLevel,
  swallowDetected,
  sensorAgreement,
  recordingDurationSec,
  packetRateHz,
  statusMessage,
}) => {
  const getAgreementStyle = () => {
    switch (sensorAgreement) {
      case 'HIGH':
        return {
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          label: 'HIGH AGREEMENT',
        };
      case 'MODERATE':
        return {
          color: 'text-teal-700 bg-teal-50 border-teal-200',
          label: 'MODERATE',
        };
      case 'LOW':
        return {
          color: 'text-amber-700 bg-amber-50 border-amber-200',
          label: 'LOW / REVIEW',
        };
      case 'DISAGREED':
        return {
          color: 'text-rose-700 bg-rose-50 border-rose-200',
          label: 'DISAGREED (RETEST)',
        };
    }
  };

  const agreement = getAgreementStyle();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Live pipeline status banner */}
      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-600" />
        </span>
        <span className="text-xs font-semibold text-slate-800 tracking-wide">
          Status: <span className="text-teal-700">{statusMessage}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Signal Quality */}
        <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
          <span className="text-[11px] text-slate-500 font-medium block mb-1">
            Signal Quality
          </span>
          <SignalQualityBadge quality={signalQuality} size="sm" />
        </div>

        {/* Noise Level */}
        <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
          <span className="text-[11px] text-slate-500 font-medium block mb-1">
            Noise Baseline
          </span>
          <span
            className={`inline-block font-semibold px-2 py-0.5 rounded text-[11px] border ${
              noiseLevel === 'LOW'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : noiseLevel === 'MEDIUM'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {noiseLevel}
          </span>
        </div>

        {/* Swallow Event Detection */}
        <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
          <span className="text-[11px] text-slate-500 font-medium block mb-1">
            Swallow Event
          </span>
          <div className="flex items-center gap-1.5">
            {swallowDetected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-bold text-emerald-700 text-[11px]">DETECTED</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                <span className="font-medium text-slate-500 text-[11px]">Searching...</span>
              </>
            )}
          </div>
        </div>

        {/* Dual Sensor Agreement */}
        <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
          <span className="text-[11px] text-slate-500 font-medium block mb-1">
            Sensor Agreement
          </span>
          <span
            className={`inline-block font-semibold px-2 py-0.5 rounded text-[10px] border ${agreement.color}`}
          >
            {agreement.label}
          </span>
        </div>
      </div>

      {/* Telemetry metadata footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{recordingDurationSec.toFixed(1)}s elapsed</span>
        </div>
        <div className="flex items-center gap-1">
          <Radio className="w-3 h-3 text-teal-600" />
          <span>{packetRateHz} Hz BLE stream</span>
        </div>
      </div>
    </div>
  );
};
