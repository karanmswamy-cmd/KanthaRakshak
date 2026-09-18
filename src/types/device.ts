export interface DeviceStatus {
  esp32Id: string; // e.g., "ESP32-SWALLOW-01"
  bleConnected: boolean;
  bleDeviceName: string;
  firmwareVersion: string;
  batteryPercentage: number;
  isCharging: boolean;
  packetRateHz: number;
  lastPacketTimestamp: string | null;
  piezoAdcState: 'ACTIVE' | 'DISCONNECTED' | 'SATURATED' | 'NO_SIGNAL';
  mpu6050State: 'ACTIVE' | 'DISCONNECTED' | 'CALIBRATING' | 'I2C_ERROR';
  overallStatus: 'READY' | 'WARNING' | 'DISCONNECTED';
}
