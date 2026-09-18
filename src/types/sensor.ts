// Telemetry and signal processing types for KanthaRakshak

export interface SensorDataPoint {
  timestamp: number; // relative ms from test start
  piezo: number; // normalized throat vibration amplitude (-1.0 to 1.0 or 0 to 1.0)
  ax: number; // acceleration X (g)
  ay: number; // acceleration Y (g)
  az: number; // acceleration Z (g)
  accel_magnitude: number; // resultant acceleration vector magnitude |a| (g)
}

export type SignalQualityLevel = 'GOOD' | 'FAIR' | 'POOR';
export type NoiseLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type MotionBaseline = 'STABLE' | 'MOVEMENT_DETECTED';
export type SensorAgreementLevel = 'HIGH' | 'MODERATE' | 'LOW' | 'DISAGREED';

export interface QualityPacket {
  type: 'quality';
  signal_quality: SignalQualityLevel;
  noise_level: NoiseLevel;
  motion_baseline: MotionBaseline;
  piezo_snr_db?: number;
}

export interface SwallowEventPacket {
  type: 'swallow_event';
  detected: boolean;
  timestamp?: number;
  confidence?: number;
  duration_ms?: number;
}

export interface SensorDataPacket extends SensorDataPoint {
  type: 'sensor_data';
}

export interface AnalysisCompletePacket {
  type: 'analysis_complete';
  test_id: string;
  result: 'LOW_RISK' | 'RETEST' | 'POSSIBLE_RISK';
}

export type WebSocketIncomingMessage =
  | SensorDataPacket
  | QualityPacket
  | SwallowEventPacket
  | AnalysisCompletePacket;
