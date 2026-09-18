import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Patient } from '../types/patient';
import { ScreeningRecord } from '../types/screening';
import { PatientTable } from '../components/patients/PatientTable';
import { UserPlus, Search, Filter, Users, ShieldAlert } from 'lucide-react';

export const PatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tests, setTests] = useState<ScreeningRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [ageFilter, setAgeFilter] = useState<string>('ALL');

  useEffect(() => {
    async function load() {
      const [pData, tData] = await Promise.all([api.getPatients(), api.getTests()]);
      setPatients(pData);
      setTests(tData);
    }
    load();
  }, []);

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.nameOrInitials.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.wardOrRoom && patient.wardOrRoom.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAge = ageFilter === 'ALL' || patient.ageGroup === ageFilter;

    return matchesSearch && matchesAge;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Patient Cohort Directory
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {patients.length} Registered
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Stroke, ICU, post-extubation and geriatric swallowing surveillance
          </p>
        </div>

        <Link
          to="/patients/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Patient</span>
        </Link>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Patient ID, Initials, Ward..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-300 py-2 pl-9 pr-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-600 font-medium">Age Group:</span>
          <select
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All Age Cohorts</option>
            <option value="18–39">18–39</option>
            <option value="40–59">40–59</option>
            <option value="60–75">60–75</option>
            <option value="76+">76+</option>
          </select>
        </div>
      </div>

      {/* Patient Directory Table */}
      <PatientTable patients={filteredPatients} recentTests={tests} />
    </div>
  );
};
