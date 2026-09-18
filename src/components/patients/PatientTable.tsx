import React from 'react';
import { Patient } from '../../types/patient';
import { ScreeningRecord, ScreeningState } from '../../types/screening';
import { ScreeningResultBadge } from '../common/ScreeningResultBadge';
import { SignalQualityBadge } from '../common/SignalQualityBadge';
import { Link } from 'react-router-dom';
import { Eye, FileText, ChevronRight, User } from 'lucide-react';

interface PatientTableProps {
  patients: Patient[];
  recentTests?: ScreeningRecord[];
  showActionButtons?: boolean;
}

export const PatientTable: React.FC<PatientTableProps> = ({
  patients,
  recentTests = [],
  showActionButtons = true,
}) => {
  // Map patientId -> most recent test
  const testsByPatient = recentTests.reduce((acc, test) => {
    if (!acc[test.patientId]) acc[test.patientId] = test;
    return acc;
  }, {} as Record<string, ScreeningRecord>);

  if (patients.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
        <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">No patient records found</p>
        <p className="text-xs text-slate-400 mt-1">Register a patient to begin swallowing screening.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Patient ID</th>
              <th className="py-3 px-4">Name / Ward</th>
              <th className="py-3 px-4">Age & Group</th>
              <th className="py-3 px-4">Last Screening</th>
              <th className="py-3 px-4">Signal Quality</th>
              <th className="py-3 px-4">Latest Result</th>
              {showActionButtons && <th className="py-3 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {patients.map((patient) => {
              const latestTest = testsByPatient[patient.id];

              return (
                <tr
                  key={patient.id}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    <Link
                      to={`/patients/${patient.id}`}
                      className="hover:text-teal-700 hover:underline"
                    >
                      {patient.id}
                    </Link>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">
                      {patient.nameOrInitials}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {patient.wardOrRoom || 'Unassigned'}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800">{patient.age} yrs</span>{' '}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      {patient.ageGroup}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-500">
                    {patient.lastScreeningAt ? (
                      new Date(patient.lastScreeningAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    ) : (
                      <span className="text-slate-400 italic">None yet</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {latestTest ? (
                      <SignalQualityBadge quality={latestTest.signalQuality} size="sm" />
                    ) : (
                      <span className="text-slate-400">--</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {latestTest ? (
                      <ScreeningResultBadge state={latestTest.screeningState} size="sm" />
                    ) : (
                      <span className="text-slate-400 italic">Pending screening</span>
                    )}
                  </td>

                  {showActionButtons && (
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to={`/patients/${patient.id}`}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                          title="View Patient Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {latestTest && (
                          <Link
                            to={`/reports?testId=${latestTest.id}`}
                            className="p-1.5 rounded-md hover:bg-teal-50 text-teal-700 transition-colors"
                            title="Generate Screening Report"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>
                        )}
                        <Link
                          to={`/test/setup?patientId=${patient.id}`}
                          className="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-[11px] transition-colors"
                        >
                          Screen
                        </Link>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
