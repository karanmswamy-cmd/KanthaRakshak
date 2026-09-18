from typing import Optional, Literal
from pydantic import BaseModel

class SensorSample(BaseModel):
    timestamp: float # relative ms
    piezo: float     # normalized -1.0 to 1.0 or voltage
    ax: float        # g
    ay: float        # g
    az: float        # g
    gx: float = 0.0  # deg/s
    gy: float = 0.0  # deg/s
    gz: float = 0.0  # deg/s
    accel_magnitude: float # resultant sqrt(ax^2 + ay^2 + az^2)

class QualityPacket(BaseModel):
    type: Literal["quality"] = "quality"
    signal_quality: Literal["GOOD", "FAIR", "POOR"]
    noise_level: Literal["LOW", "MEDIUM", "HIGH"]
    motion_baseline: Literal["STABLE", "MOVEMENT_DETECTED"]
    piezo_snr_db: Optional[float] = None

class SwallowEventPacket(BaseModel):
    type: Literal["swallow_event"] = "swallow_event"
    detected: bool
    timestamp: Optional[float] = None
    duration_ms: Optional[float] = None
    confidence: Optional[float] = None

class DeviceStatus(BaseModel):
    esp32_id: str
    ble_connected: bool
    ble_device_name: str
    firmware_version: str
    battery_percentage: int
    is_charging: bool
    packet_rate_hz: int
    last_packet_timestamp: Optional[str]
    piezo_adc_state: str
    mpu6050_state: str
    overall_status: str
