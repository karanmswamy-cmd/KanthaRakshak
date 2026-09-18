import {
  SensorDataPoint,
  QualityPacket,
  SwallowEventPacket,
  AnalysisCompletePacket,
  WebSocketIncomingMessage,
} from '../types/sensor';
import { DEMO_SESSIONS } from './demoData';

export type SensorDataCallback = (data: SensorDataPoint) => void;
export type QualityCallback = (quality: QualityPacket) => void;
export type SwallowEventCallback = (event: SwallowEventPacket) => void;
export type AnalysisCompleteCallback = (complete: AnalysisCompletePacket) => void;
export type ConnectionStateCallback = (connected: boolean, mode: 'LIVE_HARDWARE' | 'DEMO_REPLAY') => void;

export class TelemetryStreamService {
  private ws: WebSocket | null = null;
  private timer: number | null = null;
  private isSimulation: boolean = false;
  private testId: string;
  private demoCase: 'normal' | 'poor_signal' | 'abnormal';

  private dataListeners: Set<SensorDataCallback> = new Set();
  private qualityListeners: Set<QualityCallback> = new Set();
  private swallowEventListeners: Set<SwallowEventCallback> = new Set();
  private analysisListeners: Set<AnalysisCompleteCallback> = new Set();
  private connectionListeners: Set<ConnectionStateCallback> = new Set();

  constructor(
    testId: string,
    options?: {
      forceDemo?: boolean;
      demoCase?: 'normal' | 'poor_signal' | 'abnormal';
    }
  ) {
    this.testId = testId;
    this.demoCase = options?.demoCase || 'normal';
    this.isSimulation = options?.forceDemo ?? true;
  }

  public connect(): void {
    const isExplicitDemo = import.meta.env.VITE_DEMO_MODE !== 'false' || this.isSimulation;

    if (!isExplicitDemo) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/^http:\/\//, '').replace(/^https:\/\//, '')
        : `${window.location.hostname}:8000`;
      const url = `${protocol}//${host}/ws/live/${this.testId}`;

      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.notifyConnection(true, 'LIVE_HARDWARE');
        };

        this.ws.onmessage = (evt) => {
          try {
            const parsed: WebSocketIncomingMessage = JSON.parse(evt.data);
            this.handleMessage(parsed);
          } catch (e) {
            console.error('Failed to parse WS packet:', e);
          }
        };

        this.ws.onerror = () => {
          // Fallback to simulation if live connection fails
          console.warn('Live WebSocket failed to connect. Falling back to Demo Replay Stream.');
          this.ws?.close();
          this.ws = null;
          this.startSimulation();
        };

        this.ws.onclose = () => {
          this.notifyConnection(false, 'LIVE_HARDWARE');
        };

        return;
      } catch (err) {
        console.warn('WS Init Error. Starting simulation fallback.', err);
      }
    }

    this.startSimulation();
  }

  private startSimulation(): void {
    this.isSimulation = true;
    this.notifyConnection(true, 'DEMO_REPLAY');

    const session = DEMO_SESSIONS[this.demoCase];
    const points = session.dataPoints;
    let index = 0;

    // Send initial quality packet
    this.qualityListeners.forEach((cb) => cb(session.qualitySummary));

    // Stream points at 25Hz (every 40ms)
    this.timer = window.setInterval(() => {
      if (index >= points.length) {
        this.stopTimer();

        // Emit final analysis complete
        const finalPacket: AnalysisCompletePacket = {
          type: 'analysis_complete',
          test_id: this.testId,
          result: session.expectedResult,
        };
        this.analysisListeners.forEach((cb) => cb(finalPacket));
        return;
      }

      const point = points[index];
      this.dataListeners.forEach((cb) => cb(point));

      // Trigger swallow detected event mid-stream
      if (this.demoCase !== 'poor_signal' && point.timestamp >= 1700 && point.timestamp <= 1800) {
        this.swallowEventListeners.forEach((cb) =>
          cb({
            type: 'swallow_event',
            detected: true,
            timestamp: point.timestamp,
            duration_ms: session.screeningRecord.explainability.swallowDurationMs,
            confidence: session.screeningRecord.explainability.confidenceScorePercent,
          })
        );
      }

      index++;
    }, 45);
  }

  private handleMessage(msg: WebSocketIncomingMessage): void {
    switch (msg.type) {
      case 'sensor_data':
        this.dataListeners.forEach((cb) => cb(msg));
        break;
      case 'quality':
        this.qualityListeners.forEach((cb) => cb(msg));
        break;
      case 'swallow_event':
        this.swallowEventListeners.forEach((cb) => cb(msg));
        break;
      case 'analysis_complete':
        this.analysisListeners.forEach((cb) => cb(msg));
        break;
    }
  }

  private notifyConnection(connected: boolean, mode: 'LIVE_HARDWARE' | 'DEMO_REPLAY'): void {
    this.connectionListeners.forEach((cb) => cb(connected, mode));
  }

  public onData(cb: SensorDataCallback): () => void {
    this.dataListeners.add(cb);
    return () => this.dataListeners.delete(cb);
  }

  public onQuality(cb: QualityCallback): () => void {
    this.qualityListeners.add(cb);
    return () => this.qualityListeners.delete(cb);
  }

  public onSwallowEvent(cb: SwallowEventCallback): () => void {
    this.swallowEventListeners.add(cb);
    return () => this.swallowEventListeners.delete(cb);
  }

  public onAnalysisComplete(cb: AnalysisCompleteCallback): () => void {
    this.analysisListeners.add(cb);
    return () => this.analysisListeners.delete(cb);
  }

  public onConnectionState(cb: ConnectionStateCallback): () => void {
    this.connectionListeners.add(cb);
    return () => this.connectionListeners.delete(cb);
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public disconnect(): void {
    this.stopTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.dataListeners.clear();
    this.qualityListeners.clear();
    this.swallowEventListeners.clear();
    this.analysisListeners.clear();
    this.connectionListeners.clear();
  }
}
