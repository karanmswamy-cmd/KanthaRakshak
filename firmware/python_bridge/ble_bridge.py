"""
JeevaSwara ESP32 BLE Bridge Service.

Connects to the JeevaSwara-ESP32 peripheral using Bleak, decodes 24-byte binary
sensor frames, tracks packet loss via rolling sequence counters, maintains a timed
telemetry ring-buffer, and forwards parsed samples to the FastAPI decision pipeline.
"""

import os
import sys
import struct
import asyncio
import logging
from collections import deque
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Callable, List

from bleak import BleakScanner, BleakClient
from bleak.backends.characteristic import BleakGATTCharacteristic

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("JeevaSwara_BLE_Bridge")

# ==============================================================================
# GATT UUIDs (Matching firmware/include/ble_config.h)
# ==============================================================================
SERVICE_UUID_JEEVASWARA = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
CHAR_UUID_SENSOR_STREAM = "beb5483e-36e1-4688-b7f5-ea07361b26a8"
CHAR_UUID_DEVICE_STATUS = "8f8e8188-751d-40e9-b5ef-77b3191c4be2"
CHAR_UUID_COMMAND       = "cba1d466-344c-4be3-ab3f-189f80dd7518"

DEVICE_TARGET_NAME      = "JeevaSwara-ESP32"
PACKET_STRUCT_FORMAT    = "<BHIHhhhhhhHB" # 24 bytes packed
PACKET_TOTAL_BYTES      = 24
PACKET_MAGIC_BYTE       = 0xAA

class TelemetryFrame:
    """Represents a decoded, unit-converted physical sensor frame."""
    def __init__(
        self,
        sequence: int,
        timestamp_ms: int,
        piezo_raw: int,
        piezo_voltage: float,
        ax_g: float,
        ay_g: float,
        az_g: float,
        gx_dps: float,
        gy_dps: float,
        gz_dps: float,
        accel_magnitude_g: float,
        battery_mv: int,
        battery_pct: float
    ):
        self.sequence = sequence
        self.timestamp_ms = timestamp_ms
        self.piezo_raw = piezo_raw
        self.piezo_voltage = round(piezo_voltage, 4)
        self.ax = round(ax_g, 4)
        self.ay = round(ay_g, 4)
        self.az = round(az_g, 4)
        self.gx = round(gx_dps, 2)
        self.gy = round(gy_dps, 2)
        self.gz = round(gz_dps, 2)
        self.accel_magnitude = round(accel_magnitude_g, 4)
        self.battery_mv = battery_mv
        self.battery_pct = round(battery_pct, 1)
        self.host_received_at = datetime.now(timezone.utc).isoformat()


    def to_dict(self) -> Dict[str, Any]:
        return {
            "sequence": self.sequence,
            "timestamp": self.timestamp_ms,
            "piezo": self.piezo_voltage,
            "ax": self.ax,
            "ay": self.ay,
            "az": self.az,
            "gx": self.gx,
            "gy": self.gy,
            "gz": self.gz,
            "accel_magnitude": self.accel_magnitude,
            "battery_mv": self.battery_mv,
            "battery_pct": self.battery_pct,
            "host_received_at": self.host_received_at
        }

def decode_binary_packet(data: bytes) -> Optional[TelemetryFrame]:
    """
    Unpacks and validates a 24-byte binary BLE telemetry packet.
    """
    if len(data) != PACKET_TOTAL_BYTES:
        logger.warning(f"Malformed packet length: {len(data)} (expected {PACKET_TOTAL_BYTES})")
        return None

    # Verify XOR Checksum
    expected_checksum = 0
    for b in data[:-1]:
        expected_checksum ^= b
    actual_checksum = data[-1]

    if expected_checksum != actual_checksum:
        logger.warning(f"Checksum mismatch: computed 0x{expected_checksum:02X}, received 0x{actual_checksum:02X}")
        return None

    unpacked = struct.unpack(PACKET_STRUCT_FORMAT, data)
    magic = unpacked[0]
    if magic != PACKET_MAGIC_BYTE:
        logger.warning(f"Invalid magic header byte: 0x{magic:02X} (expected 0x{PACKET_MAGIC_BYTE:02X})")
        return None

    seq = unpacked[1]
    t_ms = unpacked[2]
    raw_piezo = unpacked[3]
    raw_ax = unpacked[4]
    raw_ay = unpacked[5]
    raw_az = unpacked[6]
    raw_gx = unpacked[7]
    raw_gy = unpacked[8]
    raw_gz = unpacked[9]
    bat_mv = unpacked[10]

    # Convert physical engineering units
    # Piezo: 12-bit ADC (0 to 4095) with 1.65V DC midpoint bias
    # Normalized voltage offset: (raw - 2048) / 2048.0 -> [-1.0, 1.0] span
    piezo_v = (float(raw_piezo) - 2048.0) / 2048.0

    # Accelerometer: LSB = 1/16384 g for +/-2g sensitivity range
    ax_g = float(raw_ax) / 16384.0
    ay_g = float(raw_ay) / 16384.0
    az_g = float(raw_az) / 16384.0
    mag_g = (ax_g**2 + ay_g**2 + az_g**2)**0.5

    # Gyroscope: LSB = 1/131.0 dps for +/-250 dps sensitivity range
    gx_dps = float(raw_gx) / 131.0
    gy_dps = float(raw_gy) / 131.0
    gz_dps = float(raw_gz) / 131.0

    # Battery percentage approximation (LiPo 3.3V to 4.2V curve)
    bat_pct = max(0.0, min(100.0, ((bat_mv - 3300) / (4200 - 3300)) * 100.0))

    return TelemetryFrame(
        sequence=seq,
        timestamp_ms=t_ms,
        piezo_raw=raw_piezo,
        piezo_voltage=piezo_v,
        ax_g=ax_g,
        ay_g=ay_g,
        az_g=az_g,
        gx_dps=gx_dps,
        gy_dps=gy_dps,
        gz_dps=gz_dps,
        accel_magnitude_g=mag_g,
        battery_mv=bat_mv,
        battery_pct=bat_pct
    )

