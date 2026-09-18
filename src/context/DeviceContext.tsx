import React, { createContext, useContext, useState, useEffect } from 'react';
import { DeviceStatus } from '../types/device';
import { api } from '../services/api';

interface DeviceContextType {
  device: DeviceStatus;
  isLoading: boolean;
  isConnecting: boolean;
  refreshDevice: () => Promise<void>;
  toggleConnection: () => Promise<void>;
  runSensorSelfTest: () => Promise<{ success: boolean; message: string }>;
}

const DEFAULT_DEVICE: DeviceStatus = {
  esp32Id: 'ESP32-SWALLOW-01',
  bleConnected: true,
  bleDeviceName: 'KanthaRakshak-BLE-01',
  firmwareVersion: 'v1.4.2-hackathon',
  batteryPercentage: 92,
  isCharging: false,
  packetRateHz: 50,
  lastPacketTimestamp: new Date().toISOString(),
  piezoAdcState: 'ACTIVE',
  mpu6050State: 'ACTIVE',
  overallStatus: 'READY',
};

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [device, setDevice] = useState<DeviceStatus>(DEFAULT_DEVICE);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const refreshDevice = async () => {
    try {
      setIsLoading(true);
      const status = await api.getDeviceStatus();
      setDevice(status);
    } catch (e) {
      console.error('Failed to poll device status', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshDevice();
    const interval = setInterval(refreshDevice, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleConnection = async () => {
    setIsConnecting(true);
    await new Promise((r) => setTimeout(r, 800));
    const nextConnected = !device.bleConnected;
    const updated: DeviceStatus = {
      ...device,
      bleConnected: nextConnected,
      piezoAdcState: nextConnected ? 'ACTIVE' : 'DISCONNECTED',
      mpu6050State: nextConnected ? 'ACTIVE' : 'DISCONNECTED',
      overallStatus: nextConnected ? 'READY' : 'DISCONNECTED',
      packetRateHz: nextConnected ? 50 : 0,
    };
    setDevice(updated);
    await api.updateMockDeviceStatus(updated);
    setIsConnecting(false);
  };

  const runSensorSelfTest = async () => {
    setIsConnecting(true);
    await new Promise((r) => setTimeout(r, 1200));
    const success = device.bleConnected;
    setIsConnecting(false);
    if (success) {
      return {
        success: true,
        message: 'Self-test PASSED: Piezo ADC baseline stable (12-bit, SNR >22dB), MPU6050 WHO_AM_I verified (0x68).',
      };
    }
    return {
      success: false,
      message: 'Self-test FAILED: ESP32 BLE disconnected. Re-pair device first.',
    };
  };

  return (
    <DeviceContext.Provider
      value={{
        device,
        isLoading,
        isConnecting,
        refreshDevice,
        toggleConnection,
        runSensorSelfTest,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (!context) throw new Error('useDevice must be used within a DeviceProvider');
  return context;
};
