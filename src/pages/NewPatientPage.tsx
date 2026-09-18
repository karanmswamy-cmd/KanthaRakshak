import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { deriveAgeGroup, AgeGroup } from '../types/patient';
import { UserPlus, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const NewPatientPage: React.FC = () => {
  const navigate = useNavigate();

  const [id, setId] = useState(`PAT-${Math.floor(1000 + Math.random() * 9000)}`);
  const [nameOrInitials, setNameOrInitials] = useState('');
  const [age, setAge] = useState<number | ''>(68);
  const [sex, setSex] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>('Male');
  const [wardOrRoom, setWardOrRoom] = useState('Stroke Ward - Room 104');
  const [admissionNotes, setAdmissionNotes] = useState('Post-ischemic stroke screening referral');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Automatically derived age group
  const derivedGroup: AgeGroup | null = age !== '' ? deriveAgeGroup(Number(age)) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameOrInitials || age === '') return;

    try {
      setIsSubmitting(true);
      await api.createPatient({
        id,
        nameOrInitials,
        age: Number(age),
        sex,
        wardOrRoom,
        admissionNotes,
      });
      // Navigate to Sensor Setup with patient ID parameter
      navigate(`/test/setup?patientId=${id}`);
    } catch (err) {
      console.error('Failed to create patient record', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Register Patient for Screening
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Collect minimal clinical intake data before initiating swallowing sensor setup
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Patient ID & Initials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Patient Hospital ID *
              </label>
              <input
                type="text"
                required
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="e.g. PAT-4029"
                className="w-full text-xs font-mono rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Name or Initials *
              </label>
              <input
                type="text"
                required
                value={nameOrInitials}
                onChange={(e) => setNameOrInitials(e.target.value)}
                placeholder="e.g. A. B. or John Doe"
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Age & Derived Age Group */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Patient Age (Years) *
              </label>
              <input
                type="number"
                min={1}
                max={120}
                required
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 68"
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Automatically Derived Age Group Display */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Derived Age Group (Stratification)
              </label>
              <div className="h-9 px-3 rounded-lg border border-teal-200 bg-teal-50/60 flex items-center justify-between text-xs">
                <span className="font-bold text-teal-900">
                  {derivedGroup ? derivedGroup : 'Enter age above'}
                </span>
                <span className="text-[10px] text-teal-700 font-medium">Auto-derived</span>
              </div>
            </div>
          </div>

          {/* MANDATORY REGULATORY SAFETY WARNING */}
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Demographic Safety Requirement:</span>
              <p className="mt-0.5 text-amber-800">
                "Age group is recorded for analysis and research. It does not independently determine the screening result."
              </p>
            </div>
          </div>

          {/* Optional Fields: Sex & Ward */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Biological Sex (Optional)
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as any)}
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Ward / Room (Optional)
              </label>
              <input
                type="text"
                value={wardOrRoom}
                onChange={(e) => setWardOrRoom(e.target.value)}
                placeholder="e.g. ICU Bed 04"
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Clinical Context / Referral Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={admissionNotes}
              onChange={(e) => setAdmissionNotes(e.target.value)}
              placeholder="e.g. Post-extubation swallow surveillance, oral intake evaluation"
              className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Primary Action Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !nameOrInitials || age === ''}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <span>Continue to Sensor Setup</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
