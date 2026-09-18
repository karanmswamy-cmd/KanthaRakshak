import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { SensorDataPoint } from '../../types/sensor';
import { Activity, Compass, Eye, EyeOff } from 'lucide-react';

interface LiveWaveformProps {
  data: SensorDataPoint[];
  swallowDetected?: boolean;
}

export const LiveWaveform: React.FC<LiveWaveformProps> = ({
  data,
  swallowDetected = false,
}) => {
  const [showAxes, setShowAxes] = useState(false);

  // Format data for Recharts (time in seconds)
  const chartData = data.slice(-80).map((d) => ({
    timeSec: (d.timestamp / 1000).toFixed(2),
    piezo: d.piezo,
    magnitude: d.accel_magnitude,
    ax: d.ax,
    ay: d.ay,
    az: d.az,
  }));

  const latestPoint = data[data.length - 1] || {
    piezo: 0,
    accel_magnitude: 1.0,
    ax: 0,
    ay: 0,
    az: 1.0,
  };

  return (
    <div className="space-y-4">
      {/* CHART 1: 27mm Piezo Contact Microphone Throat Vibration */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-900">
              CHART 1: Throat Acoustic Vibration (27mm Piezo)
            </h3>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Normalized Amplitude
            </span>
          </div>

          <div className="flex items-center gap-3">
            {swallowDetected && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full animate-bounce">
                Swallow Burst Detected
              </span>
            )}
            <div className="text-right">
              <span className="text-xs font-mono text-slate-500">Current: </span>
              <span className="text-xs font-mono font-bold text-emerald-700">
                {latestPoint.piezo.toFixed(3)}
              </span>
            </div>
          </div>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="timeSec"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                unit="s"
              />
              <YAxis
                domain={[-0.8, 1.0]}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                ticks={[-0.5, 0, 0.5, 1.0]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '8px',
                  fontSize: '11px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(val: any) => [val, 'Normalized Amp']}
                labelFormatter={(label) => `Time: ${label}s`}
              />
              {/* Baseline reference */}
              <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />
              {/* Development threshold marker */}
              <ReferenceLine
                y={0.28}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: 'Trigger Ref (0.28)',
                  position: 'top',
                  fill: '#d97706',
                  fontSize: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="piezo"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CHART 2: MPU6050 Laryngeal Motion */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-900">
              CHART 2: Laryngeal Elevation & Kinematics (MPU6050)
            </h3>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
              Acceleration (g)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAxes(!showAxes)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            >
              {showAxes ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showAxes ? 'Hide X, Y, Z' : 'Toggle Tri-Axial (X, Y, Z)'}</span>
            </button>
            <div className="text-right">
              <span className="text-xs font-mono text-slate-500">|a|: </span>
              <span className="text-xs font-mono font-bold text-teal-700">
                {latestPoint.accel_magnitude.toFixed(3)}g
              </span>
            </div>
          </div>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="timeSec"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                unit="s"
              />
              <YAxis
                domain={[0.4, 1.8]}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                ticks={[0.5, 1.0, 1.5]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '8px',
                  fontSize: '11px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelFormatter={(label) => `Time: ${label}s`}
              />
              <ReferenceLine y={1.0} stroke="#cbd5e1" strokeWidth={1} label={{ value: '1.0g Gravity', position: 'insideBottomRight', fontSize: 10, fill: '#94a3b8' }} />

              {/* Resultant magnitude */}
              <Line
                type="monotone"
                dataKey="magnitude"
                name="Resultant |a|"
                stroke="#0d9488"
                strokeWidth={2.2}
                dot={false}
                isAnimationActive={false}
              />

              {/* Optional Advanced X, Y, Z toggles */}
              {showAxes && (
                <>
                  <Line
                    type="monotone"
                    dataKey="ax"
                    name="Ax"
                    stroke="#3b82f6"
                    strokeWidth={1.2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="ay"
                    name="Ay"
                    stroke="#8b5cf6"
                    strokeWidth={1.2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="az"
                    name="Az"
                    stroke="#ec4899"
                    strokeWidth={1.2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-1 bg-teal-600 rounded-full inline-block" />
              Resultant Magnitude (|a|)
            </span>
            {showAxes && (
              <>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-1 bg-blue-500 rounded-full inline-block" />
                  X (Ant/Post)
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-1 bg-purple-500 rounded-full inline-block" />
                  Y (Superior/Inferior)
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-1 bg-pink-500 rounded-full inline-block" />
                  Z (Lateral)
                </span>
              </>
            )}
          </div>
          <span className="text-slate-400 font-mono">12-bit ADC / 50 Hz streaming</span>
        </div>
      </div>
    </div>
  );
};