class JeevaSwaraBleBridge:
    """
    Asynchronous BLE Client managing connection lifecycle, packet integrity,
    ring-buffering, and backend streaming callbacks.
    """

    def __init__(
        self,
        target_name: str = DEVICE_TARGET_NAME,
        ring_buffer_capacity: int = 500, # 10 seconds at 50 Hz
        on_frame_callback: Optional[Callable[[TelemetryFrame], None]] = None,
        on_status_callback: Optional[Callable[[str], None]] = None,
        auto_reconnect: bool = True
    ):
        self.target_name = target_name
        self.ring_buffer = deque(maxlen=ring_buffer_capacity)
        self.on_frame_callback = on_frame_callback
        self.on_status_callback = on_status_callback
        self.auto_reconnect = auto_reconnect

        self.client: Optional[BleakClient] = None
        self.is_connected = False
        self.device_state = "DISCONNECTED"

        # Packet Loss Tracking
        self.last_sequence: Optional[int] = None
        self.total_packets_received = 0
        self.total_packets_lost = 0

        self._stop_requested = False

    @property
    def packet_loss_rate(self) -> float:
        total = self.total_packets_received + self.total_packets_lost
        if total == 0:
            return 0.0
        return round((self.total_packets_lost / total) * 100.0, 2)

    async def scan_for_device(self, timeout_sec: float = 8.0) -> Optional[Any]:
        """Scans for peripheral matching JeevaSwara-ESP32 name."""
        logger.info(f"Scanning for BLE device: '{self.target_name}' (timeout {timeout_sec}s)...")
        devices = await BleakScanner.discover(timeout=timeout_sec)
        for dev in devices:
            if dev.name and self.target_name in dev.name:
                logger.info(f"Found target peripheral: {dev.name} [{dev.address}] (RSSI: {dev.rssi} dBm)")
                return dev
        return None

    def _on_disconnect(self, client: BleakClient):
        """Invoked when BLE connection drops unexpectedly."""
        logger.warning(f"BLE Link Lost to {self.target_name}! Peripheral disconnected.")
        self.is_connected = False
        self.device_state = "DEVICE DISCONNECTED"
        if self.on_status_callback:
            self.on_status_callback("DEVICE DISCONNECTED")

    def _handle_sensor_notification(self, characteristic: BleakGATTCharacteristic, data: bytearray):
        """Notification handler for sensor_stream."""
        frame = decode_binary_packet(bytes(data))
        if frame is None:
            return

        # Packet loss & sequence verification
        if self.last_sequence is not None:
            expected = (self.last_sequence + 1) & 0xFFFF
            diff = (frame.sequence - expected) & 0xFFFF
            if diff > 0 and diff < 30000:
                self.total_packets_lost += diff
                logger.warning(f"Sequence jump detected: expected {expected}, got {frame.sequence} (Lost {diff} frames)")

        self.last_sequence = frame.sequence
        self.total_packets_received += 1

        # Push to timed ring buffer
        self.ring_buffer.append(frame)

        # Dispatch callback
        if self.on_frame_callback:
            try:
                self.on_frame_callback(frame)
            except Exception as e:
                logger.error(f"Error in on_frame_callback: {e}")

    def _handle_status_notification(self, characteristic: BleakGATTCharacteristic, data: bytearray):
        """Notification handler for device_status."""
        try:
            status_text = data.decode("utf-8").strip()
            self.device_state = status_text
            logger.info(f"[Device Status Updated]: {status_text}")
            if self.on_status_callback:
                self.on_status_callback(status_text)
        except Exception as e:
            logger.warning(f"Failed decoding status payload: {e}")

    async def connect(self, device_address: Optional[str] = None) -> bool:
        """Connects to the ESP32 GATT server and subscribes to characteristics."""
        if device_address is None:
            device = await self.scan_for_device()
            if device is None:
                logger.error(f"Could not locate '{self.target_name}'. Is the ESP32 powered on?")
                return False
            address = device.address
        else:
            address = device_address

        logger.info(f"Connecting to GATT server at {address}...")
        self.client = BleakClient(address, disconnected_callback=self._on_disconnect)
        try:
            await self.client.connect(timeout=15.0)
            self.is_connected = True
            self.device_state = "READY"
            logger.info(f"Connected to {self.target_name} successfully.")

            # Subscribe to sensor stream
            await self.client.start_notify(CHAR_UUID_SENSOR_STREAM, self._handle_sensor_notification)
            logger.info("Subscribed to sensor_stream notifications.")

            # Subscribe to status
            await self.client.start_notify(CHAR_UUID_DEVICE_STATUS, self._handle_status_notification)
            logger.info("Subscribed to device_status notifications.")

            if self.on_status_callback:
                self.on_status_callback("READY")

            return True
        except Exception as e:
            logger.error(f"Failed connecting to ESP32: {e}")
            self.is_connected = False
            return False

    async def send_command(self, cmd: str) -> bool:
        """Sends an ASCII control token (START, STOP, CALIBRATE, PING)."""
        if not self.is_connected or not self.client:
            logger.error("Cannot send command: BLE link is not active.")
            return False
        try:
            payload = cmd.encode("utf-8")
            await self.client.write_gatt_char(CHAR_UUID_COMMAND, payload, response=True)
            logger.info(f"Command '{cmd}' dispatched to ESP32.")
            return True
        except Exception as e:
            logger.error(f"Error sending command '{cmd}': {e}")
            return False

    async def start_recording(self) -> bool:
        self.ring_buffer.clear()
        self.last_sequence = None
        self.total_packets_received = 0
        self.total_packets_lost = 0
        return await self.send_command("START")

    async def stop_recording(self) -> bool:
        return await self.send_command("STOP")

    async def calibrate(self) -> bool:
        return await self.send_command("CALIBRATE")

    async def ping(self) -> bool:
        return await self.send_command("PING")

    async def disconnect(self):
        """Gracefully disconnects BLE client."""
        self._stop_requested = True
        if self.client and self.client.is_connected:
            try:
                await self.client.stop_notify(CHAR_UUID_SENSOR_STREAM)
                await self.client.stop_notify(CHAR_UUID_DEVICE_STATUS)
            except Exception:
                pass
            await self.client.disconnect()
        self.is_connected = False
        self.device_state = "DISCONNECTED"
        logger.info("BLE client disconnected gracefully.")

    def get_buffered_session_samples(self) -> List[Dict[str, Any]]:
        """Returns snapshot of current ring buffer contents as dictionary list."""
        return [frame.to_dict() for frame in list(self.ring_buffer)]

