import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { ScreeningRecord, ScreeningState } from '../types/screening';
import { ScreeningResultBadge } from '../components/common/ScreeningResultBadge';
import { SignalQualityBadge } from '../components/common/SignalQualityBadge';
import {
  History,
  Filter,
  Eye,
  FileText,
  Search,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [tests, setTests] = useState<ScreeningRecord[]>([]);
  const [filterState, setFilterState] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getTests();
        setTests(data);
      } catch (err) {
        console.error('Failed to load tests', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const filteredTests = tests.filter((t) => {
    const matchesState = filterState === 'ALL' || t.screeningState === filterState;
    const matchesSearch =
      t.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.patientNameOrInitials &&
        t.patientNameOrInitials.toLowerCase().includes(searchTerm.toLowerCase())) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesState && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Screening History & Audit Trail
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {tests.length} Screenings
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Longitudinal record of non-invasive swallowing assessments across patient wards
          </p>
        </div>

        {/* Filter Quick Pills */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 text-xs shadow-2xs">
          <button
            onClick={() => setFilterState('ALL')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              filterState === 'ALL'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({tests.length})
          </button>
          <button
            onClick={() => setFilterState('LOW_RISK')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              filterState === 'LOW_RISK'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Low Risk
          </button>
          <button
            onClick={() => setFilterState('RETEST')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              filterState === 'RETEST'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-amber-700'
            }`}
          >
            Retest
          </button>
          <button
            onClick={() => setFilterState('POSSIBLE_RISK')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              filterState === 'POSSIBLE_RISK'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            Possible Risk
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Patient ID, Test ID, Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-300 py-2 pl-9 pr-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredTests.length} records
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Patient ID</th>
                <th className="py-3 px-4">Age & Group</th>
                <th className="py-3 px-4">Signal Quality</th>
                <th className="py-3 px-4">Test Result</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTests.map((test) => (
                <tr key={test.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-slate-600">
                    <span className="font-semibold text-slate-900 block">
                      {new Date(test.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(test.createdAt).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <Link
                      to={`/patients/${test.patientId}`}
                      className="font-mono font-bold text-slate-900 hover:text-teal-700 hover:underline"
                    >
                      {test.patientId}
                    </Link>
                    <span className="block text-[11px] text-slate-500">
                      {test.patientNameOrInitials}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800">{test.patientAge} yrs</span>{' '}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      {test.patientAgeGroup}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <SignalQualityBadge quality={test.signalQuality} size="sm" />
                  </td>

                  <td className="py-3 px-4">
                    <ScreeningResultBadge state={test.screeningState} size="sm" />
                  </td>

                  <td className="py-3 px-4 text-slate-500">
                    {test.operatorNurse}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        to={`/test/result/${test.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </Link>
                      <Link
                        to={`/reports?testId=${test.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs transition-colors"
                        title="Generate Report"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Report</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
