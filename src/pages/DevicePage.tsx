import React, { useState } from 'react';
import { useDevice } from '../context/DeviceContext';
import { ConnectionIndicator } from '../components/common/ConnectionIndicator';
import {
  Cpu,
  Bluetooth,
  Battery,
  BatteryCharging,
  Radio,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  HardDrive,
  ShieldCheck,
} from 'lucide-react';

export const DevicePage: React.FC = () => {
  const {
    device,
    refreshDevice,
    toggleConnection,
    runSensorSelfTest,
    isLoading,
    isConnecting,
  } = useDevice();

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSelfTest = async () => {
    const res = await runSensorSelfTest();
    setTestResult(res);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Hardware Bridge & Telemetry
            </h1>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                device.bleConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {device.bleConnected ? 'BLE Link Active' : 'Disconnected'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ESP32 micro-controller, 27mm piezo acoustic transducer, and MPU6050 6-axis IMU bridge
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshDevice}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Poll Hardware</span>
          </button>
        </div>
      </div>

      {/* Main Hardware Status Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{device.esp32Id}</h2>
              <p className="text-xs text-slate-500 font-mono">
                BLE Name: {device.bleDeviceName}
              </p>
            </div>
          </div>

          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
            Firmware {device.firmwareVersion}
          </span>
        </div>

        {/* Status Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-semibold text-[10px] uppercase mb-1">
              Battery Level
            </span>
            <div className="flex items-center gap-1.5">
              {device.isCharging ? (
                <BatteryCharging className="w-4 h-4 text-teal-600" />
              ) : (
                <Battery className="w-4 h-4 text-slate-600" />
              )}
              <span className="text-lg font-extrabold text-slate-900">
                {device.batteryPercentage}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">LiPo 3.7V / TP4056</p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-semibold text-[10px] uppercase mb-1">
              Telemetry Packet Rate
            </span>
            <div className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-teal-600" />
              <span className="text-lg font-extrabold text-slate-900">
                {device.packetRateHz}
              </span>
              <span className="text-xs text-slate-500">Hz</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Bleak GATT Characteristic</p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-semibold text-[10px] uppercase mb-1">
              Piezo ADC Stream
            </span>
            <span
              className={`text-sm font-bold ${
                device.piezoAdcState === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              {device.piezoAdcState}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">12-bit ADC Channel 0</p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-semibold text-[10px] uppercase mb-1">
              MPU6050 IMU Bus
            </span>
            <span
              className={`text-sm font-bold ${
                device.mpu6050State === 'ACTIVE' ? 'text-teal-700' : 'text-slate-500'
              }`}
            >
              {device.mpu6050State}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">I2C Address 0x68 (400kHz)</p>
          </div>
        </div>

        {/* Connection Indicators */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <ConnectionIndicator
            label="ESP32 System Board"
            status={device.bleConnected ? 'CONNECTED' : 'DISCONNECTED'}
            subtext="Core 1 DSP Loop"
          />
          <ConnectionIndicator
            label="BLE Wireless Service"
            status={device.bleConnected ? 'CONNECTED' : 'DISCONNECTED'}
            subtext="UUID 0xFFE0"
          />
          <ConnectionIndicator
            label="27mm Piezo Transducer"
            status={device.piezoAdcState}
            subtext="Op-amp pre-amplifier circuit"
          />
          <ConnectionIndicator
            label="MPU6050 Accelerometer / Gyroscope"
            status={device.mpu6050State}
            subtext="±2g Range / 6-DOF"
          />
        </div>

        {/* Timestamp */}
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
          <Clock className="w-3.5 h-3.5" />
          <span>
            Last hardware telemetry packet:{' '}
            {device.lastPacketTimestamp
              ? new Date(device.lastPacketTimestamp).toLocaleTimeString()
              : 'Never'}
          </span>
        </div>

        {/* Actions Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleConnection}
              disabled={isConnecting}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors shadow-2xs ${
                device.bleConnected
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  : 'bg-teal-700 hover:bg-teal-800 text-white'
              }`}
            >
              {isConnecting
                ? 'Negotiating...'
                : device.bleConnected
                ? 'Disconnect BLE'
                : 'Connect Device'}
            </button>

            <button
              onClick={handleSelfTest}
              disabled={isConnecting}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors shadow-2xs"
            >
              Run Sensor Check
            </button>
          </div>
        </div>

        {/* Self Test Feedback Banner */}
        {testResult && (
          <div
            className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 transition-all ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold">
                {testResult.success ? 'Diagnostic Check Passed' : 'Diagnostic Check Warning'}
              </span>
              <p className="mt-0.5">{testResult.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Hardware Pinout & Wiring Reference */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-xs space-y-3">
        <h3 className="font-bold text-slate-900">Prototype Hardware Pin Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="font-bold text-slate-800 block mb-1">Piezo Signal Path</span>
            <p className="text-[11px] leading-relaxed">
              Throat vibration &rarr; 27mm Contact Mic &rarr; Op-Amp Preamp &rarr; ESP32 GPIO 34 (ADC1_CH6)
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="font-bold text-slate-800 block mb-1">Motion Signal Path</span>
            <p className="text-[11px] leading-relaxed">
              Throat excursion &rarr; MPU6050 &rarr; I2C SDA (GPIO 21) & SCL (GPIO 22) &rarr; ESP32
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
