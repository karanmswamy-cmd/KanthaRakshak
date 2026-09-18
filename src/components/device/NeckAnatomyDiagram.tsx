import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

interface NeckAnatomyDiagramProps {
  piezoActive?: boolean;
  mpuActive?: boolean;
  selectedSensor?: 'piezo' | 'mpu' | 'both';
}

export const NeckAnatomyDiagram: React.FC<NeckAnatomyDiagramProps> = ({
  piezoActive = true,
  mpuActive = true,
  selectedSensor = 'both',
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center shadow-xs">
      <div className="w-full flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Anatomical Sensor Placement</h2>
          <p className="text-xs text-slate-500">Cervical acoustic & kinematic targeting zones</p>
        </div>
        <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
          Dual Sensor Array
        </span>
      </div>

      <div className="relative w-full max-w-[320px] aspect-4/5 flex items-center justify-center bg-slate-50/70 rounded-xl border border-slate-200/80 p-4">
        {/* Anatomical SVG Diagram */}
        <svg
          viewBox="0 0 300 380"
          className="w-full h-full text-slate-400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Head & Neck Profile Outline */}
          <path
            d="M 100 20 
               C 140 20, 180 30, 200 65 
               C 215 90, 210 120, 200 135 
               C 195 142, 175 145, 160 148 
               L 165 170 
               C 168 185, 175 220, 175 250 
               C 175 275, 195 295, 235 315 
               L 235 360 
               L 65 360 
               L 65 315 
               C 85 295, 95 270, 95 240 
               L 95 155 
               C 95 120, 90 90, 90 60 
               C 90 35, 95 20, 100 20 Z"
            fill="#f1f5f9"
            stroke="#cbd5e1"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Jawline & Chin contour */}
          <path
            d="M 120 115 C 135 135, 155 145, 172 147"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Larynx / Thyroid notch anatomical suggestion */}
          <path
            d="M 160 190 C 152 195, 150 205, 158 212"
            stroke="#94a3b8"
            strokeWidth="1.8"
            strokeDasharray="3 3"
            strokeLinecap="round"
          />

          {/* Trachea rings */}
          <line x1="140" y1="245" x2="160" y2="245" stroke="#cbd5e1" strokeWidth="2" />
          <line x1="138" y1="255" x2="162" y2="255" stroke="#cbd5e1" strokeWidth="2" />
          <line x1="136" y1="265" x2="164" y2="265" stroke="#cbd5e1" strokeWidth="2" />

          {/* Clavicular notch reference line */}
          <path
            d="M 115 315 C 145 325, 165 325, 195 315"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* SENSOR 1: MPU6050 Motion Sensor (Thyroid Cartilage / Midline) */}
          <g transform="translate(155, 185)">
            {/* Pulsing ring if active */}
            {mpuActive && (
              <circle
                cx="0"
                cy="0"
                r="18"
                fill="#0d9488"
                fillOpacity="0.15"
                className="animate-ping"
              />
            )}
            <rect
              x="-12"
              y="-12"
              width="24"
              height="24"
              rx="4"
              fill={mpuActive ? '#0d9488' : '#94a3b8'}
              stroke="#ffffff"
              strokeWidth="2"
              className="drop-shadow-sm"
            />
            {/* Small chip icon */}
            <circle cx="0" cy="0" r="3" fill="#ffffff" />
          </g>

          {/* SENSOR 2: 27mm Piezo Contact Microphone (Cricoid / Lateral Throat) */}
          <g transform="translate(142, 228)">
            {/* Pulsing ring if active */}
            {piezoActive && (
              <circle
                cx="0"
                cy="0"
                r="22"
                fill="#10b981"
                fillOpacity="0.2"
                className="animate-ping"
              />
            )}
            <circle
              cx="0"
              cy="0"
              r="16"
              fill={piezoActive ? '#10b981' : '#94a3b8'}
              stroke="#ffffff"
              strokeWidth="2"
              className="drop-shadow-sm"
            />
            <circle
              cx="0"
              cy="0"
              r="7"
              fill={piezoActive ? '#059669' : '#64748b'}
            />
          </g>

          {/* Callout Lines & Text */}
          {/* MPU6050 Callout */}
          <path d="M 167 185 L 240 185" stroke="#0d9488" strokeWidth="1.5" strokeDasharray="2 2" />
          <circle cx="240" cy="185" r="3" fill="#0d9488" />

          {/* Piezo Callout */}
          <path d="M 126 228 L 45 228" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2 2" />
          <circle cx="45" cy="228" r="3" fill="#10b981" />
        </svg>

        {/* Floating Callout Badges */}
        <div className="absolute top-24 right-2 bg-white/95 backdrop-blur-xs border border-teal-200 rounded-lg p-2 shadow-xs text-right max-w-[130px]">
          <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-teal-800">
            <span>MPU6050 IMU</span>
            <span className={`w-2 h-2 rounded-full ${mpuActive ? 'bg-teal-500' : 'bg-slate-400'}`} />
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Midline / Thyroid Notch</p>
          <span className="text-[9px] font-medium text-teal-600">Laryngeal Elevation</span>
        </div>

        <div className="absolute bottom-28 left-2 bg-white/95 backdrop-blur-xs border border-emerald-200 rounded-lg p-2 shadow-xs text-left max-w-[130px]">
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
            <span className={`w-2 h-2 rounded-full ${piezoActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span>27mm Piezo</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Lateral Cricoid Area</p>
          <span className="text-[9px] font-medium text-emerald-600">Acoustic Vibration</span>
        </div>
      </div>

      <div className="w-full mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-xs text-slate-600">
        <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          Affix <strong>27mm Piezo</strong> using hypoallergenic double-sided medical tape lateral to the cricoid ring. Place <strong>MPU6050</strong> directly over the thyroid notch midline for vertical displacement tracking.
        </p>
      </div>
    </div>
  );
};
