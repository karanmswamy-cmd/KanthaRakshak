import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Radio,
  Sliders,
  History,
  FileText,
  Cpu,
  Settings,
  ShieldAlert,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/patients', label: 'Patients', icon: Users },
    { to: '/patients/new', label: 'New Patient', icon: UserPlus },
    { to: '/test/setup', label: 'Sensor Setup', icon: Sliders },
    { to: '/test/live', label: 'Live Test Monitor', icon: Radio },
    { to: '/history', label: 'Screening History', icon: History },
    { to: '/reports', label: 'Clinical Reports', icon: FileText },
    { to: '/device', label: 'Device & BLE', icon: Cpu },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 z-30 md:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`fixed md:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Clinical Workflow
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-800 font-semibold border-l-4 border-teal-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-slate-500" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Safety Disclaimer in footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-700">Prototype Disclaimer:</span>
              <p className="mt-0.5">
                Decision-support prototype only. Not a diagnostic medical device.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
