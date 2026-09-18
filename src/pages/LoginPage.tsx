import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, ShieldCheck, Lock, Mail, ArrowRight, Stethoscope } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginAsDemo } = useAuth();

  const [email, setEmail] = useState('nurse.sharma@hospital.org');
  const [password, setPassword] = useState('demo1234');
  const [role, setRole] = useState('Healthcare Worker / Nurse');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, role);
    navigate('/dashboard');
  };

  const handleDemoLogin = () => {
    loginAsDemo();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo and branding */}
        <div className="w-14 h-14 rounded-2xl bg-teal-700 flex items-center justify-center text-white shadow-md mx-auto mb-4">
          <Activity className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          KanthaRakshak
        </h1>
        <p className="mt-1 text-sm font-semibold text-teal-700">
          Every Swallow Counts
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Non-Invasive Swallow-Screening Decision Support | Team SunForge
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs">
            <Stethoscope className="w-4 h-4 text-teal-700 shrink-0" />
            <span>Authorized Clinical Operator Access Only</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Clinical Operator Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              >
                <option value="Healthcare Worker / Nurse">Healthcare Worker / Nurse</option>
                <option value="Speech-Language Pathologist (SLP)">Speech-Language Pathologist (SLP)</option>
                <option value="ICU Clinical Officer">ICU Clinical Officer</option>
                <option value="Clinical Research Coordinator">Clinical Research Coordinator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Hospital Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@hospital.org"
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 pl-9 pr-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 pl-9 pr-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <span>Sign In to Clinical Workstation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Access */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2.5 px-4 rounded-lg border-2 border-dashed border-teal-400 bg-teal-50/70 hover:bg-teal-100/70 text-teal-900 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-2xs"
            >
              <span>Enter Demo Dashboard (Instant Access)</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              For Hackathon evaluators: bypasses credentials and loads simulated telemetry.
            </p>
          </div>
        </div>

        {/* Regulatory disclaimer */}
        <div className="mt-6 text-center text-xs text-slate-400 max-w-sm mx-auto flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Early screening prototype. Not a diagnostic medical device.</span>
        </div>
      </div>
    </div>
  );
};
