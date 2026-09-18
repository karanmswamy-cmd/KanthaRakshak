import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDevice } from '../../context/DeviceContext';
import { useAuth } from '../../context/AuthContext';
import {
  Activity,
  Bluetooth,
  Battery,
  BatteryCharging,
  User,
  ShieldCheck,
  PlusCircle,
  Menu,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { device } = useDevice();
  const { user } = useAuth();
  const location = useLocation();

  const getBatteryIcon = () => {
    if (device.isCharging) return <BatteryCharging className="w-4 h-4 text-emerald-600 animate-pulse" />;
    if (device.batteryPercentage > 20) return <Battery className="w-4 h-4 text-slate-700" />;
    return <Battery className="w-4 h-4 text-rose-600" />;
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Tagline */}
        <div className="flex items-center gap-4">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center text-white shadow-sm group-hover:bg-teal-800 transition-colors">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  KanthaRakshak
                </span>
                <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                  Prototype
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium tracking-wide">
                Every Swallow Counts <span className="text-slate-300">|</span> Team SunForge
              </p>
            </div>
          </Link>
        </div>

        {/* Center: Start screening shortcut if not already in test flow */}
        <div className="hidden lg:flex items-center">
          {!location.pathname.startsWith('/test') && (
            <Link
              to="/test/setup"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Start New Screening</span>
            </Link>
          )}
        </div>

        {/* Right: Hardware Telemetry Bar & User */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* BLE Hardware State */}
          <Link
            to="/device"
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              device.bleConnected
                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
            title="ESP32 BLE Connection Status"
          >
            <Bluetooth
              className={`w-3.5 h-3.5 ${
                device.bleConnected ? 'text-teal-600' : 'text-rose-500'
              }`}
            />
            <span className="hidden sm:inline font-semibold">
              {device.bleConnected ? 'ESP32 BLE' : 'BLE Disconnected'}
            </span>
            {device.bleConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </Link>

          {/* Battery Level */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
            title={`Battery: ${device.batteryPercentage}%`}
          >
            {getBatteryIcon()}
            <span>{device.batteryPercentage}%</span>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-tight">
                {user?.name || 'Healthcare Worker'}
              </p>
              <p className="text-[11px] text-slate-500">{user?.role || 'Staff Nurse'}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
