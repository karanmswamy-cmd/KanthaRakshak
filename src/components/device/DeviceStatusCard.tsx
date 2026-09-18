import React from 'react';
import { useDevice } from '../../context/DeviceContext';
import { ConnectionIndicator } from '../common/ConnectionIndicator';
import { Cpu, RefreshCw, Bluetooth, Battery, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DeviceStatusCard: React.FC = () => {
  const { device, refreshDevice, toggleConnection, isLoading, isConnecting } = useDevice();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">{device.esp32Id}</h2>
            <p className="text-[11px] text-slate-500 font-mono">ESP32 Firmware {device.firmwareVersion}</p>
          </div>
        </div>

        <button
          onClick={refreshDevice}
          disabled={isLoading}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50"
          title="Poll device status"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <ConnectionIndicator
          label="ESP32 Unit"
          status={device.bleConnected ? 'CONNECTED' : 'DISCONNECTED'}
        />
        <ConnectionIndicator
          label="27mm Piezo Sensor"
          status={device.piezoAdcState}
          subtext="12-bit ADC"
        />
        <ConnectionIndicator
          label="MPU6050 IMU"
          status={device.mpu6050State}
          subtext="I2C 0x68"
        />
        <ConnectionIndicator
          label="BLE Link"
          status={device.bleConnected ? 'CONNECTED' : 'DISCONNECTED'}
          subtext={`${device.packetRateHz} Hz`}
        />
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Battery className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-700">Battery: {device.batteryPercentage}%</span>
          {device.isCharging && <span className="text-[10px] text-teal-600 font-medium">(Charging)</span>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleConnection}
            disabled={isConnecting}
            className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
          >
            {isConnecting ? 'Updating...' : device.bleConnected ? 'Disconnect' : 'Connect'}
          </button>
          <Link
            to="/device"
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 underline"
          >
            Diagnostics
          </Link>
        </div>
      </div>
    </div>
  );
};
