import asyncio
import csv
from pathlib import Path
from typing import Dict, List, Set
from fastapi import WebSocket
from app.schemas.sensor import SensorSample
from app.core.config import SESSIONS_DIR

class WebSocketManager:
    """
    Manages live WebSocket streaming connections for screening sessions.
    Buffers incoming samples in memory and writes session files (CSV/NPZ) on test completion.
    """

    def __init__(self):
        # test_id -> set of active WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # test_id -> in-memory buffer of SensorSample objects
        self.session_buffers: Dict[str, List[SensorSample]] = {}

    async def connect(self, test_id: str, websocket: WebSocket):
        await websocket.accept()
        if test_id not in self.active_connections:
            self.active_connections[test_id] = set()
        self.active_connections[test_id].add(websocket)

        if test_id not in self.session_buffers:
            self.session_buffers[test_id] = []

    def disconnect(self, test_id: str, websocket: WebSocket):
        if test_id in self.active_connections:
            self.active_connections[test_id].discard(websocket)
            if not self.active_connections[test_id]:
                del self.active_connections[test_id]

    async def broadcast_sample(self, test_id: str, sample: SensorSample):
        """Broadcasts sample to connected clients and appends to in-memory buffer."""
        if test_id not in self.session_buffers:
            self.session_buffers[test_id] = []
        self.session_buffers[test_id].append(sample)

        if test_id in self.active_connections:
            payload = {
                "type": "sensor_data",
                "timestamp": sample.timestamp,
                "piezo": sample.piezo,
                "ax": sample.ax,
                "ay": sample.ay,
                "az": sample.az,
                "gx": sample.gx,
                "gy": sample.gy,
                "gz": sample.gz,
                "accel_magnitude": sample.accel_magnitude
            }
            # Broadcast to all open connections
            dead_conns = []
            for ws in self.active_connections[test_id]:
                try:
                    await ws.send_json(payload)
                except Exception:
                    dead_conns.append(ws)

            for ws in dead_conns:
                self.disconnect(test_id, ws)

    async def broadcast_quality(self, test_id: str, quality_payload: dict):
        if test_id in self.active_connections:
            for ws in list(self.active_connections[test_id]):
                try:
                    await ws.send_json(quality_payload)
                except Exception:
                    self.disconnect(test_id, ws)

    async def broadcast_swallow_event(self, test_id: str, event_payload: dict):
        if test_id in self.active_connections:
            for ws in list(self.active_connections[test_id]):
                try:
                    await ws.send_json(event_payload)
                except Exception:
                    self.disconnect(test_id, ws)

    async def broadcast_analysis_complete(self, test_id: str, result_payload: dict):
        if test_id in self.active_connections:
            for ws in list(self.active_connections[test_id]):
                try:
                    await ws.send_json(result_payload)
                except Exception:
                    self.disconnect(test_id, ws)

    def get_session_samples(self, test_id: str) -> List[SensorSample]:
        return self.session_buffers.get(test_id, [])

    def save_session_to_csv(self, test_id: str) -> str:
        """Flushes in-memory sample buffer to CSV file on disk."""
        samples = self.session_buffers.get(test_id, [])
        file_path = SESSIONS_DIR / f"{test_id}_raw.csv"

        with open(file_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["timestamp", "piezo", "ax", "ay", "az", "gx", "gy", "gz", "accel_magnitude"])
            for s in samples:
                writer.writerow([
                    s.timestamp, s.piezo, s.ax, s.ay, s.az, s.gx, s.gy, s.gz, s.accel_magnitude
                ])

        return str(file_path)

    def clear_session_buffer(self, test_id: str):
        if test_id in self.session_buffers:
            del self.session_buffers[test_id]

ws_manager = WebSocketManager()
