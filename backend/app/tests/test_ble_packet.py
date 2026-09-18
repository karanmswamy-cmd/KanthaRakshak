import sys
import struct
import pytest
from pathlib import Path

# Add workspace root to sys.path so firmware.python_bridge is importable
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))


from firmware.python_bridge.ble_bridge import (
    decode_binary_packet,
    TelemetryFrame,
    JeevaSwaraBleBridge,
    PACKET_STRUCT_FORMAT,
    PACKET_MAGIC_BYTE,
    PACKET_TOTAL_BYTES
)


def build_raw_packet(
    magic=PACKET_MAGIC_BYTE,
    seq=1,
    timestamp_ms=1000,
    piezo_adc=2048,
    ax=0,
    ay=0,
    az=16384, # 1.0g
    gx=0,
    gy=0,
    gz=0,
    battery_mv=3850,
    corrupt_checksum=False
) -> bytes:
    """Helper to pack a binary 24-byte packet with XOR checksum."""
    body = struct.pack(
        "<BHIHhhhhhhH",
        magic,
        seq,
        timestamp_ms,
        piezo_adc,
        ax,
        ay,
        az,
        gx,
        gy,
        gz,
        battery_mv
    )
    checksum = 0
    for b in body:
        checksum ^= b
    if corrupt_checksum:
        checksum ^= 0xFF

    return body + struct.pack("<B", checksum)

def test_decode_valid_packet():
    raw = build_raw_packet(seq=42, timestamp_ms=2500, piezo_adc=2048, az=16384, battery_mv=3750)
    assert len(raw) == PACKET_TOTAL_BYTES

    frame = decode_binary_packet(raw)
    assert frame is not None
    assert frame.sequence == 42
    assert frame.timestamp_ms == 2500
    assert abs(frame.piezo_voltage - 0.0) < 0.001 # 2048 ADC is 0.0V offset
    assert abs(frame.az - 1.0) < 0.001 # 16384 LSB is 1.0g
    assert abs(frame.accel_magnitude - 1.0) < 0.001
    assert frame.battery_mv == 3750
    assert frame.battery_pct > 0.0

def test_corrupt_checksum_rejection():
    raw = build_raw_packet(seq=10, corrupt_checksum=True)
    frame = decode_binary_packet(raw)
    assert frame is None # Rejected due to bad checksum

def test_corrupt_magic_byte_rejection():
    raw = build_raw_packet(magic=0x55) # Invalid magic
    frame = decode_binary_packet(raw)
    assert frame is None

def test_malformed_length_rejection():
    raw = b"\xAA\x01\x02\x03" # Truncated
    frame = decode_binary_packet(raw)
    assert frame is None

def test_sequence_loss_calculation():
    bridge = JeevaSwaraBleBridge(ring_buffer_capacity=10)

    # Simulate receiving packet 1, 2, 3
    for s in [1, 2, 3]:
        pkt = build_raw_packet(seq=s)
        bridge._handle_sensor_notification(None, bytearray(pkt))

    assert bridge.total_packets_received == 3
    assert bridge.total_packets_lost == 0
    assert bridge.packet_loss_rate == 0.0

    # Simulate dropped packets (jump from 3 to 7 -> lost 4, 5, 6 = 3 packets)
    pkt_jump = build_raw_packet(seq=7)
    bridge._handle_sensor_notification(None, bytearray(pkt_jump))

    assert bridge.total_packets_received == 4
    assert bridge.total_packets_lost == 3
    # 3 lost out of 7 total = 42.86%
    assert bridge.packet_loss_rate == 42.86

def test_ring_buffer_bounded_capacity():
    bridge = JeevaSwaraBleBridge(ring_buffer_capacity=5)
    for i in range(15):
        pkt = build_raw_packet(seq=i, timestamp_ms=i * 20)
        bridge._handle_sensor_notification(None, bytearray(pkt))

    samples = bridge.get_buffered_session_samples()
    assert len(samples) == 5
    # Should contain latest 5 items (seq 10 to 14)
    assert samples[0]["sequence"] == 10
    assert samples[-1]["sequence"] == 14