# ==============================================================================
# CLI EXECUTION UTILITY
# ==============================================================================
async def main():
    print("==================================================")
    print(" JeevaSwara ESP32 BLE Bridge CLI Client")
    print("==================================================")

    def print_frame(frame: TelemetryFrame):
        if frame.sequence % 25 == 0:
            print(f"[# {frame.sequence:05d} | {frame.timestamp_ms:07d} ms] "
                  f"Piezo: {frame.piezo_voltage:+.3f} V | "
                  f"Accel: ({frame.ax:+.2f}, {frame.ay:+.2f}, {frame.az:+.2f}) g "
                  f"| Mag: {frame.accel_magnitude:.3f} g | "
                  f"Bat: {frame.battery_pct:.0f}% ({frame.battery_mv} mV)")

    bridge = JeevaSwaraBleBridge(
        on_frame_callback=print_frame,
        on_status_callback=lambda s: print(f">>> Device State: {s}")
    )

    connected = await bridge.connect()
    if not connected:
        print("Exiting: Device not found or failed connection.")
        return

    try:
        print("\nRequesting hardware self-test (CALIBRATE)...")
        await bridge.calibrate()
        await asyncio.sleep(1.5)

        print("\nStarting continuous sensor stream (START)...")
        await bridge.start_recording()

        # Stream for 15 seconds
        await asyncio.sleep(15.0)

        print("\nStopping sensor stream (STOP)...")
        await bridge.stop_recording()
        await asyncio.sleep(1.0)

        print(f"\nStream Completed. Total frames: {bridge.total_packets_received}, "
              f"Lost: {bridge.total_packets_lost} ({bridge.packet_loss_rate}% loss rate)")

    except KeyboardInterrupt:
        print("\nInterrupted by user.")
    finally:
        await bridge.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
